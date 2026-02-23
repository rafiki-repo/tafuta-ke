import PDFDocument from 'pdfkit';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

export async function generateReceipt(transactionId) {
  try {
    // Get transaction details
    const transactionResult = await pool.query(
      `SELECT t.*, b.business_name, u.full_name, u.phone, u.email
       FROM transactions t
       JOIN businesses b ON t.business_id = b.business_id
       JOIN users u ON t.user_id = u.user_id
       WHERE t.transaction_id = $1`,
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    const transaction = transactionResult.rows[0];

    // Get legal identity from system config
    const configResult = await pool.query(
      `SELECT value FROM system_config WHERE key = 'legal_identity'`
    );

    const legalIdentity = configResult.rows[0]?.value || {
      business_name: 'eBiashara Rahisi Ltd',
      business_address: 'Nairobi, Kenya',
    };

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('TAFUTA', { align: 'center' });
      doc.fontSize(10).text(legalIdentity.business_name, { align: 'center' });
      doc.text(legalIdentity.business_address, { align: 'center' });
      if (legalIdentity.kra_pin) {
        doc.text(`KRA PIN: ${legalIdentity.kra_pin}`, { align: 'center' });
      }
      doc.moveDown();

      // Receipt title
      doc.fontSize(16).text('PAYMENT RECEIPT', { align: 'center', underline: true });
      doc.moveDown();

      // Receipt details
      doc.fontSize(10);
      doc.text(`Receipt No: ${transaction.transaction_id}`, { align: 'left' });
      doc.text(`Date: ${new Date(transaction.completed_at || transaction.created_at).toLocaleDateString()}`, { align: 'left' });
      doc.text(`Payment Method: ${transaction.payment_method || 'PesaPal'}`, { align: 'left' });
      doc.moveDown();

      // Customer details
      doc.fontSize(12).text('Customer Details:', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${transaction.full_name}`);
      doc.text(`Phone: ${transaction.phone}`);
      if (transaction.email) {
        doc.text(`Email: ${transaction.email}`);
      }
      doc.moveDown();

      // Business details
      doc.fontSize(12).text('Business:', { underline: true });
      doc.fontSize(10);
      doc.text(`${transaction.business_name}`);
      doc.moveDown();

      // Items table
      doc.fontSize(12).text('Services Purchased:', { underline: true });
      doc.moveDown(0.5);

      const items = transaction.items;
      let yPosition = doc.y;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Service', 50, yPosition, { width: 200, continued: false });
      doc.text('Months', 250, yPosition, { width: 100, continued: false });
      doc.text('Price/Month', 350, yPosition, { width: 100, continued: false });
      doc.text('Subtotal', 450, yPosition, { width: 100, align: 'right', continued: false });

      yPosition += 20;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Table rows
      doc.font('Helvetica');
      items.forEach((item) => {
        const pricePerMonth = item.price_per_month || 200;
        const subtotal = pricePerMonth * item.months;

        doc.text(item.service_type.replace(/_/g, ' '), 50, yPosition, { width: 200 });
        doc.text(item.months.toString(), 250, yPosition, { width: 100 });
        doc.text(`${pricePerMonth.toFixed(2)} KES`, 350, yPosition, { width: 100 });
        doc.text(`${subtotal.toFixed(2)} KES`, 450, yPosition, { width: 100, align: 'right' });

        yPosition += 20;
      });

      yPosition += 10;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;

      // Totals
      doc.font('Helvetica');
      doc.text('Subtotal:', 350, yPosition, { width: 100 });
      doc.text(`${transaction.amount.toFixed(2)} KES`, 450, yPosition, { width: 100, align: 'right' });
      yPosition += 20;

      doc.text('VAT (16%):', 350, yPosition, { width: 100 });
      doc.text(`${transaction.vat_amount.toFixed(2)} KES`, 450, yPosition, { width: 100, align: 'right' });
      yPosition += 20;

      doc.font('Helvetica-Bold');
      doc.fontSize(12);
      doc.text('Total:', 350, yPosition, { width: 100 });
      doc.text(`${transaction.total_amount.toFixed(2)} KES`, 450, yPosition, { width: 100, align: 'right' });

      doc.moveDown(2);

      // Footer
      doc.fontSize(10).font('Helvetica');
      doc.text('Thank you for your business!', { align: 'center' });
      doc.moveDown();
      doc.fontSize(8);
      doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center', italics: true });

      doc.end();
    });
  } catch (error) {
    logger.error('Receipt generation failed', { error: error.message, transactionId });
    throw error;
  }
}
