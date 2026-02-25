import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { authAPI, userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const phone = watch('phone');

  const onPasswordLogin = async (data) => {
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({
        phone: data.phone,
        password: data.password,
      });

      const { token } = response.data.data;
      
      // Get user profile
      const userResponse = await userAPI.getProfile();
      const user = userResponse.data.data;

      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRequestOTP = async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authAPI.requestOTP({ phone });
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
      const response = await authAPI.verifyOTP({
        phone: data.phone,
        otp: data.otp,
      });

      const { token } = response.data.data;
      
      // Get user profile
      const userResponse = await userAPI.getProfile();
      const user = userResponse.data.data;

      setAuth(user, token);
      navigate('/dashboard');
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
        <p className="text-muted-foreground mt-2">
          Sign in to your account to continue
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setOtpMode(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !otpMode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setOtpMode(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            otpMode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          OTP
        </button>
      </div>

      {!otpMode ? (
        <form onSubmit={handleSubmit(onPasswordLogin)} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <Input
              type="tel"
              placeholder="+254712345678"
              {...register('phone', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^\+(?:254|1)\d{5,18}$/,
                  message: 'Phone must start with +254 (Kenya) or +1 (USA)'
                }
              })}
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
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
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <Input
              type="tel"
              placeholder="+254712345678"
              {...register('phone', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^\+(?:254|1)\d{5,18}$/,
                  message: 'Phone must start with +254 (Kenya) or +1 (USA)'
                }
              })}
              disabled={otpSent}
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>

          {!otpSent ? (
            <Button onClick={onRequestOTP} className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2" /> : null}
              Send OTP
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onOTPLogin)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">OTP Code</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...register('otp', {
                    required: 'OTP is required',
                    pattern: {
                      value: /^\d+$/,
                      message: 'OTP must contain digits only',
                    },
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
                onClick={() => setOtpSent(false)}
              >
                Resend OTP
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link to="/register" className="text-primary hover:underline font-medium">
          Register
        </Link>
      </div>
    </div>
  );
}
