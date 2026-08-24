import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentAPI.getInvoices();
      setInvoices(res.data?.data || []);
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">View and pay invoices for your businesses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No invoices yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="divide-y sm:hidden">
                {invoices.map(inv => {
                  const s = STATUS[inv.status] || { label: inv.status, variant: 'secondary' };
                  const overdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date();
                  return (
                    <Link key={inv.invoice_id} to={`/dashboard/invoices/${inv.invoice_id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium font-mono">{inv.invoice_number || 'Invoice'}</p>
                        <p className="text-xs text-muted-foreground">{inv.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {overdue ? (
                            <span className="text-destructive font-medium">Due {fmtDate(inv.due_date)}</span>
                          ) : `Due ${fmtDate(inv.due_date)}`}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={s.variant}>{s.label}</Badge>
                        <p className="text-sm font-semibold">{fmt(inv.total_amount)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                      <th className="text-left px-4 py-3 font-medium">Business</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Issue Date</th>
                      <th className="text-left px-4 py-3 font-medium">Due Date</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map(inv => {
                      const s = STATUS[inv.status] || { label: inv.status, variant: 'secondary' };
                      const overdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date();
                      return (
                        <tr key={inv.invoice_id}
                          className="hover:bg-accent/20 cursor-pointer transition-colors">
                          <td className="px-4 py-3">
                            <Link to={`/dashboard/invoices/${inv.invoice_id}`}
                              className="font-mono text-xs font-medium text-primary hover:underline">
                              {inv.invoice_number || 'View'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium">{inv.business_name}</td>
                          <td className="px-4 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                          <td className="px-4 py-3">
                            {overdue
                              ? <span className="text-destructive font-medium">{fmtDate(inv.due_date)}</span>
                              : <span className="text-muted-foreground">{fmtDate(inv.due_date)}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{fmt(inv.total_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
