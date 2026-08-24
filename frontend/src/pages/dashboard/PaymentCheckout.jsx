import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { paymentAPI, businessAPI } from '@/lib/api';


function fmt(n) {
  return parseFloat(n).toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

export default function PaymentCheckout() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]     = useState(null);
  const [services, setServices]     = useState([]);  // full service type defs from API
  const [vatRate, setVatRate]       = useState(0.16);
  const [selected, setSelected]     = useState({});  // { service_type: months }
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    Promise.all([
      businessAPI.get(businessId),
      paymentAPI.getPricing(),
    ])
      .then(([bizRes, pricingRes]) => {
        setBusiness(bizRes.data?.data || bizRes.data);
        const p = pricingRes.data?.data;
        // Only show enabled services
        setServices((p?.service_types || []).filter(s => s.enabled));
        setVatRate(p?.vat_rate || 0.16);
      })
      .catch(() => setError('Failed to load checkout data'))
      .finally(() => setLoading(false));
  }, [businessId]);

  function toggleService(key) {
    setSelected(prev => {
      if (prev[key] !== undefined) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: 1 };
    });
  }

  function setMonths(key, value) {
    const months = Math.min(12, Math.max(1, parseInt(value, 10) || 1));
    setSelected(prev => ({ ...prev, [key]: months }));
  }

  const svcMap = Object.fromEntries(services.map(s => [s.id, s]));

  const items = Object.entries(selected).map(([service_type, months]) => {
    const def = svcMap[service_type] || {};
    const price = Number(def.price ?? def.price_per_month ?? 200);
    const isOneTime = def.billing_type === 'one_time';
    const total = isOneTime ? price : price * months;
    return { service_type, months: isOneTime ? 1 : months, price, total, isOneTime };
  });

  const subtotal    = items.reduce((s, i) => s + i.total, 0);
  const vatAmount   = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;

  async function handlePay() {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await paymentAPI.initiate({
        business_id: businessId,
        items: items.map(i => ({ service_type: i.service_type, months: i.months })),
      });
      const redirectUrl = res.data?.data?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setError('No redirect URL returned from payment gateway');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  if (error && !business) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
        <Button variant="outline" onClick={() => navigate('/dashboard/payments')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/payments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Buy / Renew Services</h1>
      </div>

      {business && (
        <p className="text-muted-foreground text-sm">
          For <span className="font-medium text-foreground">{business.business_name}</span>
        </p>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>
      )}

      {/* Service selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No services available at this time.</p>
          )}
          {services.map(svc => {
            const isSelected = selected[svc.id] !== undefined;
            const price = Number(svc.price ?? svc.price_per_month ?? 0);
            const isOneTime = svc.billing_type === 'one_time';
            return (
              <div
                key={svc.id}
                className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleService(svc.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(svc.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium text-sm">{svc.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">KES {fmt(price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOneTime ? 'one-time' : '/month'}
                    </p>
                  </div>
                </div>

                {isSelected && !isOneTime && (
                  <div
                    className="flex items-center gap-3 mt-3 pt-3 border-t border-primary/20"
                    onClick={e => e.stopPropagation()}
                  >
                    <label className="text-sm text-muted-foreground shrink-0">Months:</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-7 h-7 rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setMonths(svc.id, (selected[svc.id] || 1) - 1)}
                      >−</button>
                      <input
                        type="number"
                        min={1} max={12}
                        value={selected[svc.id] || 1}
                        onChange={e => setMonths(svc.id, e.target.value)}
                        className="w-14 text-center border rounded px-2 py-1 text-sm"
                      />
                      <button
                        className="w-7 h-7 rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setMonths(svc.id, (selected[svc.id] || 1) + 1)}
                      >+</button>
                    </div>
                    <span className="text-sm text-muted-foreground ml-auto">
                      = KES {fmt(price * (selected[svc.id] || 1))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Order summary */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(item => (
              <div key={item.service_type} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {svcMap[item.service_type]?.label || item.service_type}
                  {!item.isOneTime && ` × ${item.months} month${item.months > 1 ? 's' : ''}`}
                </span>
                <span>KES {fmt(item.total)}</span>
              </div>
            ))}

            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KES {fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT ({(vatRate * 100).toFixed(0)}%)</span>
                <span>KES {fmt(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>KES {fmt(totalAmount)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-700 dark:text-blue-300 mt-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                You will be redirected to PesaPal to complete payment via M-Pesa, Airtel Money, or card.
                Services activate immediately on payment confirmation.
              </span>
            </div>

            <Button
              className="w-full mt-2"
              size="lg"
              onClick={handlePay}
              disabled={submitting}
            >
              {submitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              {submitting ? 'Redirecting to PesaPal…' : `Pay KES ${fmt(totalAmount)} via PesaPal`}
            </Button>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select at least one service above to continue.
        </p>
      )}
    </div>
  );
}
