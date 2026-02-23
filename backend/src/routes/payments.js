import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { isValidUUID, validateRequired } from '../utils/validation.js';
import { checkBusinessPermission } from '../utils/permissions.js';
import pool from '../config/database.js';
import pesapalService from '../services/pesapal.js';
import { generateReceipt } from '../services/receipt.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper: Calculate pricing
async function calculatePricing(items) {
  const pricingResult = await pool.query(
    `SELECT value FROM system_config WHERE key = 'service_pricing'`
  );
  const pricing = pricingResult.rows[0]?.value || {
    website_hosting: 200,
    ads: 200,
    search_promotion: 150,
    image_gallery: 100,
  };

  const vatRateResult = await pool.query(
    `SELECT value FROM system_config WHERE key = 'vat_rate'`
  );
  const vatRate = parseFloat(vatRateResult.rows[0]?.value || '0.16');

  let subtotal = 0;
  const itemsWithPricing = items.map((item) => {
    const pricePerMonth = pricing[item.service_type] || 200;
    const itemTotal = pricePerMonth * item.months;
    subtotal += itemTotal;

    return {
      ...item,
      price_per_month: pricePerMonth,
      total: itemTotal,
    };
  });

  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  return {
    items: itemsWithPricing,
    subtotal,
    vat_amount: vatAmount,
    total_amount: total,
  };
}

// POST /api/payments/initiate - Initiate payment
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

    // Validate items
    const validServiceTypes = ['website_hosting', 'ads', 'search_promotion', 'image_gallery'];
    for (const item of items) {
      if (!item.service_type || !validServiceTypes.includes(item.service_type)) {
        return res.status(400).json(error(`Invalid service type: ${item.service_type}`, 'INVALID_SERVICE_TYPE'));
      }
      if (!item.months || item.months < 1) {
        return res.status(400).json(error('Months must be at least 1', 'INVALID_MONTHS'));
      }
    }

    // Check permission (owner only can make payments)
    const { hasPermission, role } = await checkBusinessPermission(req.user.userId, business_id, 'owner');
    if (!hasPermission || role !== 'owner') {
      return res.status(403).json(error('Only business owners can make payments', 'FORBIDDEN'));
    }

    // Get user details
    const userResult = await pool.query(
      `SELECT full_name, phone, email FROM users WHERE user_id = $1`,
      [req.user.userId]
    );
    const user = userResult.rows[0];

    // Calculate pricing
    const pricing = await calculatePricing(items);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create transaction record
      const merchantReference = `TAFUTA-${Date.now()}-${business_id.substring(0, 8)}`;
      
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          business_id, user_id, pesapal_merchant_reference, 
          amount, vat_amount, total_amount, items, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING transaction_id, pesapal_merchant_reference, total_amount`,
        [
          business_id,
          req.user.userId,
          merchantReference,
          pricing.subtotal,
          pricing.vat_amount,
          pricing.total_amount,
          JSON.stringify(pricing.items),
        ]
      );

      const transaction = transactionResult.rows[0];

      // Submit order to PesaPal
      const orderData = {
        merchant_reference: transaction.pesapal_merchant_reference,
        amount: transaction.total_amount,
        currency: 'KES',
        description: `Tafuta services payment - ${items.map(i => i.service_type).join(', ')}`,
        email: user.email || `${user.phone}@tafuta.ke`,
        phone: user.phone,
        first_name: user.full_name.split(' ')[0],
        last_name: user.full_name.split(' ').slice(1).join(' '),
      };

      const pesapalResponse = await pesapalService.submitOrder(orderData);

      // Update transaction with PesaPal tracking ID
      await client.query(
        `UPDATE transactions 
         SET pesapal_tracking_id = $1, updated_at = NOW()
         WHERE transaction_id = $2`,
        [pesapalResponse.order_tracking_id, transaction.transaction_id]
      );

      await client.query('COMMIT');

      logger.info('Payment initiated', {
        transactionId: transaction.transaction_id,
        businessId: business_id,
        amount: transaction.total_amount,
      });

      res.status(201).json(success({
        transaction_id: transaction.transaction_id,
        merchant_reference: transaction.pesapal_merchant_reference,
        amount: transaction.total_amount,
        redirect_url: pesapalResponse.redirect_url,
        order_tracking_id: pesapalResponse.order_tracking_id,
      }, 'Payment initiated successfully'));

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

// GET /api/payments/callback - PesaPal callback
router.get('/callback', async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query;

    if (!OrderTrackingId) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed`);
    }

    // Get transaction status from PesaPal
    const status = await pesapalService.getTransactionStatus(OrderTrackingId);

    // Update transaction
    await pool.query(
      `UPDATE transactions 
       SET status = $1, 
           payment_method = $2,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE pesapal_tracking_id = $3`,
      [
        status.payment_status_description === 'Completed' ? 'completed' : 'failed',
        status.payment_method,
        OrderTrackingId,
      ]
    );

    if (status.payment_status_description === 'Completed') {
      // Process successful payment - update subscriptions
      const transactionResult = await pool.query(
        `SELECT business_id, items FROM transactions WHERE pesapal_tracking_id = $1`,
        [OrderTrackingId]
      );

      if (transactionResult.rows.length > 0) {
        const { business_id, items } = transactionResult.rows[0];

        for (const item of items) {
          await pool.query(
            `INSERT INTO service_subscriptions (business_id, service_type, months_paid, expiration_date, status)
             VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '1 month' * $3, 'active')
             ON CONFLICT (business_id, service_type)
             DO UPDATE SET 
               months_paid = service_subscriptions.months_paid + $3,
               expiration_date = CASE 
                 WHEN service_subscriptions.expiration_date > CURRENT_DATE 
                 THEN service_subscriptions.expiration_date + INTERVAL '1 month' * $3
                 ELSE CURRENT_DATE + INTERVAL '1 month' * $3
               END,
               status = 'active',
               updated_at = NOW()`,
            [business_id, item.service_type, item.months]
          );
        }

        logger.info('Payment completed and subscriptions updated', {
          businessId: business_id,
          trackingId: OrderTrackingId,
        });
      }

      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?ref=${OrderMerchantReference}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?ref=${OrderMerchantReference}`);
    }

  } catch (err) {
    logger.error('Payment callback error', { error: err.message });
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed`);
  }
});

