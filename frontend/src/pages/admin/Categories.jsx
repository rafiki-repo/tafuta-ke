import { useEffect, useState } from 'react';
import { Check, Edit2, Plus, Save, Search, Trash2, X } from 'lucide-react';
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

  const [q, setQ] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [updatingBusinessId, setUpdatingBusinessId] = useState(null);

  useEffect(() => {
    loadCategories();
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
    </div>
  );
}
