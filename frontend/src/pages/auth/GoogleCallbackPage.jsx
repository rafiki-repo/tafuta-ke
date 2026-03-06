import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { authAPI, userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState('loading'); // 'loading' | 'phone' | 'error'
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const isNew = searchParams.get('new') === '1';

    if (!token) {
      setError('Login failed. No token received from Google.');
      setStatus('error');
      return;
    }

    const init = async () => {
      try {
        // Store token so userAPI.getProfile() can use it
        localStorage.setItem('token', token);
        const userResponse = await userAPI.getProfile();
        const user = userResponse.data.data;
        setAuth(user, token);

        if (isNew && !user.phone) {
          setStatus('phone');
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        localStorage.removeItem('token');
        setError('Failed to load your profile. Please try logging in again.');
        setStatus('error');
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSavePhone = async () => {
    setPhoneError('');
    if (!phone.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }
    setSaving(true);
    try {
      await authAPI.saveGooglePhone(phone.trim());
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setPhoneError(err.response?.data?.error?.message || 'Failed to save phone number.');
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-sm w-full space-y-4 p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // status === 'phone'
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-sm w-full space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">One more thing</h2>
          <p className="text-muted-foreground mt-2">
            Would you like to add your phone number? This lets you log in via OTP and receive SMS
            notifications. You can skip this and add it later in your profile.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">Phone Number (optional)</label>
          <Input
            type="tel"
            placeholder="+254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePhone()}
            autoFocus
          />
          {phoneError && (
            <p className="text-sm text-destructive">{phoneError}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleSavePhone} disabled={saving}>
            {saving ? <Spinner size="sm" className="mr-2" /> : null}
            Save
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleSkip} disabled={saving}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
