import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { paymentAPI, businessAPI } from '@/lib/api';

const SERVICES = [
  {
    key: 'website_hosting',
    label: 'Website Hosting',
    description: 'Single-page website with subdomain (e.g. mybiz.machakos.tafuta.ke)',
  },
  {
    key: 'ads',
    label: 'Ads',
    description: 'Promotional ads shown in search results and business listings',
  },
  {
    key: 'search_promotion',
    label: 'Search Promotion',
    description: 'Appear in the top 10% of search results ~2× more often',
  },
  {
    key: 'image_gallery',
    label: 'Image Gallery',
    description: 'Up to 50 product or service images in your business profile',
  },
];

function fmt(n) {
  return parseFloat(n).toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

export default function PaymentCheckout() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]   = useState(null);
  const [pricing, setPricing]     = useState({});
  const [vatRate, setVatRate]     = useState(0.16);
  const [selected, setSelected]   = useState({});   // { service_type: months }
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    Promise.all([
      businessAPI.get(businessId),
      paymentAPI.getPricing(),
    ])
      .then(([bizRes, pricingRes]) => {
        setBusiness(bizRes.data?.data || bizRes.data);
        const p = pricingRes.data?.data;
        setPricing(p?.pricing || {});
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

  const items = Object.entries(selected).map(([service_type, months]) => ({
    service_type,
    months,
    price_per_month: pricing[service_type] || 200,
    total: (pricing[service_type] || 200) * months,
  }));

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
          {SERVICES.map(svc => {
            const isSelected = selected[svc.key] !== undefined;
            const ppm = pricing[svc.key] || 200;
            return (
              <div
                key={svc.key}
                className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleService(svc.key)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(svc.key)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium text-sm">{svc.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">KES {fmt(ppm)}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="flex items-center gap-3 mt-3 pt-3 border-t border-primary/20"
                    onClick={e => e.stopPropagation()}
                  >
                    <label className="text-sm text-muted-foreground shrink-0">Months:</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-7 h-7 rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setMonths(svc.key, (selected[svc.key] || 1) - 1)}
                      >−</button>
                      <input
                        type="number"
                        min={1} max={12}
                        value={selected[svc.key] || 1}
                        onChange={e => setMonths(svc.key, e.target.value)}
                        className="w-14 text-center border rounded px-2 py-1 text-sm"
                      />
                      <button
                        className="w-7 h-7 rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setMonths(svc.key, (selected[svc.key] || 1) + 1)}
                      >+</button>
                    </div>
                    <span className="text-sm text-muted-foreground ml-auto">
                      = KES {fmt(ppm * (selected[svc.key] || 1))}
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
                  {SERVICES.find(s => s.key === item.service_type)?.label} × {item.months} month{item.months > 1 ? 's' : ''}
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