// POST /api/payments/webhook - PesaPal IPN webhook
router.post('/webhook', async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;

    logger.info('PesaPal IPN received', { OrderTrackingId, OrderMerchantReference, OrderNotificationType });

    if (!OrderTrackingId) {
      return res.status(400).json(error('Missing OrderTrackingId', 'INVALID_REQUEST'));
    }

    // Get transaction status from PesaPal
    const status = await pesapalService.getTransactionStatus(OrderTrackingId);

    // Update transaction
    await pool.query(
      `UPDATE transactions 
       SET status = $1, 
           payment_method = $2,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE pesapal_tracking_id = $3`,
      [
        status.payment_status_description === 'Completed' ? 'completed' : 'failed',
        status.payment_method,
        OrderTrackingId,
      ]
    );

    res.json(success({ message: 'Webhook processed' }));

  } catch (err) {
    logger.error('Webhook processing error', { error: err.message });
    res.status(500).json(error('Webhook processing failed', 'WEBHOOK_ERROR'));
  }
});

// GET /api/payments/transactions/:id - Get transaction details
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

    const transaction = result.rows[0];

    // Check permission
    if (transaction.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view this transaction', 'FORBIDDEN'));
    }

    res.json(success(transaction));

  } catch (err) {
    next(err);
  }
});

// GET /api/payments/receipts/:id - Get receipt PDF
router.get('/receipts/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json(error('Invalid transaction ID', 'INVALID_ID'));
    }

    // Check transaction exists and user has permission
    const transactionResult = await pool.query(
      `SELECT user_id, status, business_id FROM transactions WHERE transaction_id = $1`,
      [id]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json(error('Transaction not found', 'NOT_FOUND'));
    }

    const transaction = transactionResult.rows[0];

    if (transaction.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view this receipt', 'FORBIDDEN'));
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json(error('Receipt only available for completed transactions', 'TRANSACTION_NOT_COMPLETED'));
    }

    // Generate PDF receipt
    const pdfBuffer = await generateReceipt(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${id}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    next(err);
  }
});

// GET /api/payments/business/:businessId - Get business transactions
router.get('/business/:businessId', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!isValidUUID(businessId)) {
      return res.status(400).json(error('Invalid business ID', 'INVALID_ID'));
    }

    // Check permission
    const { hasPermission } = await checkBusinessPermission(req.user.userId, businessId);
    if (!hasPermission && !req.user.isAdmin) {
      return res.status(403).json(error('You do not have permission to view these transactions', 'FORBIDDEN'));
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    const result = await pool.query(
      `SELECT transaction_id, amount, vat_amount, total_amount, status, items, created_at, completed_at
       FROM transactions
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limitNum, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transactions WHERE business_id = $1`,
      [businessId]
    );

    res.json(success({
      transactions: result.rows,
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

export default router;
