import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { authAPI, userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    try {
      // Clean phone number - remove spaces, dashes, parentheses
      const cleanPhone = data.phone.replace(/[\s\-()]/g, '');
      
      const response = await authAPI.register({
        full_name: data.full_name.trim(),
        phone: cleanPhone,
        email: data.email || undefined,
        password: data.password,
        terms_version: '1.0',
        privacy_version: '1.0',
      });

      const { token } = response.data.data;
      
      // Get user profile
      const userResponse = await userAPI.getProfile();
      const user = userResponse.data.data;

      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create an account</h2>
        <p className="text-muted-foreground mt-2">
          Join Tafuta and grow your business
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Full Name</label>
          <Input
            type="text"
            placeholder="John Doe"
            {...register('full_name', { 
              validate: value => {
                const trimmed = value?.trim() || '';
                if (trimmed === '') return 'Please enter your full name';
                if (trimmed.length < 2) return 'Name must be at least 2 characters';
                return true;
              }
            })}
          />
          {errors.full_name && (
            <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Phone Number</label>
          <Input
            type="tel"
            placeholder="+254712345678"
            {...register('phone', { 
              validate: value => {
                const trimmed = value?.trim() || '';
                if (trimmed === '') return 'Please enter your phone number';
                
                // Remove spaces, dashes, parentheses for validation
                const cleaned = trimmed.replace(/[\s\-()]/g, '');
                
                if (!cleaned.startsWith('+')) {
                  return 'Phone number must start with + (e.g., +254712345678)';
                }
                
                if (!/^\+\d{10,15}$/.test(cleaned)) {
                  return 'Invalid phone format. Use: +[country code][number] (e.g., +254712345678)';
                }
                
                return true;
              }
            })}
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Include country code. Spaces and dashes are OK (e.g., +254 712 345 678)
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Email <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            type="email"
            placeholder="john@example.com"
            {...register('email', {
              validate: value => {
                const trimmed = value?.trim() || '';
                if (trimmed === '') return true; // Optional field
                
                if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) {
                  return 'Please enter a valid email address (e.g., name@example.com)';
                }
                
                return true;
              }
            })}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Password</label>
          <Input
            type="password"
            placeholder="Create a password"
            {...register('password', { 
              validate: value => {
                if (!value || value === '') return 'Please create a password';
                if (value.length < 8) return 'Password must be at least 8 characters long';
                return true;
              }
            })}
          />
          {errors.password && (
            <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Confirm Password</label>
          <Input
            type="password"
            placeholder="Confirm your password"
            {...register('confirm_password', { 
              validate: value => {
                if (!value || value === '') return 'Please confirm your password';
                if (value !== password) return 'Passwords do not match. Please try again';
                return true;
              }
            })}
          />
          {errors.confirm_password && (
            <p className="text-sm text-destructive mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            className="mt-1"
            {...register('terms', { 
              required: 'You must accept the terms and conditions'
            })}
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground">
            I agree to the{' '}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-destructive">{errors.terms.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner size="sm" className="mr-2" /> : null}
          Create Account
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}
