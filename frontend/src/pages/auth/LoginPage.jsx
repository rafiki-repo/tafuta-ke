import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { authAPI, userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

const TABS = ['google', 'password', 'otp'];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('google'); // 'google' | 'password' | 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const [otpChannel, setOtpChannel] = useState(''); // 'phone' | 'email'

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const identifier = watch('identifier');

  const finishLogin = async (token) => {
    const userResponse = await userAPI.getProfile();
    setAuth(userResponse.data.data, token);
    navigate('/dashboard');
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setOtpSent(false);
    setError('');
  };

  const onPasswordLogin = async (data) => {
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login({ identifier: data.identifier, password: data.password });
      await finishLogin(response.data.data.token);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRequestOTP = async () => {
    if (!identifier) {
      setError('Please enter your phone number or email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.requestOTP({ identifier });
      setOtpChannel(response.data.data?.channel || 'phone');
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onOTPLogin = async (data) => {
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ identifier: data.identifier, otp: data.otp });
      await finishLogin(response.data.data.token);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        {[
          { key: 'google',   label: 'Google'   },
          { key: 'password', label: 'Password' },
          { key: 'otp',      label: 'OTP'      },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Google tab */}
      {tab === 'google' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign in instantly with your Google account — no password or OTP needed.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => authAPI.googleLogin()}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <form onSubmit={handleSubmit(onPasswordLogin)} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number or Email</label>
            <Input
              type="text"
              placeholder="+254712345678 or you@example.com"
              autoComplete="username"
              {...register('identifier', { required: 'Phone number or email is required' })}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size="sm" className="mr-2" /> : null}
            Sign In
          </Button>
        </form>
      )}

      {/* OTP tab */}
      {tab === 'otp' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number or Email</label>
            <Input
              type="text"
              placeholder="+254712345678 or you@example.com"
              autoComplete="username"
              disabled={otpSent}
              {...register('identifier', { required: 'Phone number or email is required' })}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive mt-1">{errors.identifier.message}</p>
            )}
          </div>

          {!otpSent ? (
            <Button onClick={onRequestOTP} className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2" /> : null}
              Send OTP
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onOTPLogin)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to your {otpChannel === 'email' ? 'email' : 'phone'}.
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block">OTP Code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...register('otp', {
                    required: 'OTP is required',
                    pattern: { value: /^\d+$/, message: 'OTP must contain digits only' },
                  })}
                />
                {errors.otp && (
                  <p className="text-sm text-destructive mt-1">{errors.otp.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Verify OTP
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setOtpSent(false); setError(''); }}
              >
                Resend OTP
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
      </div>
    </div>
  );
}
