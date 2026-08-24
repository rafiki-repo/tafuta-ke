import { useEffect, useState, useCallback } from 'react';
import { FileText, Plus, Download, RefreshCw, Search, Check, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { adminAPI } from '@/lib/api';

const STATUS_BADGE = {
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

// ── Create Invoice Modal ──────────────────────────────────────────────────────

const VAT_RATE = 0.16;

function CreateInvoiceModal({ onClose, onCreated }) {
  const [step, setStep] = useState('search'); // search | pick
  const [bizQ, setBizQ] = useState('');
  const [bizResults, setBizResults] = useState([]);
  const [bizSearching, setBizSearching] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [loading, setLoading] = useState(false);
  // line items keyed by service_type: { checked, label, description, qty, unit_price, billing_type }
  const [lines, setLines] = useState({});
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Business search
  useEffect(() => {
    if (!bizQ.trim()) { setBizResults([]); return; }
    const t = setTimeout(async () => {
      setBizSearching(true);
      try {
        const res = await adminAPI.getAllBusinesses({ q: bizQ, limit: 10 });
        setBizResults(res.data.data || []);
      } finally { setBizSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [bizQ]);

  const selectBusiness = async (biz) => {
    setSelectedBiz(biz);
    setStep('pick');
    setLoading(true);
    setErr('');
    try {
      // Load all service types + active subscriptions in parallel
      const [typesRes, previewRes] = await Promise.all([
        adminAPI.getServiceTypes(),
        adminAPI.previewInvoiceItems(biz.business_id).catch(() => ({ data: { data: { items: [] } } })),
      ]);
      const serviceTypes = typesRes.data.data?.service_types || typesRes.data.data || [];
      const activeItems = previewRes.data.data?.items || [];
      const activeMap = Object.fromEntries(activeItems.map(i => [i.service_type, i]));

      // Build line map: all services available, pre-check subscription-active ones
      const initialLines = {};
      serviceTypes.forEach(st => {
        const active = activeMap[st.id];
        initialLines[st.id] = {
          label: st.label || st.id,
          description: active ? active.description : (st.billing_type === 'one_time' ? 'One-time service' : 'Monthly subscription'),
          qty: 1,
          unit_price: Number(st.price ?? 0),
          billing_type: st.billing_type || 'monthly',
          checked: !!active,
        };
      });
      setLines(initialLines);
    } catch {
      setErr('Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (id) => setLines(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  const updateLine = (id, field, val) => setLines(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const checkedLines = Object.entries(lines).filter(([, v]) => v.checked);
  const subtotal = parseFloat(checkedLines.reduce((s, [, v]) => s + v.qty * v.unit_price, 0).toFixed(2));
  const vatAmount = parseFloat((subtotal * VAT_RATE).toFixed(2));
  const total = parseFloat((subtotal + vatAmount).toFixed(2));

  const handleCreate = async () => {
    if (checkedLines.length === 0) { setErr('Select at least one service.'); return; }
    setSaving(true);
    setErr('');
    try {
      const items = checkedLines.map(([id, v]) => ({
        service_type: id,
        label: v.label,
        description: v.description,
        months: v.qty,
        unit_price: Number(v.unit_price),
        total: parseFloat((v.qty * Number(v.unit_price)).toFixed(2)),
      }));
      const res = await adminAPI.createInvoice({
        business_id: selectedBiz.business_id,
        items,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      });
      onCreated(res.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">New Invoice</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}

          {/* Step 1: search */}
          {step === 'search' && (
            <>
              <p className="text-sm text-muted-foreground">Search for the business to invoice.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={bizQ} onChange={e => setBizQ(e.target.value)} placeholder="Business name..." className="pl-9" autoFocus />
              </div>
              {bizSearching && <div className="flex justify-center py-4"><Spinner /></div>}
              {bizResults.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md divide-y">
                  {bizResults.map(b => (
                    <button key={b.business_id} type="button" onClick={() => selectBusiness(b)}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors">
                      <p className="text-sm font-medium">{b.business_name}</p>
                      <p className="text-xs text-muted-foreground">{b.category} · {b.region}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: pick services */}
          {step === 'pick' && selectedBiz && (
            <>
              <div className="text-sm font-semibold">{selectedBiz.business_name}</div>
              <p className="text-xs text-muted-foreground">Select services to include. Active subscriptions are pre-checked. Prices and quantities are editable.</p>

              {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-8 px-3 py-2" />
                          <th className="text-left px-3 py-2 font-medium">Service</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                          <th className="text-right px-3 py-2 font-medium w-16">Qty</th>
                          <th className="text-right px-3 py-2 font-medium w-28">Unit Price</th>
                          <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(lines).map(([id, v]) => (
                          <tr key={id} className={v.checked ? 'bg-primary/5' : 'opacity-60'}>
                            <td className="px-3 py-2 text-center">
                              <input type="checkbox" checked={v.checked} onChange={() => toggleLine(id)}
                                className="rounded border-border cursor-pointer" />
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{v.label}</p>
                              {v.checked && (
                                <input
                                  type="text"
                                  value={v.description}
                                  onChange={e => updateLine(id, 'description', e.target.value)}
                                  className="mt-1 text-xs text-muted-foreground border-0 border-b border-dashed border-muted-foreground/50 bg-transparent w-full focus:outline-none focus:border-primary"
                                  placeholder="Description..."
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                              {v.billing_type === 'one_time' ? 'One-time' : 'Monthly'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number" min="1"
                                value={v.qty}
                                onChange={e => updateLine(id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                disabled={!v.checked}
                                className="w-12 text-right border rounded px-1 py-0.5 text-xs bg-background disabled:opacity-40"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number" min="0" step="0.01"
                                value={v.unit_price}
                                onChange={e => updateLine(id, 'unit_price', parseFloat(e.target.value) || 0)}
                                disabled={!v.checked}
                                className="w-24 text-right border rounded px-1 py-0.5 text-xs bg-background disabled:opacity-40"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-medium">
                              {v.checked ? fmt(v.qty * v.unit_price) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t">
                        <tr>
                          <td colSpan={5} className="px-3 py-1.5 text-right text-xs text-muted-foreground">Subtotal</td>
                          <td className="px-3 py-1.5 text-right text-xs">{fmt(subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-3 py-1.5 text-right text-xs text-muted-foreground">VAT (16%)</td>
                          <td className="px-3 py-1.5 text-right text-xs">{fmt(vatAmount)}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right font-semibold">Total</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmt(total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Due Date</label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (optional)</label>
                      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Pay via M-Pesa..." />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end p-4 border-t shrink-0">
          {step === 'pick' && (
            <Button type="button" variant="outline"
              onClick={() => { setStep('search'); setSelectedBiz(null); setLines({}); }}>
              Back
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {step === 'pick' && (
            <Button type="button" onClick={handleCreate} disabled={saving || loading || checkedLines.length === 0}>
              {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getInvoices({ page: p, limit: LIMIT, status: statusFilter || undefined, q: q || undefined });
      const d = res.data;
      setInvoices(d.data || []);
      setTotal(d.pagination?.total || d.data?.length || 0);
      setPage(p);
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  useEffect(() => { load(1); }, [load]);

  const updateStatus = async (invoiceId, status) => {
    setUpdating(invoiceId + status);
    try {
      const res = await adminAPI.updateInvoice(invoiceId, { status });
      setInvoices(prev => prev.map(i => i.invoice_id === invoiceId ? { ...i, ...res.data.data } : i));
    } catch {
      setError('Failed to update invoice.');
    } finally {
      setUpdating(null);
    }
  };

  const downloadPdf = async (invoice) => {
    setDownloading(invoice.invoice_id);
    try {
      const res = await adminAPI.getInvoicePdf(invoice.invoice_id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number || invoice.invoice_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Generate and manage client invoices based on active services.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search business..." className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => load(1)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No invoices yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium">Business</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Issue Date</th>
                    <th className="text-left px-4 py-3 font-medium">Due Date</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map(inv => {
                    const badge = STATUS_BADGE[inv.status] || { label: inv.status, variant: 'secondary' };
                    const isUpdating = updating?.startsWith(inv.invoice_id);
                    return (
                      <tr key={inv.invoice_id} className="hover:bg-accent/20">
                        <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoice_number || '—'}</td>
                        <td className="px-4 py-3 font-medium">{inv.business_name}</td>
                        <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.due_date)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(inv.total_amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Download PDF */}
                            <button
                              type="button" title="Download PDF"
                              onClick={() => downloadPdf(inv)}
                              disabled={downloading === inv.invoice_id}
                              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                            >
                              {downloading === inv.invoice_id ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                            </button>

                            {/* Mark as Sent */}
                            {inv.status === 'draft' && (
                              <button type="button" title="Mark as Sent"
                                onClick={() => updateStatus(inv.invoice_id, 'sent')}
                                disabled={!!isUpdating}
                                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-blue-600"
                              >
                                {isUpdating ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                              </button>
                            )}

                            {/* Mark as Paid */}
                            {(inv.status === 'sent' || inv.status === 'overdue') && (
                              <button type="button" title="Mark as Paid"
                                onClick={() => updateStatus(inv.invoice_id, 'paid')}
                                disabled={!!isUpdating}
                                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-green-600"
                              >
                                {isUpdating ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                              </button>
                            )}

                            {/* Cancel */}
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button type="button" title="Cancel"
                                onClick={() => updateStatus(inv.invoice_id, 'cancelled')}
                                disabled={!!isUpdating}
                                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                              >
                                {isUpdating ? <Spinner className="h-4 w-4" /> : <X className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{total} invoices total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => load(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * LIMIT >= total} onClick={() => load(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={(inv) => { setShowCreate(false); load(1); }}
        />
      )}
    </div>
  );
}
