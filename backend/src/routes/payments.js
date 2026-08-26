import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { isValidUUID, validateRequired } from '../utils/validation.js';
import { checkBusinessPermission } from '../utils/permissions.js';
import pool from '../config/database.js';
import pesapalService from '../services/pesapal.js';
import { generateReceipt } from '../services/receipt.js';
import logger from '../utils/logger.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Helpers ────────────────────────────────────────────────────────────────

async function getServiceTypeDefs() {
  const [typesRow, vatRow] = await Promise.all([
    pool.query(`SELECT value FROM system_config WHERE key = 'service_types'`),
    pool.query(`SELECT value FROM system_config WHERE key = 'vat_rate'`),
  ]);
  const types = Array.isArray(typesRow.rows[0]?.value) ? typesRow.rows[0].value : [];
  return {
    serviceTypes: types,
    vatRate: parseFloat(vatRow.rows[0]?.value || '0.16'),
  };
}

async function calculateOrder(items, serviceTypes, vatRate) {
  const typeMap = Object.fromEntries(serviceTypes.map(t => [t.id, t]));
  let subtotal = 0;
  const itemsWithPricing = items.map((item) => {
    const def = typeMap[item.service_type] || {};
    const price = Number(def.price ?? def.price_per_month ?? 200);
    const isOneTime = def.billing_type === 'one_time';
    const months = isOneTime ? 1 : (item.months || 1);
    const total = isOneTime ? price : price * months;
    subtotal += total;
    return { ...item, months, price, total };
  });

  const vatAmount = parseFloat((subtotal * vatRate).toFixed(2));
  return {
    items: itemsWithPricing,
    subtotal: parseFloat(subtotal.toFixed(2)),
    vat_amount: vatAmount,
    total_amount: parseFloat((subtotal + vatAmount).toFixed(2)),
    vat_rate: vatRate,
  };
}

