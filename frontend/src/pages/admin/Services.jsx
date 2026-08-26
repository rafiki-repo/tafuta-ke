import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';

const BLANK = { id: '', label: '', billing_type: 'monthly', description: '', price: '', enabled: true };
const BILLING_LABELS = { monthly: 'Monthly', one_time: 'One-time' };

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export default function Services() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Row being edited inline
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({});

  // New service form
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState({ ...BLANK });
  const [newError, setNewError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getServiceTypes();
      setTypes(res.data.data.service_types || []);
    } catch {
      setError('Failed to load service types.');
    } finally {
      setLoading(false);
    }
  };

  const save = async (updatedTypes) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await adminAPI.updateServiceTypes(updatedTypes);
      setTypes(res.data.data.service_types);
      setMessage('Service types saved.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save service types.');
    } finally {
      setSaving(false);
    }
  };

  // Inline edit
  const startEdit = (st) => {
    setEditingId(st.id);
    setEditingValues({ ...st });
    setError('');
    setMessage('');
  };

  const cancelEdit = () => { setEditingId(null); setEditingValues({}); };

  const commitEdit = () => {
    const updated = types.map(t => t.id === editingId ? { ...editingValues, price: Number(editingValues.price ?? editingValues.price_per_month) || 0 } : t);
    setTypes(updated);
    cancelEdit();
    setMessage('');
  };

  const toggleEnabled = (id) => {
    setTypes(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
    setMessage('');
  };

  const removeType = (id) => {
    setTypes(prev => prev.filter(t => t.id !== id));
    setMessage('');
  };

  // Add new
  const validateNew = () => {
    if (!newType.id.trim()) return 'ID is required.';
    if (!/^[a-z][a-z0-9_]*$/.test(newType.id)) return 'ID must be lowercase letters, numbers, and underscores only.';
    if (types.some(t => t.id === newType.id)) return 'A service type with that ID already exists.';
    if (!newType.label.trim()) return 'Label is required.';
    return '';
  };

  const addType = () => {
    const err = validateNew();
    if (err) { setNewError(err); return; }
    setTypes(prev => [...prev, { ...newType, price_per_month: Number(newType.price_per_month) || 0 }]);
    setNewType({ ...BLANK });
    setAdding(false);
    setNewError('');
    setMessage('');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">
          Define the paid services available on Tafuta. Admin can grant any service to a business via the business edit page.
        </p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert variant="success"><AlertTitle>Saved</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Service Types</CardTitle>
          <div className="flex gap-2">
            {!adding && (
              <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(true); setNewError(''); }}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => save(types)} disabled={saving}>
              {saving ? <Spinner size="sm" className="mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new row */}
          {adding && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium text-primary">New Service Type</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">ID (slug)</label>
                  <Input
                    value={newType.id}
                    onChange={(e) => setNewType(prev => ({ ...prev, id: slugify(e.target.value) }))}
                    placeholder="e.g. flyer"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Label</label>
                  <Input
                    value={newType.label}
                    onChange={(e) => setNewType(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. Digital Flyer"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Billing Type</label>
                  <select
                    value={newType.billing_type}
                    onChange={(e) => setNewType(prev => ({ ...prev, billing_type: e.target.value }))}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="monthly">Monthly subscription</option>
                    <option value="one_time">One-time purchase</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Price (KES){newType.billing_type === 'monthly' ? ' / month' : ''}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newType.price}
                    onChange={(e) => setNewType(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g. 500"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                  <Input
                    value={newType.description}
                    onChange={(e) => setNewType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this service do?"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {newError && <p className="text-xs text-destructive">{newError}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addType}><Check className="h-4 w-4 mr-1" />Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setNewError(''); }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Existing types */}
          {types.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground py-4">No service types defined yet.</p>
          )}

          {types.map((st) => (
            <div key={st.id} className={`rounded-lg border p-4 ${!st.enabled ? 'opacity-60' : ''}`}>
              {editingId === st.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Label</label>
                      <Input value={editingValues.label} onChange={(e) => setEditingValues(p => ({ ...p, label: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Billing Type</label>
                      <select
                        value={editingValues.billing_type || 'monthly'}
                        onChange={(e) => setEditingValues(p => ({ ...p, billing_type: e.target.value }))}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="monthly">Monthly subscription</option>
                        <option value="one_time">One-time purchase</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        Price (KES){(editingValues.billing_type || 'monthly') === 'monthly' ? ' / month' : ''}
                      </label>
                      <Input type="number" min="0" value={editingValues.price ?? editingValues.price_per_month ?? ''} onChange={(e) => setEditingValues(p => ({ ...p, price: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                      <Input value={editingValues.description} onChange={(e) => setEditingValues(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={commitEdit}><Check className="h-4 w-4 mr-1" />Done</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4 mr-1" />Cancel</Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{st.label}</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{st.id}</code>
                      <Badge variant="outline" className="text-xs">
                        {BILLING_LABELS[st.billing_type || 'monthly']}
                      </Badge>
                      {st.enabled
                        ? <Badge variant="success">Enabled</Badge>
                        : <Badge variant="secondary">Disabled</Badge>}
                    </div>
                    {st.description && <p className="text-xs text-muted-foreground mt-0.5">{st.description}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      KES {Number(st.price ?? st.price_per_month ?? 0).toLocaleString()}
                      {(st.billing_type || 'monthly') === 'monthly' ? ' / month' : ' (one-time)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => toggleEnabled(st.id)} title={st.enabled ? 'Disable' : 'Enable'} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                      {st.enabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={() => startEdit(st)} title="Edit" className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeType(st.id)} title="Remove" className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {types.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Changes are staged locally. Click <strong>Save All</strong> to persist.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
