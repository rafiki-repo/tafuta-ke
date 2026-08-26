import PDFDocument from 'pdfkit';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

export async function generateInvoicePdf(invoiceId) {
  try {
    const [invResult, configResult] = await Promise.all([
      pool.query(
        `SELECT i.*, b.business_name, b.content_json,
                u.full_name as created_by_name
         FROM invoices i
         JOIN businesses b ON i.business_id = b.business_id
         LEFT JOIN users u ON i.created_by = u.user_id
         WHERE i.invoice_id = $1`,
        [invoiceId]
      ),
      pool.query(`SELECT value FROM system_config WHERE key = 'legal_identity'`),
    ]);

    if (invResult.rows.length === 0) throw new Error('Invoice not found');

    const inv = invResult.rows[0];
    const legal = configResult.rows[0]?.value || {
      business_name: 'eBiashara Rahisi Ltd',
      business_address: 'Nairobi, Kenya',
    };

    const contact = inv.content_json?.contact || {};
    const fmt = (n) => `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const STATUS_LABELS = { draft: 'DRAFT', sent: 'SENT', paid: 'PAID', overdue: 'OVERDUE', cancelled: 'CANCELLED' };
    const statusLabel = STATUS_LABELS[inv.status] || inv.status.toUpperCase();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────────
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a1a').text('TAFUTA', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#444444').text(legal.business_name, { align: 'center' });
      doc.text(legal.business_address || '', { align: 'center' });
      if (legal.kra_pin) doc.text(`KRA PIN: ${legal.kra_pin}`, { align: 'center' });
      if (legal.vat_registration_number) doc.text(`VAT Reg: ${legal.vat_registration_number}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.5);

      // ── Title + status watermark ─────────────────────────────────────────
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a').text('INVOICE', { align: 'center' });
      if (inv.status !== 'draft') {
        const stampColor = inv.status === 'paid' ? '#16a34a' : inv.status === 'overdue' ? '#dc2626' : '#6b7280';
        doc.fontSize(11).font('Helvetica-Bold').fillColor(stampColor).text(`[${statusLabel}]`, { align: 'center' });
      }
      doc.fillColor('#1a1a1a').moveDown(0.5);

      // ── Two-column meta ──────────────────────────────────────────────────
      const leftX = 50, rightX = 350;
      let y = doc.y;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No:`, leftX, y).font('Helvetica-Bold').text(inv.invoice_number || inv.invoice_id.slice(0, 8), leftX + 80, y);
      doc.font('Helvetica').text(`Issue Date:`,  leftX, y + 16).font('Helvetica-Bold').text(fmtDate(inv.issue_date), leftX + 80, y + 16);
      doc.font('Helvetica').text(`Due Date:`,    leftX, y + 32).font('Helvetica-Bold').text(fmtDate(inv.due_date), leftX + 80, y + 32);

      // Bill To
      doc.font('Helvetica-Bold').fillColor('#444444').text('BILL TO', rightX, y);
      doc.font('Helvetica').fillColor('#1a1a1a')
        .text(inv.business_name, rightX, y + 14)
        .text(contact.phone || '', rightX, y + 28)
        .text(contact.email || '', rightX, y + 42);

      doc.moveDown(4);

      // ── Items table ──────────────────────────────────────────────────────
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.4);

      const COL = { service: 50, desc: 170, qty: 310, unit: 370, total: 460 };
      y = doc.y;

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#444444');
      doc.text('Service',      COL.service, y, { width: 115 });
      doc.text('Description',  COL.desc,    y, { width: 135 });
      doc.text('Qty/Mo',       COL.qty,     y, { width: 55, align: 'center' });
      doc.text('Unit Price',   COL.unit,    y, { width: 85, align: 'right' });
      doc.text('Total',        COL.total,   y, { width: 85, align: 'right' });

      y += 16;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#333333').stroke();
      y += 8;

      doc.font('Helvetica').fontSize(10).fillColor('#1a1a1a');
      const items = Array.isArray(inv.items) ? inv.items : [];
      for (const item of items) {
        const label = item.label || item.service_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const desc = item.description || (item.months > 1 ? `${item.months} months` : 'Monthly subscription');
        const qty = item.months || 1;
        const unit = parseFloat(item.unit_price || 0);
        const total = parseFloat(item.total || unit * qty);

        doc.text(label,           COL.service, y, { width: 115 });
        doc.text(desc,            COL.desc,    y, { width: 135 });
        doc.text(String(qty),     COL.qty,     y, { width: 55, align: 'center' });
        doc.text(unit.toFixed(2), COL.unit,    y, { width: 85, align: 'right' });
        doc.text(total.toFixed(2),COL.total,   y, { width: 85, align: 'right' });
        y += 22;
      }

      y += 4;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
      y += 10;

      // ── Totals ───────────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(10);
      doc.text('Subtotal:', 350, y, { width: 105 });
      doc.text(fmt(inv.subtotal), COL.total, y, { width: 85, align: 'right' });
      y += 18;

      const vatPct = inv.vat_amount && inv.subtotal
        ? Math.round((parseFloat(inv.vat_amount) / parseFloat(inv.subtotal)) * 100)
        : 16;
      doc.text(`VAT (${vatPct}%):`, 350, y, { width: 105 });
      doc.text(fmt(inv.vat_amount), COL.total, y, { width: 85, align: 'right' });
      y += 18;

      doc.moveTo(350, y).lineTo(545, y).strokeColor('#333333').stroke();
      y += 6;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total Due:', 350, y, { width: 105 });
      doc.text(fmt(inv.total_amount), COL.total, y, { width: 85, align: 'right' });

      // ── Notes ────────────────────────────────────────────────────────────
      if (inv.notes) {
        doc.moveDown(3).font('Helvetica-Bold').fontSize(10).fillColor('#444444').text('Notes');
        doc.font('Helvetica').fillColor('#1a1a1a').fontSize(10).text(inv.notes, { width: 495 });
      }

      // ── Footer ────────────────────────────────────────────────────────────
      doc.moveDown(3).fontSize(9).font('Helvetica').fillColor('#888888');
      doc.text('Please make payment by the due date. Thank you for your business!', { align: 'center' });
      doc.text('Tafuta.ke — Kenya\'s Business Directory', { align: 'center' });

      doc.end();
    });
  } catch (err) {
    logger.error('Invoice PDF generation failed', { error: err.message, invoiceId });
    throw err;
  }
}
