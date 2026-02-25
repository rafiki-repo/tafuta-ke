import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, CheckCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { authAPI, userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

const BENEFITS = [
  { title: 'Free Directory Listing', desc: 'Your business appears in search results at no cost' },
  { title: 'Reach More Customers', desc: 'Connect with people actively looking for your services' },
  { title: 'Easy to Manage', desc: 'Update your business info anytime from your phone' },
  { title: 'Boost with Promotions', desc: 'Optional paid features to stand out even more' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [registeredPhone, setRegisteredPhone] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { register: registerOtp, handleSubmit: handleSubmitOtp, formState: { errors: otpErrors } } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const cleanPhone = data.phone.replace(/[\s\-()]/g, '');
      await authAPI.register({
        full_name: data.full_name.trim(),
        phone: cleanPhone,
        email: data.email || undefined,
        password: data.password,
        terms_version: '1.0',
        privacy_version: '1.0',
      });
      setRegisteredPhone(cleanPhone);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data) => {
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ phone: registeredPhone, otp: data.otp });
      const { token } = response.data.data;
      localStorage.setItem('token', token);
      const userResponse = await userAPI.getProfile();
      setAuth(userResponse.data.data, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Step ──────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Verify Your Phone</h2>
          <p className="text-sm text-muted-foreground">
            Enter the OTP sent to{' '}
            <span className="font-semibold text-foreground">{registeredPhone}</span>
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border border-border/40 rounded-xl p-6">
          <form onSubmit={handleSubmitOtp(onVerifyOtp)} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">OTP Code</label>
              <Input
                type="text"
                placeholder="Enter OTP"
                inputMode="numeric"
                className="text-center text-xl tracking-widest"
                {...registerOtp('otp', {
                  required: 'OTP is required',
                  pattern: { value: /^\d+$/, message: 'OTP must contain digits only' },
                })}
              />
              {otpErrors.otp && (
                <p className="text-xs text-destructive mt-1">{otpErrors.otp.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner size="sm" className="mr-2" />}
              Verify & Continue
            </Button>
          </form>
        </div>

        <button
          onClick={() => { setStep('register'); setError(''); }}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          ← Back to registration
        </button>
      </div>
    );
  }

  // ── Registration Step ─────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">
          Get Your Business Noticed
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Join hundreds of businesses across Kenya. Listing is always free.
        </p>
      </div>

      {/* Benefit Cards */}
      <div className="space-y-3 mb-8">
        {BENEFITS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/40"
          >
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Registration Form */}
      <div className="bg-card border border-border/40 rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-1">Create Your Account</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Full Name</label>
            <Input
              type="text"
              placeholder="Jane Wambua"
              {...register('full_name', {
                validate: value => {
                  const t = value?.trim() || '';
                  if (!t) return 'Please enter your full name';
                  if (t.length < 2) return 'Name must be at least 2 characters';
                  return true;
                },
              })}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Phone Number</label>
            <Input
              type="tel"
              placeholder="+254 712 345 678"
              {...register('phone', {
                validate: value => {
                  const cleaned = (value?.trim() || '').replace(/[\s\-()]/g, '');
                  if (!cleaned) return 'Please enter your phone number';
                  if (!/^\+(?:254|1)\d{5,18}$/.test(cleaned))
                    return 'Phone must start with +254 (Kenya) or +1 (USA)';
                  return true;
                },
              })}
            />
            {errors.phone ? (
              <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Include country code, e.g. +254 712 345 678
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              type="email"
              placeholder="jane@example.com"
              {...register('email', {
                validate: value => {
                  const t = value?.trim() || '';
                  if (!t) return true;
                  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(t))
                    return 'Please enter a valid email address';
                  return true;
                },
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Password</label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              {...register('password', {
                validate: value => {
                  if (!value) return 'Please create a password';
                  if (value.length < 8) return 'Password must be at least 8 characters';
                  return true;
                },
              })}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Confirm Password</label>
            <Input
              type="password"
              placeholder="Repeat your password"
              {...register('confirm_password', {
                validate: value => {
                  if (!value) return 'Please confirm your password';
                  if (value !== password) return 'Passwords do not match';
                  return true;
                },
              })}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="terms"
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              {...register('terms', { required: 'You must accept the terms to continue' })}
            />
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I agree to the{' '}
              <a href="#" className="text-primary font-semibold hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary font-semibold hover:underline">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && (
            <p className="text-xs text-destructive">{errors.terms.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner size="sm" className="mr-2" />}
            Create Account
          </Button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <img src="/tafuta-logo.png" alt="Tafuta" className="h-6 mx-auto opacity-40" />
        <p className="text-xs text-muted-foreground/60 mt-2">eBiashara Rahisi Ltd</p>
      </div>
    </div>
  );
}
