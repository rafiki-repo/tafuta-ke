import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { paymentAPI } from '@/lib/api';

const STATUS = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  sent:      { label: 'Sent',      variant: 'warning' },
  paid:      { label: 'Paid',      variant: 'success' },
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

function fmt(n) {
  return `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const justPaid = searchParams.get('paid') === '1';
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    paymentAPI.getInvoice(id)
      .then(res => setInvoice(res.data?.data))
      .catch(() => setError('Invoice not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await paymentAPI.payInvoice(id);
      window.location.href = res.data.data.redirect_url;
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await paymentAPI.getInvoicePdf(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (error && !invoice) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/invoices" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      </div>
    );
  }

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const s = STATUS[invoice.status] || { label: invoice.status, variant: 'secondary' };
  const canPay = !['paid', 'cancelled'].includes(invoice.status);
  const isOverdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <Link to="/dashboard/invoices" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Link>

      {justPaid && (
        <div className="flex items-center gap-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Payment successful!</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Your payment was processed. This invoice is now marked as paid.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
      )}

      <Card>
        <CardContent className="p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{invoice.invoice_number || 'Invoice'}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{invoice.business_name}</p>
            </div>
            <Badge variant={isOverdue ? 'destructive' : s.variant} className="text-sm px-3 py-1">
              {isOverdue ? 'Overdue' : s.label}
            </Badge>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm border-t border-b py-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Issue Date</p>
              <p className="font-medium">{fmtDate(invoice.issue_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
              <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>{fmtDate(invoice.due_date)}</p>
            </div>
            {invoice.paid_at && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Paid On</p>
                <p className="font-medium text-green-600">{fmtDate(invoice.paid_at)}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Service</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                    <th className="text-right px-4 py-2.5 font-medium w-12">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium w-28">Unit Price</th>
                    <th className="text-right px-4 py-2.5 font-medium w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">
                        {item.label || item.service_type}
                        {item.description && (
                          <p className="text-xs text-muted-foreground font-normal mt-0.5 sm:hidden">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{item.description}</td>
                      <td className="px-4 py-3 text-right">{item.months ?? item.qty ?? 1}</td>
                      <td className="px-4 py-3 text-right">{fmt(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-xs text-muted-foreground">Subtotal</td>
                    <td className="px-4 py-2 text-right text-sm">{fmt(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-xs text-muted-foreground">VAT (16%)</td>
                    <td className="px-4 py-2 text-right text-sm">{fmt(invoice.vat_amount)}</td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold">Total Due</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">{fmt(invoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No line items on this invoice.</p>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-md bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Note</p>
              {invoice.notes}
            </div>
          )}

          {/* Paid confirmation */}
          {invoice.status === 'paid' && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="h-5 w-5" />
              This invoice has been paid. Thank you!
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {canPay && (
              <Button onClick={handlePay} disabled={paying} className="flex-1">
                {paying
                  ? <><Spinner className="h-4 w-4 mr-2" /> Redirecting to PesaPal...</>
                  : <><ExternalLink className="h-4 w-4 mr-2" /> Pay {fmt(invoice.total_amount)} via PesaPal</>}
              </Button>
            )}
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Spinner className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
