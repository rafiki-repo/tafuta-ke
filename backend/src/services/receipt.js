import PDFDocument from 'pdfkit';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

export async function generateReceipt(transactionId) {
  try {
    const [txResult, configResult] = await Promise.all([
      pool.query(
        `SELECT t.*, b.business_name, u.full_name, u.phone, u.email
         FROM transactions t
         JOIN businesses b ON t.business_id = b.business_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.transaction_id = $1`,
        [transactionId]
      ),
      pool.query(`SELECT value FROM system_config WHERE key = 'legal_identity'`),
    ]);

    if (txResult.rows.length === 0) throw new Error('Transaction not found');

    const tx = txResult.rows[0];
    const legal = configResult.rows[0]?.value || {
      business_name: 'eBiashara Rahisi Ltd',
      business_address: 'Nairobi, Kenya',
    };

    const receiptLabel = tx.receipt_number || tx.transaction_id;
    const dateStr = new Date(tx.completed_at || tx.created_at).toLocaleDateString('en-KE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────────
      doc.fontSize(22).font('Helvetica-Bold').text('TAFUTA', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(legal.business_name, { align: 'center' });
      doc.text(legal.business_address || '', { align: 'center' });
      if (legal.kra_pin) doc.text(`KRA PIN: ${legal.kra_pin}`, { align: 'center' });
      if (legal.vat_registration_number) {
        doc.text(`VAT Reg: ${legal.vat_registration_number}`, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.5);

      // ── Title ────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(0.5);

      // ── Receipt meta ─────────────────────────────────────────────────────
      doc.fontSize(10).font('Helvetica');
      doc.text(`Receipt No: ${receiptLabel}`);
      doc.text(`Date: ${dateStr}`);
      doc.text(`Payment Method: ${tx.payment_method || 'PesaPal'}`);
      doc.moveDown();

      // ── Customer ─────────────────────────────────────────────────────────
      doc.fontSize(11).font('Helvetica-Bold').text('Customer');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name:  ${tx.full_name}`);
      doc.text(`Phone: ${tx.phone}`);
      if (tx.email) doc.text(`Email: ${tx.email}`);
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').text('Business');
      doc.fontSize(10).font('Helvetica').text(tx.business_name);
      doc.moveDown();

      // ── Items table ──────────────────────────────────────────────────────
      doc.fontSize(11).font('Helvetica-Bold').text('Services Purchased');
      doc.moveDown(0.3);

      const COL = { service: 50, months: 270, price: 350, subtotal: 450 };
      let y = doc.y;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Service',       COL.service,   y, { width: 210 });
      doc.text('Months',        COL.months,    y, { width: 75, align: 'center' });
      doc.text('KES/Month',     COL.price,     y, { width: 90, align: 'right' });
      doc.text('Subtotal',      COL.subtotal,  y, { width: 95, align: 'right' });

      y += 16;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#333333').stroke();
      y += 8;

      doc.font('Helvetica').fontSize(10);
      for (const item of tx.items) {
        const ppm   = item.price_per_month || 200;
        const sub   = ppm * item.months;
        const label = item.service_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        doc.text(label,             COL.service,  y, { width: 210 });
        doc.text(String(item.months), COL.months, y, { width: 75, align: 'center' });
        doc.text(ppm.toFixed(2),    COL.price,    y, { width: 90, align: 'right' });
        doc.text(sub.toFixed(2),    COL.subtotal, y, { width: 95, align: 'right' });
        y += 20;
      }

      y += 4;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
      y += 10;

      // ── Totals ────────────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(10);
      doc.text('Subtotal:',  350, y, { width: 90 });
      doc.text(`KES ${parseFloat(tx.amount).toFixed(2)}`,     COL.subtotal, y, { width: 95, align: 'right' });
      y += 18;

      doc.text('VAT (16%):', 350, y, { width: 90 });
      doc.text(`KES ${parseFloat(tx.vat_amount).toFixed(2)}`, COL.subtotal, y, { width: 95, align: 'right' });
      y += 18;

      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total:',     350, y, { width: 90 });
      doc.text(`KES ${parseFloat(tx.total_amount).toFixed(2)}`, COL.subtotal, y, { width: 95, align: 'right' });

      doc.moveDown(3);

      // ── Footer ────────────────────────────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('Thank you for choosing Tafuta!', { align: 'center' });
      doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });

      doc.end();
    });
  } catch (err) {
    logger.error('Receipt generation failed', { error: err.message, transactionId });
    throw err;
  }
}
