import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const ref = params.get('ref');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Payment Successful</h1>
          <p className="text-muted-foreground mt-2">
            Your payment was received and your services are now active.
          </p>
          {ref && (
            <p className="text-xs text-muted-foreground mt-2">
              Reference: <span className="font-mono">{ref}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard/payments">
            <Button>View Payments</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Your receipt will be available in the Payments section shortly.
          If your services have not activated within a few minutes, please contact support.
        </p>
      </div>
    </div>
  );
}
