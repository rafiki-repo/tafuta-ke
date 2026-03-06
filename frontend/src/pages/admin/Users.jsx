import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { adminAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support_staff: 'Support Staff',
};

const ROLE_HIERARCHY = { super_admin: 3, admin: 2, support_staff: 1 };

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const actorLevel = ROLE_HIERARCHY[currentUser?.admin_role] || 0;

  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const [selected, setSelected] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearchErr('');
    setSelected(null);
    try {
      const r = await adminAPI.getUsers({ q: q.trim() });
      setUsers(r.data.data || []);
      setSearched(true);
    } catch {
      setSearchErr('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (u) => {
    setSelected(u);
    setEditData({
      full_name: u.full_name || '',
      nickname: u.nickname || '',
      email: u.email || '',
      phone: u.phone || '',
      status: u.status || 'active',
      admin_role: u.admin_role || '',
    });
    setSaveErr('');
    setSuccessMsg('');
  };

  const save = async () => {
    setSaving(true);
    setSaveErr('');
    try {
      const payload = {
        full_name: editData.full_name || null,
        nickname: editData.nickname || null,
        email: editData.email || null,
        phone: editData.phone || null,
        status: editData.status,
        admin_role: editData.admin_role || null,
      };
      await adminAPI.updateUser(selected.user_id, payload);
      const updatedUser = { ...selected, ...payload };
      setUsers((prev) =>
        prev.map((u) => (u.user_id === selected.user_id ? updatedUser : u))
      );
      setSelected(updatedUser);
      setSuccessMsg('User updated successfully.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      setSaveErr(e.response?.data?.error?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, nickname, email, or phone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="max-w-md"
        />
        <Button onClick={search} disabled={loading || !q.trim()}>
          {loading ? <Spinner size="sm" className="mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Search
        </Button>
      </div>

      {searchErr && (
        <Alert variant="destructive">
          <AlertDescription>{searchErr}</AlertDescription>
        </Alert>
      )}

      {searched && users.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No users found for "{q}".</p>
      )}

      {users.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Results list */}
          <div className="flex-1 space-y-2">
            {users.map((u) => (
              <div
                key={u.user_id}
                onClick={() => selectUser(u)}
                className={`p-3 rounded-md border cursor-pointer transition-colors hover:bg-accent ${
                  selected?.user_id === u.user_id
                    ? 'border-primary bg-accent'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {u.full_name || (
                        <span className="italic text-muted-foreground">No name</span>
                      )}
                      {u.nickname && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({u.nickname})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[u.email, u.phone].filter(Boolean).join(' · ') || 'No contact info'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {u.status !== 'active' && (
                      <Badge variant="destructive" className="text-xs">{u.status}</Badge>
                    )}
                    {u.admin_role && (
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[u.admin_role] || u.admin_role}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit panel */}
          {selected && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {successMsg && (
                    <Alert>
                      <AlertDescription>{successMsg}</AlertDescription>
                    </Alert>
                  )}
                  {saveErr && (
                    <Alert variant="destructive">
                      <AlertDescription>{saveErr}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1 block">Full Name</label>
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Nickname</label>
                    <Input
                      value={editData.nickname}
                      onChange={(e) => setEditData((p) => ({ ...p, nickname: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <Input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Account Status</label>
                    <Select
                      value={editData.status}
                      onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Admin Role</label>
                    <Select
                      value={editData.admin_role}
                      onChange={(e) => setEditData((p) => ({ ...p, admin_role: e.target.value }))}
                    >
                      <option value="">None</option>
                      <option value="support_staff">Support Staff</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </Select>
                    {editData.admin_role && ROLE_HIERARCHY[editData.admin_role] > actorLevel && (
                      <p className="text-xs text-amber-600 mt-1">
                        You cannot grant this role — it exceeds your own level.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={save} disabled={saving}>
                      {saving && <Spinner size="sm" className="mr-2" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(null)}
                      disabled={saving}
                    >
                      Close
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground pt-1">
                    User ID: {selected.user_id}
                    <br />
                    Joined: {new Date(selected.created_at).toLocaleDateString()}
                    {selected.last_login_at && (
                      <>
                        <br />
                        Last login: {new Date(selected.last_login_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
