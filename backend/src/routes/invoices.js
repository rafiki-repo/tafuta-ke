import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { success, error, paginated } from '../utils/response.js';
import { isValidUUID } from '../utils/validation.js';
import pool from '../config/database.js';
import { generateInvoicePdf } from '../services/invoice.js';
import pesapalService from '../services/pesapal.js';
import logger from '../utils/logger.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

async function buildItemsFromSubscriptions(businessId) {
  const [subResult, typesRow, vatRow] = await Promise.all([
    pool.query(
      `SELECT service_type, months_paid, expiration_date, status
       FROM service_subscriptions
       WHERE business_id = $1 AND status = 'active'
         AND billing_type != 'one_time'
         AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)`,
      [businessId]
    ).catch(() =>
      // billing_type column may not exist in old rows — fall back without it
      pool.query(
        `SELECT service_type, months_paid, expiration_date, status
         FROM service_subscriptions
         WHERE business_id = $1 AND status = 'active'
           AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)`,
        [businessId]
      )
    ),
    pool.query(`SELECT value FROM system_config WHERE key = 'service_types'`),
    pool.query(`SELECT value FROM system_config WHERE key = 'vat_rate'`),
  ]);

  const serviceTypes = Array.isArray(typesRow.rows[0]?.value) ? typesRow.rows[0].value : [];
  const vatRate = parseFloat(vatRow.rows[0]?.value || '0.16');
  const typeMap = Object.fromEntries(serviceTypes.map(t => [t.id, t]));

  const items = subResult.rows
    .filter(s => typeMap[s.service_type]?.billing_type !== 'one_time')
    .map(s => {
      const def = typeMap[s.service_type] || {};
      const label = def.label || s.service_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const price = Number(def.price ?? 0);
      const expiry = s.expiration_date ? new Date(s.expiration_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
      return {
        service_type: s.service_type,
        label,
        description: expiry ? `Renewal — expires ${expiry}` : 'Monthly subscription',
        months: 1,
        unit_price: price,
        total: price,
      };
    });

  let subtotal = items.reduce((s, i) => s + i.total, 0);
  subtotal = parseFloat(subtotal.toFixed(2));
  const vat_amount = parseFloat((subtotal * vatRate).toFixed(2));
  const total_amount = parseFloat((subtotal + vat_amount).toFixed(2));

  return { items, subtotal, vat_amount, total_amount };
}

// ── Admin routes (/api/admin/*) ────────────────────────────────────────────

const admin = express.Router();
admin.use(requireAuth, requireAdmin);

// GET /api/admin/invoices — list all invoices
admin.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, q } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];

    if (status) { conditions.push(`i.status = $${params.push(status)}`); }
    if (q) { conditions.push(`LOWER(b.business_name) LIKE $${params.push('%' + q.toLowerCase() + '%')}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT i.invoice_id, i.invoice_number, i.status, i.issue_date, i.due_date,
                i.subtotal, i.vat_amount, i.total_amount, i.created_at,
                b.business_name, b.business_id
         FROM invoices i
         JOIN businesses b ON i.business_id = b.business_id
         ${where}
         ORDER BY i.created_at DESC
         LIMIT $${params.push(parseInt(limit))} OFFSET $${params.push(offset)}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM invoices i JOIN businesses b ON i.business_id = b.business_id ${where}`,
        params.slice(0, conditions.length)
      ),
    ]);

    const totalCount = parseInt(count.rows[0].count);
    res.json(paginated(rows.rows, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    }));
  } catch (err) { next(err); }
});

// POST /api/admin/invoices — create invoice (auto-populate from subscriptions)
admin.post('/', async (req, res, next) => {
  try {
    const { business_id, items: customItems, due_date, notes, status: reqStatus } = req.body;
    if (!business_id || !isValidUUID(business_id)) {
      return res.status(400).json(error('business_id is required and must be a UUID', 'INVALID_INPUT'));
    }
    const initialStatus = reqStatus === 'sent' ? 'sent' : 'draft';

    // Check business exists
    const biz = await pool.query('SELECT business_id, business_name FROM businesses WHERE business_id = $1', [business_id]);
    if (!biz.rows.length) return res.status(404).json(error('Business not found', 'NOT_FOUND'));

    let { items, subtotal, vat_amount, total_amount } = customItems?.length
      ? (() => {
          const vatRate = 0.16;
          const its = customItems.map(i => ({ ...i, total: parseFloat(i.total || i.unit_price * (i.months || 1)) }));
          const sub = parseFloat(its.reduce((s, i) => s + i.total, 0).toFixed(2));
          const vat = parseFloat((sub * vatRate).toFixed(2));
          return { items: its, subtotal: sub, vat_amount: vat, total_amount: parseFloat((sub + vat).toFixed(2)) };
        })()
      : await buildItemsFromSubscriptions(business_id);

    const result = await pool.query(
      `INSERT INTO invoices (invoice_number, business_id, created_by, status, issue_date, due_date, items, subtotal, vat_amount, total_amount, notes)
       VALUES (
         'INV-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
         $1, $2, $9, CURRENT_DATE, $3, $4, $5, $6, $7, $8
       )
       RETURNING *`,
      [business_id, req.user.userId, due_date || null, JSON.stringify(items), subtotal, vat_amount, total_amount, notes || null, initialStatus]
    );

    logger.info('Invoice created', { invoiceId: result.rows[0].invoice_id, businessId: business_id, adminId: req.user.userId });
    res.status(201).json(success(result.rows[0], 'Invoice created'));
  } catch (err) { next(err); }
});

