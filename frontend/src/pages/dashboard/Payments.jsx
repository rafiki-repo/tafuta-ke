import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Download, RefreshCw, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { paymentAPI, userAPI } from '@/lib/api';

const SERVICE_LABELS = {
  website_hosting: 'Website Hosting',
  ads: 'Ads',
  search_promotion: 'Search Promotion',
  image_gallery: 'Image Gallery',
};

const STATUS_BADGE = {
  active:  { label: 'Active',   variant: 'success' },
  expired: { label: 'Expired',  variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

const TX_STATUS_ICON = {
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending:   <Clock       className="h-4 w-4 text-yellow-500" />,
  failed:    <XCircle     className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle     className="h-4 w-4 text-gray-400" />,
};

function fmt(amount) {
  return `KES ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

function daysUntil(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

export default function Payments() {
  const [businesses, setBusinesses]       = useState([]);
  const [selectedBiz, setSelectedBiz]     = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions]   = useState([]);
  const [txPagination, setTxPagination]   = useState({ page: 1, total: 0 });
  const [loading, setLoading]             = useState(true);
  const [subLoading, setSubLoading]       = useState(false);
  const [downloading, setDownloading]     = useState(null);
  const [error, setError]                 = useState(null);

  // Load user's businesses
  useEffect(() => {
    userAPI.getBusinesses()
      .then(res => {
        const list = res.data?.data?.businesses || [];
        setBusinesses(list);
        if (list.length > 0) setSelectedBiz(list[0].business_id);
      })
      .catch(() => setError('Failed to load businesses'))
      .finally(() => setLoading(false));
  }, []);

  const loadBizData = useCallback(async (bizId, page = 1) => {
    if (!bizId) return;
    setSubLoading(true);
    try {
      const [subRes, txRes] = await Promise.all([
        paymentAPI.getSubscriptions(bizId),
        paymentAPI.getBusinessTransactions(bizId, { page, limit: 10 }),
      ]);
      setSubscriptions(subRes.data?.data || []);
      setTransactions(txRes.data?.data?.transactions || []);
      setTxPagination({
        page,
        total: txRes.data?.data?.pagination?.total || 0,
      });
    } catch {
      setError('Failed to load payment data');
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBiz) loadBizData(selectedBiz);
  }, [selectedBiz, loadBizData]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You have no registered businesses yet.{' '}
            <Link to="/dashboard/businesses/new" className="text-primary underline">
              Register one
            </Link>{' '}
            to manage payments.
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBiz = businesses.find(b => b.business_id === selectedBiz);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button variant="outline" size="sm" onClick={() => loadBizData(selectedBiz)}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
      )}

      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {businesses.map(b => (
            <button
              key={b.business_id}
              onClick={() => setSelectedBiz(b.business_id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedBiz === b.business_id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {b.business_name}
            </button>
          ))}
        </div>
      )}

      {subLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {/* Subscriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Active Services</CardTitle>
              {currentBiz && (
                <Link to={`/dashboard/payments/checkout/${selectedBiz}`}>
                  <Button size="sm">
                    <CreditCard className="h-4 w-4 mr-1" /> Buy / Renew
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No active services.{' '}
                  <Link to={`/dashboard/payments/checkout/${selectedBiz}`} className="text-primary underline">
                    Purchase a service
                  </Link>{' '}
                  to get started.
                </p>
              ) : (
                <div className="divide-y">
                  {subscriptions.map(sub => {
                    const days = daysUntil(sub.expiration_date);
                    const badge = STATUS_BADGE[sub.status] || { label: sub.status, variant: 'secondary' };
                    return (
                      <div key={sub.subscription_id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-sm">
                            {SERVICE_LABELS[sub.service_type] || sub.service_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires{' '}
                            {new Date(sub.expiration_date).toLocaleDateString('en-KE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                            {sub.status === 'active' && days <= 7 && days >= 0 && (
                              <span className="ml-1 text-yellow-600 font-medium">
                                ({days === 0 ? 'today' : `${days}d left`})
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No transactions yet.</p>
              ) : (
                <div className="divide-y">
                  {transactions.map(tx => (
                    <div key={tx.transaction_id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        {TX_STATUS_ICON[tx.status] || TX_STATUS_ICON.pending}
                        <div>
                          <p className="text-sm font-medium">
                            {tx.receipt_number || tx.transaction_id.substring(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('en-KE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                            {' · '}
                            {tx.items?.map(i => SERVICE_LABELS[i.service_type] || i.service_type).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{fmt(tx.total_amount)}</span>
                        {tx.status === 'completed' && (
                          <button
                            onClick={() => downloadReceipt(tx.transaction_id, tx.receipt_number)}
                            disabled={downloading === tx.transaction_id}
                            className="text-muted-foreground hover:text-primary transition-colors"
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

              {/* Pagination */}
              {txPagination.total > 10 && (
                <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground">
                  <span>{txPagination.total} total transactions</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={txPagination.page === 1}
                      onClick={() => loadBizData(selectedBiz, txPagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={txPagination.page * 10 >= txPagination.total}
                      onClick={() => loadBizData(selectedBiz, txPagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick link to checkout */}
          {currentBiz && (
            <Link to={`/dashboard/payments/checkout/${selectedBiz}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Purchase or renew services</p>
                      <p className="text-xs text-muted-foreground">
                        Website hosting, ads, search promotion, image gallery
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
