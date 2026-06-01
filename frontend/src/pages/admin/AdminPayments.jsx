import { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { paymentAPI } from '@/lib/api';

const TX_TABS   = ['All', 'completed', 'pending', 'failed'];
const TX_STATUS_ICON = {
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending:   <Clock       className="h-4 w-4 text-yellow-500" />,
  failed:    <XCircle     className="h-4 w-4 text-red-500" />,
};

const REFUND_STATUS_BADGE = {
  pending:   { label: 'Pending',   variant: 'secondary' },
  approved:  { label: 'Approved',  variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'destructive' },
};

function fmt(amount) {
  return `KES ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

// ── Refund Create Modal ────────────────────────────────────────────────────

function RefundModal({ onClose, onCreated }) {
  const SERVICES = ['website_hosting', 'ads', 'search_promotion', 'image_gallery'];
  const [businessId, setBusinessId]   = useState('');
  const [reason, setReason]           = useState('');
  const [items, setItems]             = useState([{ service_type: SERVICES[0], months_to_refund: 1 }]);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  function addItem() {
    setItems(prev => [...prev, { service_type: SERVICES[0], months_to_refund: 1 }]);
  }
  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: field === 'months_to_refund' ? parseInt(value, 10) || 1 : value } : item
    ));
  }

  async function submit() {
    if (!businessId.trim()) return setError('Business ID is required');
    setSubmitting(true);
    setError(null);
    try {
      await paymentAPI.adminCreateRefund({ business_id: businessId.trim(), items, reason });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create refund');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg space-y-4 p-6">
        <h2 className="text-lg font-bold">Create Refund Request</h2>

        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Business ID</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              placeholder="UUID of the business"
              value={businessId}
              onChange={e => setBusinessId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Services to refund</label>
            <div className="mt-1 space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={item.service_type}
                    onChange={e => updateItem(i, 'service_type', e.target.value)}
                    className="flex-1 border rounded-md px-2 py-1.5 text-sm"
                  >
                    {SERVICES.map(s => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number" min={1} max={24}
                    value={item.months_to_refund}
                    onChange={e => updateItem(i, 'months_to_refund', e.target.value)}
                    className="w-20 border rounded-md px-2 py-1.5 text-sm text-center"
                    placeholder="Months"
                  />
                  <span className="text-xs text-muted-foreground">mo</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-destructive text-sm">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="text-xs text-primary hover:underline">+ Add service</button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Spinner className="h-4 w-4 mr-1" /> : null}
            Create Refund
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [tab, setTab]                   = useState('transactions'); // 'transactions' | 'refunds'
  const [txFilter, setTxFilter]         = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [txPagination, setTxPagination] = useState({ page: 1, total: 0 });
  const [refunds, setRefunds]           = useState([]);
  const [refundPagination, setRefundPagination] = useState({ page: 1, total: 0 });
  const [loading, setLoading]           = useState(false);
  const [downloading, setDownloading]   = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadTransactions = useCallback(async (page = 1, status) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status && status !== 'All') params.status = status;
      const res = await paymentAPI.adminGetTransactions(params);
      setTransactions(res.data?.data?.transactions || []);
      setTxPagination({ page, total: res.data?.data?.pagination?.total || 0 });
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefunds = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await paymentAPI.adminGetRefunds({ page, limit: 20 });
      setRefunds(res.data?.data?.refunds || []);
      setRefundPagination({ page, total: res.data?.data?.pagination?.total || 0 });
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'transactions') loadTransactions(1, txFilter);
    else loadRefunds(1);
  }, [tab, txFilter, loadTransactions, loadRefunds]);

  async function downloadReceipt(txId, receiptNumber) {
    setDownloading(txId);
    try {
      const res = await paymentAPI.getReceipt(txId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = receiptNumber ? `receipt-${receiptNumber}.pdf` : `receipt-${txId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download receipt');
    } finally {
      setDownloading(null);
    }
  }

  async function refundAction(id, action) {
    setActionLoading(id + action);
    try {
      if (action === 'approve')  await paymentAPI.adminApproveRefund(id);
      if (action === 'complete') await paymentAPI.adminCompleteRefund(id);
      if (action === 'reject') {
        const reason = window.prompt('Reason for rejection (optional):') ?? '';
        await paymentAPI.adminRejectRefund(id, { reason });
      }
      await loadRefunds(refundPagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"
            onClick={() => tab === 'transactions' ? loadTransactions(txPagination.page, txFilter) : loadRefunds(refundPagination.page)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {tab === 'refunds' && (
            <Button size="sm" onClick={() => setShowRefundModal(true)}>
              <RotateCcw className="h-4 w-4 mr-1" /> New Refund
            </Button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        {['transactions', 'refunds'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Transactions ── */}
      {tab === 'transactions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">All Transactions</CardTitle>
            <div className="flex gap-1">
              {TX_TABS.map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    txFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions found.</p>
            ) : (
              <div className="divide-y">
                {transactions.map(tx => (
                  <div key={tx.transaction_id} className="py-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {TX_STATUS_ICON[tx.status] || TX_STATUS_ICON.pending}
                      <div>
                        <p className="text-sm font-medium">
                          {tx.receipt_number || tx.transaction_id.substring(0, 8)}
                          <span className="text-muted-foreground font-normal ml-2 text-xs">{tx.business_name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.payer_name} · {tx.payer_phone} ·{' '}
                          {new Date(tx.created_at).toLocaleDateString('en-KE', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.items?.map(i => i.service_type.replace(/_/g, ' ')).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium">{fmt(tx.total_amount)}</span>
                      {tx.status === 'completed' && (
                        <button
                          onClick={() => downloadReceipt(tx.transaction_id, tx.receipt_number)}
                          disabled={downloading === tx.transaction_id}
                          className="text-muted-foreground hover:text-primary"
                          title="Download receipt"
                        >
                          {downloading === tx.transaction_id
                            ? <Spinner className="h-4 w-4" />
                            : <Download className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {txPagination.total > 20 && (
              <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground">
                <span>{txPagination.total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    disabled={txPagination.page === 1}
                    onClick={() => loadTransactions(txPagination.page - 1, txFilter)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={txPagination.page * 20 >= txPagination.total}
                    onClick={() => loadTransactions(txPagination.page + 1, txFilter)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Refunds ── */}
      {tab === 'refunds' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Refund Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : refunds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No refund requests.</p>
            ) : (
              <div className="divide-y">
                {refunds.map(r => {
                  const badge = REFUND_STATUS_BADGE[r.status] || { label: r.status, variant: 'secondary' };
                  return (
                    <div key={r.refund_id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{r.business_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.requester_name} · {r.requester_phone} ·{' '}
                            {new Date(r.created_at).toLocaleDateString('en-KE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.items?.map(i =>
                              `${i.service_type.replace(/_/g, ' ')} × ${i.months_to_refund}mo`
                            ).join(', ')}
                          </p>
                          {r.reason && (
                            <p className="text-xs italic text-muted-foreground mt-0.5">"{r.reason}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <p className="text-sm font-medium">{fmt(r.net_refund)}</p>
                          <p className="text-xs text-muted-foreground">
                            ({fmt(r.refund_amount)} − 5% fee)
                          </p>
                        </div>
                      </div>

                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline"
                            disabled={!!actionLoading}
                            onClick={() => refundAction(r.refund_id, 'approve')}>
                            {actionLoading === r.refund_id + 'approve' ? <Spinner className="h-3 w-3 mr-1" /> : null}
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive"
                            disabled={!!actionLoading}
                            onClick={() => refundAction(r.refund_id, 'reject')}>
                            Reject
                          </Button>
                        </div>
                      )}

                      {r.status === 'approved' && (
                        <div className="flex gap-2">
                          <Button size="sm"
                            disabled={!!actionLoading}
                            onClick={() => refundAction(r.refund_id, 'complete')}>
                            {actionLoading === r.refund_id + 'complete' ? <Spinner className="h-3 w-3 mr-1" /> : null}
                            Mark as Paid (Cash Disbursed)
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {refundPagination.total > 20 && (
              <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground">
                <span>{refundPagination.total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    disabled={refundPagination.page === 1}
                    onClick={() => loadRefunds(refundPagination.page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={refundPagination.page * 20 >= refundPagination.total}
                    onClick={() => loadRefunds(refundPagination.page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showRefundModal && (
        <RefundModal
          onClose={() => setShowRefundModal(false)}
          onCreated={() => { setShowRefundModal(false); loadRefunds(1); }}
        />
      )}
    </div>
  );
}
