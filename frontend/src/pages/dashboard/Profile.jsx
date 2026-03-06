import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

// ---------------------------------------------------------------------------
// ContactChangeForm — inline two-step OTP form for phone or email
// ---------------------------------------------------------------------------
function ContactChangeForm({ field, onCancel, onSuccess }) {
  const [step, setStep] = useState('enter'); // 'enter' | 'otp'
  const [newValue, setNewValue] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isEmail = field === 'email';

  const handleRequestOTP = async () => {
    setErr('');
    setLoading(true);
    try {
      if (isEmail) {
        await userAPI.requestEmailChange(newValue);
      } else {
        await userAPI.requestPhoneChange(newValue);
      }
      setStep('otp');
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setErr('');
    setLoading(true);
    try {
      if (isEmail) {
        await userAPI.confirmEmailChange(newValue, otp);
      } else {
        await userAPI.confirmPhoneChange(newValue, otp);
      }
      onSuccess(newValue);
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {step === 'enter' ? (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">
              {isEmail ? 'New Email Address' : 'New Phone Number'}
            </label>
            <Input
              type={isEmail ? 'email' : 'tel'}
              placeholder={isEmail ? 'new@example.com' : '+254712345678'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRequestOTP} disabled={loading || !newValue.trim()}>
              {loading && <Spinner size="sm" className="mr-2" />}
              Send OTP
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <strong>{newValue}</strong>.
          </p>
          <div>
            <label className="text-sm font-medium mb-1 block">OTP Code</label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} disabled={loading || otp.length < 6}>
              {loading && <Spinner size="sm" className="mr-2" />}
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setStep('enter'); setOtp(''); setErr(''); }}
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PasswordChangeForm — inline password update form
// ---------------------------------------------------------------------------
function PasswordChangeForm({ hasPassword, onCancel, onSuccess }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setErr('');
    setLoading(true);
    try {
      await userAPI.changePassword(data.currentPassword, data.newPassword);
      onSuccess();
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {hasPassword && (
        <div>
          <label className="text-sm font-medium mb-1 block">Current Password</label>
          <Input
            type="password"
            autoFocus
            {...register('currentPassword', { required: 'Current password is required' })}
          />
          {errors.currentPassword && (
            <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">New Password</label>
        <Input
          type="password"
          autoFocus={!hasPassword}
          {...register('newPassword', {
            required: 'New password is required',
            minLength: { value: 8, message: 'Must be at least 8 characters' },
          })}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
        <Input
          type="password"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('newPassword') || 'Passwords do not match',
          })}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Spinner size="sm" className="mr-2" />}
          {hasPassword ? 'Update Password' : 'Set Password'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Profile page
// ---------------------------------------------------------------------------
export default function Profile() {
  const { setAuth } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeEdit, setActiveEdit] = useState(null); // null | 'phone' | 'email' | 'password'
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    userAPI.getProfile()
      .then((r) => setProfile(r.data.data))
      .catch(() => setLoadError('Failed to load profile. Please refresh.'));
  }, []);

  const refreshProfile = async () => {
    try {
      const r = await userAPI.getProfile();
      const updated = r.data.data;
      setProfile(updated);
      const token = localStorage.getItem('token');
      setAuth(updated, token);
    } catch {
      // Non-critical — profile was already updated successfully
    }
  };

  const handleContactSuccess = async (field) => {
    setActiveEdit(null);
    setSuccessMsg(`${field === 'phone' ? 'Phone number' : 'Email address'} updated successfully.`);
    await refreshProfile();
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handlePasswordSuccess = () => {
    setActiveEdit(null);
    setSuccessMsg('Password updated successfully.');
    setTimeout(() => setSuccessMsg(''), 5000);
    refreshProfile(); // picks up updated has_password flag
  };

  const toggleEdit = (section) =>
    setActiveEdit((prev) => (prev === section ? null : section));

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile Settings</h1>

      {successMsg && (
        <Alert>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Phone */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone Number</p>
                <p className="mt-0.5">
                  {profile.phone || <span className="text-sm text-muted-foreground italic">Not set</span>}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleEdit('phone')}
              >
                {activeEdit === 'phone' ? 'Cancel' : 'Change'}
              </Button>
            </div>
            {activeEdit === 'phone' && (
              <ContactChangeForm
                field="phone"
                onCancel={() => setActiveEdit(null)}
                onSuccess={() => handleContactSuccess('phone')}
              />
            )}
          </div>

          <div className="border-t" />

          {/* Email */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email Address</p>
                <p className="mt-0.5">
                  {profile.email || <span className="text-sm text-muted-foreground italic">Not set</span>}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleEdit('email')}
              >
                {activeEdit === 'email' ? 'Cancel' : 'Change'}
              </Button>
            </div>
            {activeEdit === 'email' && (
              <ContactChangeForm
                field="email"
                onCancel={() => setActiveEdit(null)}
                onSuccess={() => handleContactSuccess('email')}
              />
            )}
          </div>

        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {profile.has_password
                ? 'Change your login password.'
                : 'No password set. Add one to enable password login.'}
            </p>
            <Button size="sm" variant="outline" onClick={() => toggleEdit('password')}>
              {activeEdit === 'password' ? 'Cancel' : profile.has_password ? 'Change' : 'Set Password'}
            </Button>
          </div>
          {activeEdit === 'password' && (
            <PasswordChangeForm
              hasPassword={profile.has_password}
              onCancel={() => setActiveEdit(null)}
              onSuccess={handlePasswordSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