// GET /api/admin/invoices/preview/:businessId — must be before /:id to avoid swallowing the path
admin.get('/preview/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    if (!isValidUUID(businessId)) return res.status(400).json(error('Invalid business ID', 'INVALID_INPUT'));
    const data = await buildItemsFromSubscriptions(businessId);
    res.json(success(data));
  } catch (err) { next(err); }
});

// GET /api/admin/invoices/:id
admin.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*, b.business_name, b.content_json FROM invoices i
       JOIN businesses b ON i.business_id = b.business_id WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));
    res.json(success(result.rows[0]));
  } catch (err) { next(err); }
});

// PATCH /api/admin/invoices/:id — update status / notes / due_date
admin.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes, due_date } = req.body;
    const allowed = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json(error('Invalid status', 'INVALID_INPUT'));
    }
    const result = await pool.query(
      `UPDATE invoices SET
         status    = COALESCE($1, status),
         notes     = COALESCE($2, notes),
         due_date  = COALESCE($3::date, due_date),
         paid_at   = CASE WHEN $1 = 'paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END,
         updated_at = NOW()
       WHERE invoice_id = $4
       RETURNING *`,
      [status || null, notes || null, due_date || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));
    res.json(success(result.rows[0], 'Invoice updated'));
  } catch (err) { next(err); }
});

