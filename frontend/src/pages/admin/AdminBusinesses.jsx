import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, CheckCircle, XCircle, Edit2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { adminAPI } from '@/lib/api';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'all', label: 'All' },
];

const statusVariant = {
  pending: 'warning',
  active: 'success',
  suspended: 'destructive',
  deactivated: 'secondary',
  out_of_business: 'secondary',
};

const tierVariant = {
  basic: 'secondary',
  verified: 'default',
  premium: 'success',
};

function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function AdminBusinesses() {
  const [activeTab, setActiveTab] = useState('pending');
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal state
  const [selected, setSelected] = useState(null);
  const [tierValue, setTierValue] = useState('basic');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        limit: 50,
        ...(activeTab !== 'all' && { status: activeTab }),
        ...(debouncedSearch && { q: debouncedSearch }),
      };
      const res = await adminAPI.getAllBusinesses(params);
      setBusinesses(res.data.data);
      setTotal(res.data.pagination?.total ?? res.data.data.length);
    } catch {
      setError('Failed to load businesses.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const openModal = (business) => {
    setSelected(business);
    setTierValue(business.verification_tier || 'basic');
    setRejectReason('');
    setShowRejectInput(false);
    setModalError(null);
  };

  const closeModal = () => {
    setSelected(null);
    setSaving(false);
    setModalError(null);
  };

  const handleApprove = async () => {
    setSaving(true);
    setModalError(null);
    try {
      await adminAPI.approveBusiness(selected.business_id, { verification_tier: tierValue });
      setBusinesses(prev => prev.filter(b => b.business_id !== selected.business_id));
      setTotal(prev => prev - 1);
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Approval failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setModalError('A rejection reason is required.');
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      await adminAPI.rejectBusiness(selected.business_id, { reason: rejectReason.trim() });
      setBusinesses(prev => prev.filter(b => b.business_id !== selected.business_id));
      setTotal(prev => prev - 1);
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Rejection failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTier = async () => {
    setSaving(true);
    setModalError(null);
    try {
      await adminAPI.updateBusinessVerification(selected.business_id, { verification_tier: tierValue });
      setBusinesses(prev =>
        prev.map(b =>
          b.business_id === selected.business_id ? { ...b, verification_tier: tierValue } : b
        )
      );
      setSelected(prev => ({ ...prev, verification_tier: tierValue }));
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update tier.');
    } finally {
      setSaving(false);
    }
  };

  const c = selected?.content_json || {};
  const preview = {
    description: c.profile?.en?.description,
    phone: c.contact?.phone,
    email: c.contact?.email,
    whatsapp: c.contact?.whatsapp,
    city: c.location?.city,
    street: c.location?.street_address,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Businesses</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search businesses..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && total > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {debouncedSearch ? 'No businesses match your search.' : `No ${activeTab === 'all' ? '' : activeTab + ' '}businesses.`}
        </p>
      ) : (
        <div className="divide-y rounded-lg border bg-background">
          {businesses.map(b => (
            <div key={b.business_id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.business_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {b.category} · {b.region}
                  {b.subdomain && (
                    <span className="ml-2 font-mono">{b.subdomain}.tafuta.ke</span>
                  )}
                </p>
                {(b.owner_name || b.owner_phone) && (
                  <p className="text-xs text-muted-foreground">
                    {b.owner_name}{b.owner_phone && ` · ${b.owner_phone}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={statusVariant[b.status] || 'secondary'}>{b.status}</Badge>
                {b.verification_tier && (
                  <Badge variant={tierVariant[b.verification_tier] || 'secondary'}>
                    {b.verification_tier}
                  </Badge>
                )}
                <Button size="sm" variant="outline" onClick={() => openModal(b)}>
                  {b.status === 'pending' ? 'Review' : 'Manage'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeModal}
          aria-hidden="true"
        />
      )}

      {/* Slide-over modal */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          selected ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selected && (
          <>
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">{selected.business_name}</h2>
                  <Badge variant={statusVariant[selected.status] || 'secondary'}>
                    {selected.status}
                  </Badge>
                  {selected.verification_tier && (
                    <Badge variant={tierVariant[selected.verification_tier] || 'secondary'}>
                      {selected.verification_tier}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Business info */}
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  {selected.category} · {selected.region}
                  {selected.subdomain && (
                    <span className="ml-2 font-mono text-xs">{selected.subdomain}.tafuta.ke</span>
                  )}
                </p>
                <p className="text-muted-foreground">
                  Submitted {daysAgo(selected.created_at)}
                  {selected.owner_name && ` · Owner: ${selected.owner_name}`}
                  {selected.owner_phone && ` · ${selected.owner_phone}`}
                </p>
              </div>

              {/* Content preview */}
              <div className="space-y-2 text-sm">
                {preview.description && (
                  <p className="text-foreground leading-relaxed line-clamp-3">{preview.description}</p>
                )}
                {(preview.phone || preview.email || preview.whatsapp) && (
                  <div className="space-y-0.5 text-muted-foreground">
                    {preview.phone && <p>Phone: {preview.phone}</p>}
                    {preview.email && <p>Email: {preview.email}</p>}
                    {preview.whatsapp && <p>WhatsApp: {preview.whatsapp}</p>}
                  </div>
                )}
                {(preview.city || preview.street) && (
                  <p className="text-muted-foreground">
                    {[preview.street, preview.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="border-t" />

              {/* Actions: Pending approval flow */}
              {selected.status === 'pending' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Approval Decision</p>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Verification Tier
                    </label>
                    <Select
                      value={tierValue}
                      onChange={e => setTierValue(e.target.value)}
                      className="w-full"
                    >
                      <option value="basic">Basic</option>
                      <option value="verified">Verified</option>
                      <option value="premium">Premium</option>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? <Spinner size="sm" className="mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectInput(prev => !prev)}
                      disabled={saving}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  {showRejectInput && (
                    <div className="space-y-2">
                      <Textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (required)"
                        rows={3}
                      />
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={saving || !rejectReason.trim()}
                        className="w-full"
                      >
                        {saving ? <Spinner size="sm" className="mr-2" /> : null}
                        Confirm Rejection
                      </Button>
                    </div>
                  )}

                  <div className="border-t" />
                </div>
              )}

              {/* Tier update + Edit link (all statuses) */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Verification Tier</p>
                <div className="flex gap-2">
                  <Select
                    value={tierValue}
                    onChange={e => setTierValue(e.target.value)}
                    className="flex-1"
                  >
                    <option value="basic">Basic</option>
                    <option value="verified">Verified</option>
                    <option value="premium">Premium</option>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleUpdateTier}
                    disabled={saving || tierValue === selected.verification_tier}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                </div>

                <Link to={`/admin/businesses/${selected.business_id}/edit`}>
                  <Button variant="outline" className="w-full">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Business
                  </Button>
                </Link>
              </div>

              {/* Modal errors */}
              {modalError && (
                <Alert variant="destructive">
                  <AlertDescription>{modalError}</AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