// Shared idempotent payment processor called by both webhook and callback.
// Uses WHERE status != 'completed' as the idempotency guard — if two calls
// race, only one UPDATE wins rows; the other exits cleanly without touching
// subscriptions.
async function processCompletedPayment(trackingId, paymentMethod) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE transactions
       SET status        = 'completed',
           payment_method = $1,
           completed_at  = NOW(),
           updated_at    = NOW(),
           receipt_number = 'TFT-' || EXTRACT(YEAR FROM NOW())::text
                         || '-' || LPAD(nextval('receipt_number_seq')::text, 5, '0')
       WHERE pesapal_tracking_id = $2
         AND status != 'completed'
       RETURNING transaction_id, business_id, items, user_id, receipt_number`,
      [paymentMethod || 'PesaPal', trackingId]
    );

    // 0 rows → already processed or tracking ID unknown; safe to return
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const tx = result.rows[0];

    // Fetch service type definitions to determine billing_type per item
    const typesRow = await client.query(`SELECT value FROM system_config WHERE key = 'service_types'`);
    const typeMap = Object.fromEntries(
      (Array.isArray(typesRow.rows[0]?.value) ? typesRow.rows[0].value : []).map(t => [t.id, t])
    );

    for (const item of tx.items) {
      const isOneTime = typeMap[item.service_type]?.billing_type === 'one_time';
      if (isOneTime) {
        await client.query(
          `INSERT INTO service_subscriptions (business_id, service_type, months_paid, expiration_date, status)
           VALUES ($1, $2, 1, NULL, 'active')
           ON CONFLICT (business_id, service_type) DO UPDATE SET
             status = 'active', updated_at = NOW()`,
          [tx.business_id, item.service_type]
        );
      } else {
        await client.query(
          `INSERT INTO service_subscriptions
             (business_id, service_type, months_paid, expiration_date, status)
           VALUES ($1, $2, $3::int, CURRENT_DATE + ($3::int * INTERVAL '1 month'), 'active')
           ON CONFLICT (business_id, service_type) DO UPDATE SET
             months_paid     = service_subscriptions.months_paid + $3::int,
             expiration_date = CASE
               WHEN service_subscriptions.expiration_date > CURRENT_DATE
               THEN service_subscriptions.expiration_date + ($3::int * INTERVAL '1 month')
               ELSE CURRENT_DATE + ($3::int * INTERVAL '1 month')
             END,
             status     = 'active',
             updated_at = NOW()`,
          [tx.business_id, item.service_type, item.months]
        );
      }
    }

    // Mark any linked invoice as paid
    await client.query(
      `UPDATE invoices
       SET status = 'paid', paid_at = NOW(), transaction_id = $1, updated_at = NOW()
       WHERE transaction_id = $1 AND status != 'paid'`,
      [tx.transaction_id]
    );

    await client.query('COMMIT');
    logger.info('Payment completed', {
      transactionId: tx.transaction_id,
      receiptNumber: tx.receipt_number,
      businessId: tx.business_id,
    });
    return tx;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Public ─────────────────────────────────────────────────────────────────

// GET /api/payments/pricing
router.get('/pricing', async (_req, res, next) => {
  try {
    const { serviceTypes, vatRate } = await getServiceTypeDefs();
    // Return both the full service type list and a legacy pricing map for backward compatibility
    const pricing = Object.fromEntries(
      serviceTypes.map(t => [t.id, Number(t.price ?? t.price_per_month ?? 0)])
    );
    res.json(success({ service_types: serviceTypes, pricing, vat_rate: vatRate }));
  } catch (err) {
    next(err);
  }
});

// ── Auth required ──────────────────────────────────────────────────────────

// GET /api/payments/subscriptions/:businessId
router.get('/subscriptions/:businessId', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    if (!isValidUUID(businessId)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const { hasPermission } = await checkBusinessPermission(req.user.userId, businessId);
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('Forbidden', 'FORBIDDEN'));
    }

    const result = await pool.query(
      `SELECT subscription_id, service_type, months_paid, expiration_date, status, updated_at
       FROM service_subscriptions
       WHERE business_id = $1
       ORDER BY service_type`,
      [businessId]
    );

    res.json(success(result.rows));
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/initiate
router.post('/initiate', requireAuth, async (req, res, next) => {
  try {
    const { business_id, items } = req.body;

    const missing = validateRequired(['business_id', 'items'], req.body);
    if (missing.length > 0) {
      return res.status(400).json(error(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }
    if (!isValidUUID(business_id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(error('Items must be a non-empty array', 'INVALID_ITEMS'));
    }
    const { serviceTypes, vatRate } = await getServiceTypeDefs();
    const typeMap = Object.fromEntries(serviceTypes.map(t => [t.id, t]));

    for (const item of items) {
      const def = typeMap[item.service_type];
      if (!item.service_type || !def) {
        return res.status(400).json(error(`Invalid service type: ${item.service_type}`, 'INVALID_SERVICE_TYPE'));
      }
      if (!def.enabled) {
        return res.status(400).json(error(`Service not available: ${item.service_type}`, 'SERVICE_UNAVAILABLE'));
      }
      if (def.billing_type !== 'one_time') {
        const months = parseInt(item.months, 10);
        if (!months || months < 1 || months > 12) {
          return res.status(400).json(error('Months must be between 1 and 12', 'INVALID_MONTHS'));
        }
        item.months = months;
      } else {
        item.months = 1;
      }
    }

    const { hasPermission, role } = await checkBusinessPermission(req.user.userId, business_id, 'owner');
    if (!hasPermission || role !== 'owner') {
      return res.status(403).json(error('Only business owners can make payments', 'FORBIDDEN'));
    }

    const [userResult, orderCalc] = await Promise.all([
      pool.query(`SELECT full_name, phone, email FROM users WHERE user_id = $1`, [req.user.userId]),
      calculateOrder(items, serviceTypes, vatRate),
    ]);
    const user = userResult.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const merchantReference = `TAFUTA-${Date.now()}-${business_id.substring(0, 8)}`;

      const txResult = await client.query(
        `INSERT INTO transactions
           (business_id, user_id, pesapal_merchant_reference,
            amount, vat_amount, total_amount, items, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
         RETURNING transaction_id, pesapal_merchant_reference, total_amount`,
        [
          business_id, req.user.userId, merchantReference,
          orderCalc.subtotal, orderCalc.vat_amount, orderCalc.total_amount,
          JSON.stringify(orderCalc.items),
        ]
      );

      const tx = txResult.rows[0];

      const pesapalResponse = await pesapalService.submitOrder({
        merchant_reference: tx.pesapal_merchant_reference,
        amount: tx.total_amount,
        currency: 'KES',
        description: `Tafuta services: ${items.map(i => i.service_type.replace(/_/g, ' ')).join(', ')}`,
        email: user.email || `${user.phone}@tafuta.ke`,
        phone: user.phone,
        first_name: user.full_name.split(' ')[0],
        last_name: user.full_name.split(' ').slice(1).join(' ') || '',
      });

      await client.query(
        `UPDATE transactions SET pesapal_tracking_id = $1, updated_at = NOW()
         WHERE transaction_id = $2`,
        [pesapalResponse.order_tracking_id, tx.transaction_id]
      );

      await client.query('COMMIT');

      logger.info('Payment initiated', {
        transactionId: tx.transaction_id,
        businessId: business_id,
        amount: tx.total_amount,
      });

      res.status(201).json(success({
        transaction_id: tx.transaction_id,
        merchant_reference: tx.pesapal_merchant_reference,
        order_summary: orderCalc,
        redirect_url: pesapalResponse.redirect_url,
        order_tracking_id: pesapalResponse.order_tracking_id,
      }, 'Payment initiated'));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/callback  (browser redirect back from PesaPal)
router.get('/callback', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference } = req.query;

  logger.info('Payment callback received', { OrderTrackingId, OrderMerchantReference });

  if (!OrderTrackingId) {
    logger.warn('Payment callback missing OrderTrackingId');
    return res.redirect(`${FRONTEND_URL}/payment/failed`);
  }

  try {
    const status = await pesapalService.getTransactionStatus(OrderTrackingId);

    // Log the full response so we can see exactly what PesaPal returned
    logger.info('PesaPal status response', {
      OrderTrackingId,
      payment_status_description: status.payment_status_description,
      payment_status_code: status.payment_status_code,
      status_code: status.status_code,
      payment_method: status.payment_method,
      amount: status.amount,
      error: status.error,
    });

    const isCompleted =
      status.payment_status_description?.toLowerCase() === 'completed' ||
      status.payment_status_code === '1' ||
      status.status_code === 1;

    if (isCompleted) {
      const tx = await processCompletedPayment(OrderTrackingId, status.payment_method);
      // If the payment was for an invoice, redirect straight to the invoice detail page
      if (tx) {
        const invRow = await pool.query(
          `SELECT invoice_id FROM invoices WHERE transaction_id = $1 LIMIT 1`,
          [tx.transaction_id]
        );
        if (invRow.rows.length > 0) {
          return res.redirect(`${FRONTEND_URL}/dashboard/invoices/${invRow.rows[0].invoice_id}?paid=1`);
        }
      }
      return res.redirect(`${FRONTEND_URL}/payment/success?ref=${OrderMerchantReference}`);
    }

    logger.warn('Payment not completed at callback', {
      OrderTrackingId,
      payment_status_description: status.payment_status_description,
    });

    await pool.query(
      `UPDATE transactions
       SET status = 'failed', updated_at = NOW()
       WHERE pesapal_tracking_id = $1 AND status = 'pending'`,
      [OrderTrackingId]
    );
    return res.redirect(`${FRONTEND_URL}/payment/failed?ref=${OrderMerchantReference}`);
  } catch (err) {
    logger.error('Payment callback error', { OrderTrackingId, error: err.message, stack: err.stack });
    return res.redirect(`${FRONTEND_URL}/payment/failed`);
  }
});

// POST /api/payments/webhook  (PesaPal IPN — server-to-server, authoritative)
router.post('/webhook', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;

  logger.info('PesaPal IPN received', { OrderTrackingId, OrderMerchantReference, OrderNotificationType });

  if (!OrderTrackingId) {
    return res.status(400).json(error('Missing OrderTrackingId', 'INVALID_REQUEST'));
  }

  try {
    const status = await pesapalService.getTransactionStatus(OrderTrackingId);

    logger.info('PesaPal IPN status response', {
      OrderTrackingId,
      payment_status_description: status.payment_status_description,
      payment_status_code: status.payment_status_code,
      status_code: status.status_code,
      payment_method: status.payment_method,
    });

    const isCompleted =
      status.payment_status_description?.toLowerCase() === 'completed' ||
      status.payment_status_code === '1' ||
      status.status_code === 1;

    if (isCompleted) {
      await processCompletedPayment(OrderTrackingId, status.payment_method);
    } else {
      await pool.query(
        `UPDATE transactions
         SET status = 'failed', updated_at = NOW()
         WHERE pesapal_tracking_id = $1 AND status = 'pending'`,
        [OrderTrackingId]
      );
    }

    res.json(success({ message: 'IPN processed' }));
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message });
    res.status(500).json(error('Webhook processing failed', 'WEBHOOK_ERROR'));
  }
});

// GET /api/payments/transactions/:id
router.get('/transactions/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid transaction ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT t.*, b.business_name
       FROM transactions t
       JOIN businesses b ON t.business_id = b.business_id
       WHERE t.transaction_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Transaction not found', 'NOT_FOUND'));
    }

    const tx = result.rows[0];
    if (tx.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json(error('Forbidden', 'FORBIDDEN'));
    }

    res.json(success(tx));
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/receipts/:id  — download PDF
router.get('/receipts/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid transaction ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT user_id, status, receipt_number FROM transactions WHERE transaction_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(error('Transaction not found', 'NOT_FOUND'));
    }
    const tx = result.rows[0];
    if (tx.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json(error('Forbidden', 'FORBIDDEN'));
    }
    if (tx.status !== 'completed') {
      return res.status(400).json(error('Receipt only available for completed transactions', 'NOT_COMPLETED'));
    }

    const pdfBuffer = await generateReceipt(id);
    const filename = tx.receipt_number ? `receipt-${tx.receipt_number}.pdf` : `receipt-${id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/business/:businessId  — paginated transaction list
router.get('/business/:businessId', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidUUID(businessId)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    const { hasPermission } = await checkBusinessPermission(req.user.userId, businessId);
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('Forbidden', 'FORBIDDEN'));
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT transaction_id, receipt_number, amount, vat_amount, total_amount,
                status, payment_method, items, created_at, completed_at
         FROM transactions
         WHERE business_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [businessId, limitNum, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM transactions WHERE business_id = $1`, [businessId]),
    ]);

    res.json(success({
      transactions: rows.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: limitNum,
        total: parseInt(count.rows[0].total, 10),
      },
    }));
  } catch (err) {
    next(err);
  }
});

// ── Admin refund routes ────────────────────────────────────────────────────

// GET /api/payments/refunds  — list all refunds (admin)
router.get('/refunds', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const conditions = status ? [`r.status = $3`] : [];
    const params = status ? [limitNum, offset, status] : [limitNum, offset];

    const result = await pool.query(
      `SELECT r.*, b.business_name, u.full_name as requester_name, u.phone as requester_phone
       FROM refunds r
       JOIN businesses b ON r.business_id = b.business_id
       JOIN users u ON r.requested_by = u.user_id
       ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM refunds r
       ${status ? 'WHERE r.status = $1' : ''}`,
      status ? [status] : []
    );

    res.json(success({
      refunds: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: limitNum,
        total: parseInt(countResult.rows[0].total, 10),
      },
    }));
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/refunds  — create refund request (admin only, in-person)
router.post('/refunds', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { business_id, transaction_id, items, reason } = req.body;

    const missing = validateRequired(['business_id', 'items'], req.body);
    if (missing.length > 0) {
      return res.status(400).json(error(`Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }
    if (!isValidUUID(business_id)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(error('Items must be a non-empty array', 'INVALID_ITEMS'));
    }

    // Validate each refund item against current subscription
    const { pricing, vatRate } = await getPricing();
    let refundAmount = 0;

    for (const item of items) {
      if (!VALID_SERVICE_TYPES.includes(item.service_type)) {
        return res.status(400).json(error(`Invalid service type: ${item.service_type}`, 'INVALID_SERVICE_TYPE'));
      }
      const months = parseInt(item.months_to_refund, 10);
      if (!months || months < 1) {
        return res.status(400).json(error('months_to_refund must be at least 1', 'INVALID_MONTHS'));
      }
      item.months_to_refund = months;

      const sub = await pool.query(
        `SELECT months_paid, expiration_date FROM service_subscriptions
         WHERE business_id = $1 AND service_type = $2 AND status = 'active'`,
        [business_id, item.service_type]
      );
      if (sub.rows.length === 0) {
        return res.status(400).json(error(`No active subscription for ${item.service_type}`, 'NO_SUBSCRIPTION'));
      }

      const pricePerMonth = pricing[item.service_type] || 200;
      item.amount_per_month = pricePerMonth;
      item.subtotal = pricePerMonth * months;
      refundAmount += item.subtotal;
    }

    const processingFee = parseFloat((refundAmount * 0.05).toFixed(2));
    const vatReversal = parseFloat((refundAmount * vatRate).toFixed(2));
    const netRefund = parseFloat((refundAmount - processingFee).toFixed(2));

    // Find owner of the business
    const ownerResult = await pool.query(
      `SELECT user_id FROM user_business_roles
       WHERE business_id = $1 AND role = 'owner' AND is_deleted = false LIMIT 1`,
      [business_id]
    );
    if (ownerResult.rows.length === 0) {
      return res.status(400).json(error('Business owner not found', 'OWNER_NOT_FOUND'));
    }

    const result = await pool.query(
      `INSERT INTO refunds
         (business_id, transaction_id, user_id, requested_by,
          refund_amount, processing_fee, net_refund, vat_reversal, items, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
       RETURNING *`,
      [
        business_id,
        transaction_id || null,
        ownerResult.rows[0].user_id,
        req.user.userId,
        refundAmount,
        processingFee,
        netRefund,
        vatReversal,
        JSON.stringify(items),
        reason || null,
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value, reason)
       VALUES ($1, 'create_refund', 'refund', $2, $3, $4)`,
      [req.user.userId, result.rows[0].refund_id, JSON.stringify(result.rows[0]), reason || null]
    );

    res.status(201).json(success(result.rows[0], 'Refund request created'));
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/refunds/:id
router.get('/refunds/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid refund ID', 'INVALID_ID'));
    }

    const result = await pool.query(
      `SELECT r.*, b.business_name,
              u.full_name as requester_name, u.phone as requester_phone
       FROM refunds r
       JOIN businesses b ON r.business_id = b.business_id
       JOIN users u ON r.requested_by = u.user_id
       WHERE r.refund_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(error('Refund not found', 'NOT_FOUND'));
    }

    res.json(success(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/refunds/:id/approve
router.patch('/refunds/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid refund ID', 'INVALID_ID'));
    }

    const current = await pool.query(
      `SELECT * FROM refunds WHERE refund_id = $1`, [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json(error('Refund not found', 'NOT_FOUND'));
    }
    if (current.rows[0].status !== 'pending') {
      return res.status(400).json(error('Only pending refunds can be approved', 'INVALID_STATUS'));
    }

    const result = await pool.query(
      `UPDATE refunds
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE refund_id = $2
       RETURNING *`,
      [req.user.userId, id]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
       VALUES ($1, 'approve_refund', 'refund', $2, $3, $4)`,
      [req.user.userId, id, JSON.stringify(current.rows[0]), JSON.stringify(result.rows[0])]
    );

    res.json(success(result.rows[0], 'Refund approved'));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/refunds/:id/complete  — cash disbursed, deduct subscription months
router.patch('/refunds/:id/complete', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid refund ID', 'INVALID_ID'));
    }

    const current = await pool.query(
      `SELECT * FROM refunds WHERE refund_id = $1`, [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json(error('Refund not found', 'NOT_FOUND'));
    }
    if (current.rows[0].status !== 'approved') {
      return res.status(400).json(error('Only approved refunds can be completed', 'INVALID_STATUS'));
    }

    const refund = current.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deduct months from subscriptions
      for (const item of refund.items) {
        await client.query(
          `UPDATE service_subscriptions
           SET months_paid     = GREATEST(0, months_paid - $1),
               expiration_date = GREATEST(CURRENT_DATE, expiration_date - ($1::int * INTERVAL '1 month')),
               updated_at      = NOW()
           WHERE business_id = $2 AND service_type = $3`,
          [item.months_to_refund, refund.business_id, item.service_type]
        );
      }

      const result = await client.query(
        `UPDATE refunds
         SET status = 'completed', completed_by = $1, completed_at = NOW(), updated_at = NOW()
         WHERE refund_id = $2
         RETURNING *`,
        [req.user.userId, id]
      );

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
         VALUES ($1, 'complete_refund', 'refund', $2, $3, $4)`,
        [req.user.userId, id, JSON.stringify(refund), JSON.stringify(result.rows[0])]
      );

      await client.query('COMMIT');
      res.json(success(result.rows[0], 'Refund completed and months deducted'));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/refunds/:id/reject
router.patch('/refunds/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid refund ID', 'INVALID_ID'));
    }

    const current = await pool.query(`SELECT * FROM refunds WHERE refund_id = $1`, [id]);
    if (current.rows.length === 0) {
      return res.status(404).json(error('Refund not found', 'NOT_FOUND'));
    }
    if (!['pending', 'approved'].includes(current.rows[0].status)) {
      return res.status(400).json(error('Refund cannot be rejected in its current state', 'INVALID_STATUS'));
    }

    const result = await pool.query(
      `UPDATE refunds
       SET status = 'rejected', updated_at = NOW()
       WHERE refund_id = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, reason)
       VALUES ($1, 'reject_refund', 'refund', $2, $3, $4, $5)`,
      [req.user.userId, id, JSON.stringify(current.rows[0]), JSON.stringify(result.rows[0]), reason || null]
    );

    res.json(success(result.rows[0], 'Refund rejected'));
  } catch (err) {
    next(err);
  }
});

// ── Admin — all transactions ───────────────────────────────────────────────

// GET /api/payments/admin/transactions
router.get('/admin/transactions', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, business_id } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const conditions = [];
    const params = [];

    if (status) { conditions.push(`t.status = $${params.length + 1}`); params.push(status); }
    if (business_id && isValidUUID(business_id)) {
      conditions.push(`t.business_id = $${params.length + 1}`);
      params.push(business_id);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT t.transaction_id, t.receipt_number, t.amount, t.vat_amount, t.total_amount,
                t.status, t.payment_method, t.items, t.created_at, t.completed_at,
                b.business_name, u.full_name as payer_name, u.phone as payer_phone
         FROM transactions t
         JOIN businesses b ON t.business_id = b.business_id
         JOIN users u ON t.user_id = u.user_id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, limitNum, offset]
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM transactions t ${where}`,
        params
      ),
    ]);

    res.json(success({
      transactions: rows.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: limitNum,
        total: parseInt(count.rows[0].total, 10),
      },
    }));
  } catch (err) {
    next(err);
  }
});

export default router;
