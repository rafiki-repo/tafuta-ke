import { useEffect, useState, useCallback } from 'react';
import { Check, Edit2, Pin, PinOff, Plus, QrCode, RefreshCw, Save, Search, Trash2, X, Download } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';

const CATEGORY_NAME_MAX_LENGTH = 80;
const CATEGORY_LIST_MAX_LENGTH = 100;
const CATEGORY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &/()+'.-]*$/;

function validateCategoryName(value) {
  const category = formatCategoryName(value);
  if (!category) return 'Category name cannot be blank.';
  if (category.length > CATEGORY_NAME_MAX_LENGTH) return `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or less.`;
  if (!CATEGORY_NAME_PATTERN.test(category)) {
    return 'Category name can only contain letters, numbers, spaces, &, /, (, ), +, apostrophes, periods, and hyphens.';
  }
  return '';
}

function formatCategoryName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[A-Za-z0-9]+/g, (word) => (
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ));
}

function toSlug(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function categoryUrl(category) {
  return `${window.location.origin}/category/${toSlug(category)}`;
}

// ── QR Code Modal ────────────────────────────────────────────────────────────

function QrModal({ category, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const url = categoryUrl(category);
      const png = await QRCodeLib.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      setDataUrl(png);
    } finally {
      setGenerating(false);
    }
  }, [category]);

  useEffect(() => { generate(); }, [generate]);

  const download = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${toSlug(category)}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{category}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 break-all">{categoryUrl(category)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-3 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR image */}
        <div className="flex items-center justify-center rounded-lg border bg-white p-4">
          {generating ? (
            <div className="w-40 h-40 flex items-center justify-center">
              <Spinner />
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${category}`} className="w-40 h-40" />
          ) : (
            <div className="w-40 h-40 flex items-center justify-center text-xs text-muted-foreground">Failed</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generate} disabled={generating} className="flex-1">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button size="sm" onClick={download} disabled={!dataUrl || generating} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [renamingCategory, setRenamingCategory] = useState('');
  const [qrCategory, setQrCategory] = useState(null);

  const [q, setQ] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [updatingBusinessId, setUpdatingBusinessId] = useState(null);

  // Featured businesses per category
  const [featuredMap, setFeaturedMap] = useState({});        // { Hotel: [id1, id2] }
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredCategory, setFeaturedCategory] = useState(''); // which category is open
  const [featuredQ, setFeaturedQ] = useState('');
  const [featuredResults, setFeaturedResults] = useState([]);
  const [featuredSearching, setFeaturedSearching] = useState(false);
  const [featuredSaving, setFeaturedSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadFeatured();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBusinesses(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getCategories();
      setCategories(res.data.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async (query = '') => {
    setBusinessesLoading(true);
    try {
      const res = await adminAPI.getAllBusinesses({ q: query || undefined, limit: 30 });
      setBusinesses(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load businesses.');
    } finally {
      setBusinessesLoading(false);
    }
  };

  const loadFeatured = async () => {
    setFeaturedLoading(true);
    try {
      const res = await adminAPI.getCategoryFeatured();
      setFeaturedMap(res.data.data || {});
    } catch {
      // non-fatal
    } finally {
      setFeaturedLoading(false);
    }
  };

  const searchFeaturedBusinesses = async (query) => {
    if (!featuredCategory) return;
    setFeaturedSearching(true);
    try {
      const res = await adminAPI.getAllBusinesses({
        q: query || undefined,
        category: featuredCategory,
        status: 'active',
        limit: 20,
      });
      setFeaturedResults(res.data.data || []);
    } catch {
      setFeaturedResults([]);
    } finally {
      setFeaturedSearching(false);
    }
  };

  useEffect(() => {
    if (!featuredCategory) return;
    const timer = setTimeout(() => searchFeaturedBusinesses(featuredQ), 300);
    return () => clearTimeout(timer);
  }, [featuredQ, featuredCategory]);

  const pinBusiness = async (business) => {
    const current = featuredMap[featuredCategory] || [];
    if (current.includes(business.business_id)) return;
    const next = [...current, business.business_id];
    await saveFeatured(next);
  };

  const unpinBusiness = async (businessId) => {
    const current = featuredMap[featuredCategory] || [];
    const next = current.filter(id => id !== businessId);
    await saveFeatured(next);
  };

  const saveFeatured = async (ids) => {
    setFeaturedSaving(true);
    try {
      const res = await adminAPI.setCategoryFeatured(featuredCategory, ids);
      setFeaturedMap(res.data.data || {});
    } catch {
      setError('Failed to update featured businesses.');
    } finally {
      setFeaturedSaving(false);
    }
  };

  const normalizeCategory = (value) => formatCategoryName(value);

  const addCategory = () => {
    const category = normalizeCategory(newCategory);
    const validationError = validateCategoryName(category);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (categories.length >= CATEGORY_LIST_MAX_LENGTH) {
      setError(`No more than ${CATEGORY_LIST_MAX_LENGTH} categories are allowed.`);
      return;
    }
    if (categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
      setError('That category already exists.');
      return;
    }
    setCategories((prev) => [...prev, category].sort((a, b) => a.localeCompare(b)));
    setNewCategory('');
    setError('');
    setMessage('');
    setQrCategory(category);
  };

  const removeCategory = (category) => {
    setCategories((prev) => prev.filter((c) => c !== category));
    setMessage('');
  };

  const startEditingCategory = (category) => {
    setEditingCategory(category);
    setEditingValue(category);
    setError('');
    setMessage('');
  };

  const cancelEditingCategory = () => {
    setEditingCategory('');
    setEditingValue('');
  };

  const saveCategoryEdit = async () => {
    const nextCategory = normalizeCategory(editingValue);
    const validationError = validateCategoryName(nextCategory);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (nextCategory.toLowerCase() === editingCategory.toLowerCase()) {
      setCategories((prev) =>
        prev.map((category) =>
          category === editingCategory ? nextCategory : category
        ).sort((a, b) => a.localeCompare(b))
      );
      cancelEditingCategory();
      return;
    }
    if (categories.some((category) => category.toLowerCase() === nextCategory.toLowerCase())) {
      setError('That category already exists.');
      return;
    }

    setRenamingCategory(editingCategory);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.renameCategory(editingCategory, nextCategory);
      const updated = res.data.data;
      setCategories(updated.categories || []);
      setBusinesses((prev) =>
        prev.map((business) =>
          business.category?.toLowerCase() === updated.old_category.toLowerCase()
            ? { ...business, category: updated.new_category }
            : business
        )
      );
      setMessage(`${updated.old_category} renamed to ${updated.new_category}. ${updated.businesses_updated} businesses updated.`);
      cancelEditingCategory();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to rename category.');
    } finally {
      setRenamingCategory('');
    }
  };

  const saveCategories = async () => {
    if (categories.length === 0) {
      setError('At least one category is required.');
      return;
    }
    if (categories.length > CATEGORY_LIST_MAX_LENGTH) {
      setError(`No more than ${CATEGORY_LIST_MAX_LENGTH} categories are allowed.`);
      return;
    }
    for (const category of categories) {
      const validationError = validateCategoryName(category);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.updateCategories(categories);
      setCategories(res.data.data.categories || categories);
      setMessage('Categories saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save categories.');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessCategory = async (businessId, category) => {
    const validationError = validateCategoryName(category);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!categories.some((configured) => configured.toLowerCase() === category.toLowerCase())) {
      setError('Save the category first before assigning it to a business.');
      return;
    }

    setUpdatingBusinessId(businessId);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.updateBusinessCategory(businessId, category);
      const updated = res.data.data;
      setBusinesses((prev) =>
        prev.map((business) =>
          business.business_id === businessId
            ? { ...business, category: updated.category }
            : business
        )
      );
      setMessage(`${updated.business_name} moved to ${updated.category}.`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update business category.');
    } finally {
      setUpdatingBusinessId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Add, remove, and assign business categories used by search and business editors.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manage category list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="e.g. Household and Electronics"
              maxLength={CATEGORY_NAME_MAX_LENGTH}
            />
            <Button type="button" variant="outline" onClick={addCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              editingCategory === category ? (
                <div key={category} className="flex min-h-10 items-center gap-2 rounded-md border bg-secondary/40 px-2 py-1">
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveCategoryEdit();
                      }
                      if (e.key === 'Escape') {
                        cancelEditingCategory();
                      }
                    }}
                    className="h-8 min-w-0 flex-1 bg-background text-sm"
                    maxLength={CATEGORY_NAME_MAX_LENGTH}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveCategoryEdit}
                    disabled={renamingCategory === category}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-primary disabled:opacity-50"
                    title="Save category name"
                  >
                    {renamingCategory === category ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingCategory}
                    disabled={renamingCategory === category}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive disabled:opacity-50"
                    title="Cancel edit"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  key={category}
                  className="flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {category}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQrCategory(category)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                    title={`QR code for ${category}`}
                  >
                    <QrCode className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingCategory(category)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
                    title={`Edit ${category}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                    title={`Remove ${category}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={saveCategories} disabled={saving}>
              {saving ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Categories
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category featured businesses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pin up to 3 businesses to appear first on each category page. Remaining slots fill automatically by verification tier.
          </p>
          <Select
            value={featuredCategory}
            onChange={(e) => { setFeaturedCategory(e.target.value); setFeaturedQ(''); setFeaturedResults([]); }}
          >
            <option value="">Select a category to manage</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          {featuredCategory && (
            <div className="space-y-4">
              {/* Pinned list */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Pinned for {featuredCategory} ({(featuredMap[featuredCategory] || []).length}/3)
                </p>
                {(featuredMap[featuredCategory] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None pinned — showing auto-sorted businesses.</p>
                ) : (
                  <div className="space-y-2">
                    {(featuredMap[featuredCategory] || []).map((id, idx) => {
                      const biz = featuredResults.find(b => b.business_id === id)
                        || businesses.find(b => b.business_id === id);
                      return (
                        <div key={id} className="flex items-center justify-between gap-3 p-2 rounded-md border bg-card">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{biz?.business_name || id}</p>
                              {biz && <p className="text-xs text-muted-foreground">{biz.region}</p>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => unpinBusiness(id)}
                            disabled={featuredSaving}
                            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 shrink-0"
                          >
                            <PinOff className="h-3.5 w-3.5" /> Unpin
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search to pin */}
              {(featuredMap[featuredCategory] || []).length < 3 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Add a business</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={featuredQ}
                      onChange={(e) => setFeaturedQ(e.target.value)}
                      placeholder="Search by business name..."
                      className="pl-9"
                    />
                  </div>
                  {featuredSearching ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {featuredResults
                        .filter(b => !(featuredMap[featuredCategory] || []).includes(b.business_id))
                        .map(b => (
                          <div key={b.business_id} className="flex items-center justify-between gap-3 p-2 rounded-md border hover:bg-accent/50">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{b.business_name}</p>
                              <p className="text-xs text-muted-foreground">{b.category} · {b.region}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => pinBusiness(b)}
                              disabled={featuredSaving}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 shrink-0"
                            >
                              <Pin className="h-3.5 w-3.5" /> Pin
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign categories to businesses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses by name..."
              className="pl-9"
            />
          </div>

          {businessesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No businesses found.</p>
          ) : (
            <div className="space-y-2">
              {businesses.map((business) => (
                <div
                  key={business.business_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{business.business_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {business.category || 'Uncategorised'} · {business.region}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:w-72">
                    <Select
                      value={business.category || ''}
                      onChange={(e) => updateBusinessCategory(business.business_id, e.target.value)}
                      disabled={updatingBusinessId === business.business_id}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </Select>
                    {updatingBusinessId === business.business_id && <Spinner size="sm" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {qrCategory && (
        <QrModal category={qrCategory} onClose={() => setQrCategory(null)} />
      )}
    </div>
  );
}
