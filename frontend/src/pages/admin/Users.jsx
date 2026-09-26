import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
const USER_STATUSES = ['active', 'deactivated', 'suspended', 'deleted'];

export default function Users() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const actorLevel = ROLE_HIERARCHY[currentUser?.admin_role] || 0;

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [users, setUsers] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const [statusValue, setStatusValue] = useState('active');
  const [statusReason, setStatusReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusErr, setStatusErr] = useState('');

  const [selected, setSelected] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [verifyField, setVerifyField] = useState(null); // 'phone' | 'email' | null
  const [verifyReason, setVerifyReason] = useState('');
  const [verifySaving, setVerifySaving] = useState(false);
  const [verifyErr, setVerifyErr] = useState('');

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNewPassword, setPwNewPassword] = useState('');
  const [pwReason, setPwReason] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr] = useState('');

  // Debounce search input — mirrors the business listing's auto-search behavior
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  const runSearch = useCallback(async () => {
    const trimmed = debouncedQ.trim();
    setSelected(null);
    if (!trimmed) {
      setUsers([]);
      setSearched(false);
      setSearchErr('');
      return;
    }
    setLoading(true);
    setSearchErr('');
    try {
      const params = { q: trimmed };
      if (includeDeleted) params.status = 'deleted';
      const r = await adminAPI.getUsers(params);
      setUsers(r.data.data || []);
      setSearched(true);
    } catch {
      setSearchErr('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, includeDeleted]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

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
    setVerifyField(null);
    setVerifyReason('');
    setVerifyErr('');
    setPwOpen(false);
    setPwNewPassword('');
    setPwReason('');
    setPwErr('');
    setStatusValue(u.status || 'active');
    setStatusReason('');
    setStatusErr('');
  };

  const startVerifyToggle = (field) => {
    setVerifyField(field);
    setVerifyReason('');
    setVerifyErr('');
  };

  const confirmVerifyToggle = async () => {
    if (!verifyReason.trim()) return;
    const key = verifyField === 'phone' ? 'phone_verified' : 'email_verified';
    const newValue = !selected[key];
    setVerifySaving(true);
    setVerifyErr('');
    try {
      await adminAPI.updateUserVerification(selected.user_id, {
        [key]: newValue,
        reason: verifyReason.trim(),
      });
      const updatedUser = { ...selected, [key]: newValue };
      setUsers((prev) =>
        prev.map((u) => (u.user_id === selected.user_id ? { ...u, [key]: newValue } : u))
      );
      setSelected(updatedUser);
      setVerifyField(null);
      setVerifyReason('');
      setSuccessMsg('Verification status updated.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      setVerifyErr(e.response?.data?.error?.message || 'Failed to update verification status.');
    } finally {
      setVerifySaving(false);
    }
  };

  const confirmPasswordReset = async () => {
    if (pwNewPassword.length < 8 || !pwReason.trim()) return;
    setPwSaving(true);
    setPwErr('');
    try {
      await adminAPI.resetUserPassword(selected.user_id, {
        newPassword: pwNewPassword,
        reason: pwReason.trim(),
      });
      setPwOpen(false);
      setPwNewPassword('');
      setPwReason('');
      setSuccessMsg('Password reset successfully.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      setPwErr(e.response?.data?.error?.message || 'Failed to reset password.');
    } finally {
      setPwSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusReason.trim()) return;
    setStatusSaving(true);
    setStatusErr('');
    try {
      await adminAPI.updateUserStatus(selected.user_id, {
        status: statusValue,
        reason: statusReason.trim(),
      });
      const updatedUser = { ...selected, status: statusValue };
      setUsers((prev) => {
        const next = prev.map((u) => (u.user_id === selected.user_id ? updatedUser : u));
        // Drop from the current list if it no longer matches the active filter
        return includeDeleted === (statusValue === 'deleted')
          ? next
          : next.filter((u) => u.user_id !== selected.user_id);
      });
      setSelected(updatedUser);
      setStatusReason('');
      setSuccessMsg('User status updated.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      setStatusErr(e.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button variant="outline" onClick={() => navigate('/register')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, nickname, email, or phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        {loading && <Spinner size="sm" />}
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Search deleted users
        </label>
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

                  <div className="border-t pt-3 space-y-2">
                    <p className="text-sm font-medium">Delete / Restore User</p>

                    {statusErr && (
                      <Alert variant="destructive">
                        <AlertDescription>{statusErr}</AlertDescription>
                      </Alert>
                    )}

                    {selected.user_id === currentUser?.user_id ? (
                      <p className="text-xs text-muted-foreground">
                        You cannot change your own account status.
                      </p>
                    ) : (
                      <>
                        <Select
                          value={statusValue}
                          onChange={(e) => setStatusValue(e.target.value)}
                        >
                          {USER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                        {statusValue !== selected.status && (
                          <>
                            <Textarea
                              value={statusReason}
                              onChange={(e) => setStatusReason(e.target.value)}
                              placeholder="Reason for this status change (required)"
                              rows={2}
                            />
                            <Button
                              size="sm"
                              variant={statusValue === 'deleted' ? 'destructive' : 'outline'}
                              onClick={confirmStatusChange}
                              disabled={statusSaving || !statusReason.trim()}
                              className="w-full"
                            >
                              {statusSaving && <Spinner size="sm" className="mr-2" />}
                              Set status to "{statusValue}"
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <p className="text-sm font-medium">Verification</p>

                    {verifyErr && (
                      <Alert variant="destructive">
                        <AlertDescription>{verifyErr}</AlertDescription>
                      </Alert>
                    )}

                    {[
                      { field: 'phone', label: 'Phone', key: 'phone_verified' },
                      { field: 'email', label: 'Email', key: 'email_verified' },
                    ].map(({ field, label, key }) => (
                      <div key={field} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{label}</span>
                            <Badge variant={selected[key] ? 'success' : 'outline'}>
                              {selected[key] ? 'Verified' : 'Not Verified'}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startVerifyToggle(field)}
                            disabled={verifySaving}
                          >
                            Mark {selected[key] ? 'Unverified' : 'Verified'}
                          </Button>
                        </div>

                        {verifyField === field && (
                          <div className="space-y-2">
                            <Textarea
                              value={verifyReason}
                              onChange={(e) => setVerifyReason(e.target.value)}
                              placeholder={`Reason for marking ${label.toLowerCase()} as ${selected[key] ? 'unverified' : 'verified'} (required)`}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={confirmVerifyToggle}
                                disabled={verifySaving || !verifyReason.trim()}
                              >
                                {verifySaving && <Spinner size="sm" className="mr-2" />}
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setVerifyField(null)}
                                disabled={verifySaving}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <p className="text-sm font-medium">Password</p>

                    {pwErr && (
                      <Alert variant="destructive">
                        <AlertDescription>{pwErr}</AlertDescription>
                      </Alert>
                    )}

                    {!pwOpen ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPwOpen(true); setPwNewPassword(''); setPwReason(''); setPwErr(''); }}
                      >
                        Reset Password
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="password"
                          placeholder="New password (min 8 characters)"
                          value={pwNewPassword}
                          onChange={(e) => setPwNewPassword(e.target.value)}
                        />
                        <Textarea
                          value={pwReason}
                          onChange={(e) => setPwReason(e.target.value)}
                          placeholder="Reason for resetting this password (required)"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={confirmPasswordReset}
                            disabled={pwSaving || pwNewPassword.length < 8 || !pwReason.trim()}
                          >
                            {pwSaving && <Spinner size="sm" className="mr-2" />}
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPwOpen(false)}
                            disabled={pwSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
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