// GET /api/admin/invoices/:id/pdf — download PDF
admin.get('/:id/pdf', async (req, res, next) => {
  try {
    const check = await pool.query('SELECT invoice_number FROM invoices WHERE invoice_id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));

    const pdf = await generateInvoicePdf(req.params.id);
    const filename = `invoice-${check.rows[0].invoice_number || req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

// ── User routes (/api/payments/invoices) ──────────────────────────────────

const user = express.Router();
user.use(requireAuth);

// GET /api/payments/invoices[?business_id=] — all invoices for user's accessible businesses
user.get('/', async (req, res, next) => {
  try {
    const { business_id } = req.query;

    if (business_id) {
      // Scoped to one business
      if (!isValidUUID(business_id)) return res.status(400).json(error('Invalid business_id', 'INVALID_INPUT'));
      const access = await pool.query(
        `SELECT 1 FROM user_business_roles WHERE user_id = $1 AND business_id = $2`,
        [req.user.userId, business_id]
      );
      if (!access.rows.length) return res.status(403).json(error('Access denied', 'FORBIDDEN'));

      const result = await pool.query(
        `SELECT i.invoice_id, i.invoice_number, i.status, i.issue_date, i.due_date,
                i.subtotal, i.vat_amount, i.total_amount, i.paid_at, i.created_at,
                b.business_name, b.business_id
         FROM invoices i JOIN businesses b ON i.business_id = b.business_id
         WHERE i.business_id = $1 ORDER BY i.created_at DESC`,
        [business_id]
      );
      return res.json(success(result.rows));
    }

    // All businesses the user has a role in
    const result = await pool.query(
      `SELECT i.invoice_id, i.invoice_number, i.status, i.issue_date, i.due_date,
              i.subtotal, i.vat_amount, i.total_amount, i.paid_at, i.created_at,
              b.business_name, b.business_id
       FROM invoices i
       JOIN businesses b ON i.business_id = b.business_id
       JOIN user_business_roles ubr ON ubr.business_id = b.business_id
         AND ubr.user_id = $1 AND ubr.is_deleted = false
       ORDER BY i.created_at DESC`,
      [req.user.userId]
    );
    res.json(success(result.rows));
  } catch (err) { next(err); }
});

// GET /api/payments/invoices/:id — single invoice with items
user.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*, b.business_name, b.business_id
       FROM invoices i JOIN businesses b ON i.business_id = b.business_id
       WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));
    const invoice = result.rows[0];

    const access = await pool.query(
      `SELECT 1 FROM user_business_roles WHERE user_id = $1 AND business_id = $2`,
      [req.user.userId, invoice.business_id]
    );
    if (!access.rows.length) return res.status(403).json(error('Access denied', 'FORBIDDEN'));

    res.json(success(invoice));
  } catch (err) { next(err); }
});

// POST /api/payments/invoices/:id/pay — initiate PesaPal payment for an invoice
user.post('/:id/pay', async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.*, b.business_name FROM invoices i
       JOIN businesses b ON i.business_id = b.business_id WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!inv.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));
    const invoice = inv.rows[0];

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json(error(`Invoice is already ${invoice.status}`, 'INVALID_STATUS'));
    }

    // Check user has access to this business
    const access = await pool.query(
      `SELECT 1 FROM user_business_roles WHERE user_id = $1 AND business_id = $2`,
      [req.user.userId, invoice.business_id]
    );
    if (!access.rows.length) return res.status(403).json(error('Access denied', 'FORBIDDEN'));

    const userRow = await pool.query(
      `SELECT full_name, phone, email FROM users WHERE user_id = $1`, [req.user.userId]
    );
    const user = userRow.rows[0];

    const merchantReference = `TAFUTA-INV-${Date.now()}-${invoice.invoice_id.substring(0, 8)}`;

    // Build transaction items from invoice lines — processCompletedPayment will extend subscriptions
    const txItems = (Array.isArray(invoice.items) ? invoice.items : []).map(i => ({
      service_type: i.service_type,
      months: i.months || 1,
      price: i.unit_price,
      total: i.total,
    }));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txResult = await client.query(
        `INSERT INTO transactions
           (business_id, user_id, pesapal_merchant_reference, amount, vat_amount, total_amount, items, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
         RETURNING transaction_id, pesapal_merchant_reference, total_amount`,
        [invoice.business_id, req.user.userId, merchantReference,
         invoice.subtotal, invoice.vat_amount, invoice.total_amount,
         JSON.stringify(txItems)]
      );
      const tx = txResult.rows[0];

      // Pre-link the invoice so processCompletedPayment can mark it paid
      await client.query(
        `UPDATE invoices SET transaction_id = $1, updated_at = NOW() WHERE invoice_id = $2`,
        [tx.transaction_id, invoice.invoice_id]
      );

      const pesapalResponse = await pesapalService.submitOrder({
        merchant_reference: merchantReference,
        amount: tx.total_amount,
        currency: 'KES',
        description: `Tafuta invoice ${invoice.invoice_number || invoice.invoice_id}`,
        email: user.email || `${user.phone}@tafuta.ke`,
        phone: user.phone,
        first_name: user.full_name.split(' ')[0],
        last_name: user.full_name.split(' ').slice(1).join(' ') || '',
      });

      await client.query(
        `UPDATE transactions SET pesapal_tracking_id = $1, updated_at = NOW() WHERE transaction_id = $2`,
        [pesapalResponse.order_tracking_id, tx.transaction_id]
      );

      await client.query('COMMIT');

      logger.info('Invoice payment initiated', { invoiceId: invoice.invoice_id, transactionId: tx.transaction_id });
      res.status(201).json(success({
        transaction_id: tx.transaction_id,
        redirect_url: pesapalResponse.redirect_url,
        order_tracking_id: pesapalResponse.order_tracking_id,
        amount: tx.total_amount,
      }, 'Payment initiated'));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// GET /api/payments/invoices/:id/pdf
user.get('/:id/pdf', async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.invoice_id, i.invoice_number, i.business_id FROM invoices i WHERE i.invoice_id = $1`,
      [req.params.id]
    );
    if (!inv.rows.length) return res.status(404).json(error('Invoice not found', 'NOT_FOUND'));

    // Check access
    const access = await pool.query(
      `SELECT 1 FROM user_business_roles WHERE user_id = $1 AND business_id = $2`,
      [req.user.userId, inv.rows[0].business_id]
    );
    if (!access.rows.length) return res.status(403).json(error('Access denied', 'FORBIDDEN'));

    const pdf = await generateInvoicePdf(req.params.id);
    const filename = `invoice-${inv.rows[0].invoice_number || req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

export { admin as adminInvoiceRoutes, user as userInvoiceRoutes };
