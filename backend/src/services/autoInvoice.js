import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Daily job: auto-generate draft invoices for businesses with monthly
 * subscriptions expiring within the next 7 days that don't already have
 * a pending invoice for this cycle.
 */
export async function generateDueInvoices() {
  try {
    // Load service type definitions to distinguish monthly vs one-time
    const typesRow = await pool.query(`SELECT value FROM system_config WHERE key = 'service_types'`);
    const serviceTypes = Array.isArray(typesRow.rows[0]?.value) ? typesRow.rows[0].value : [];
    const vatRow = await pool.query(`SELECT value FROM system_config WHERE key = 'vat_rate'`);
    const vatRate = parseFloat(vatRow.rows[0]?.value || '0.16');
    const typeMap = Object.fromEntries(serviceTypes.map(t => [t.id, t]));

    // Businesses with at least one monthly subscription expiring in 1-7 days
    const dueRows = await pool.query(`
      SELECT DISTINCT ss.business_id, b.business_name
      FROM service_subscriptions ss
      JOIN businesses b ON ss.business_id = b.business_id
      WHERE ss.status = 'active'
        AND ss.expiration_date IS NOT NULL
        AND ss.expiration_date BETWEEN CURRENT_DATE + INTERVAL '1 day'
                                   AND CURRENT_DATE + INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.business_id = ss.business_id
            AND i.status IN ('draft', 'sent', 'overdue')
            AND i.created_at >= CURRENT_DATE - INTERVAL '14 days'
        )
    `);

    if (dueRows.rows.length === 0) {
      logger.info('Auto-invoice: no businesses due for invoicing today');
      return;
    }

    let created = 0;
    for (const biz of dueRows.rows) {
      try {
        // Load all active monthly subscriptions for this business
        const subRows = await pool.query(`
          SELECT service_type, expiration_date
          FROM service_subscriptions
          WHERE business_id = $1 AND status = 'active'
            AND expiration_date IS NOT NULL
            AND expiration_date BETWEEN CURRENT_DATE + INTERVAL '1 day'
                                    AND CURRENT_DATE + INTERVAL '7 days'
        `, [biz.business_id]);

        const items = subRows.rows
          .filter(s => typeMap[s.service_type]?.billing_type !== 'one_time')
          .map(s => {
            const def = typeMap[s.service_type] || {};
            const label = def.label || s.service_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const price = Number(def.price ?? 0);
            const expiry = new Date(s.expiration_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
            return {
              service_type: s.service_type,
              label,
              description: `Monthly renewal — expires ${expiry}`,
              months: 1,
              unit_price: price,
              total: price,
            };
          });

        if (items.length === 0) continue;

        const subtotal = parseFloat(items.reduce((s, i) => s + i.total, 0).toFixed(2));
        const vat_amount = parseFloat((subtotal * vatRate).toFixed(2));
        const total_amount = parseFloat((subtotal + vat_amount).toFixed(2));

        // Due date: 7 days from today
        const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        await pool.query(`
          INSERT INTO invoices
            (invoice_number, business_id, created_by, status, issue_date, due_date, items, subtotal, vat_amount, total_amount, notes)
          VALUES (
            'INV-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0'),
            $1, NULL, 'sent', CURRENT_DATE, $2, $3, $4, $5, $6,
            'Auto-generated renewal invoice. Please pay before the due date to avoid service interruption.'
          )
        `, [biz.business_id, dueDate, JSON.stringify(items), subtotal, vat_amount, total_amount]);

        created++;
        logger.info(`Auto-invoice: generated invoice for "${biz.business_name}"`);
      } catch (err) {
        logger.error(`Auto-invoice: failed for business ${biz.business_id}`, err);
      }
    }

    logger.info(`Auto-invoice: created ${created} invoice(s) this cycle`);
  } catch (err) {
    logger.error('Auto-invoice: job failed', err);
  }
}
