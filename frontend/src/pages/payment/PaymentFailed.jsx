import { useSearchParams, Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PaymentFailed() {
  const [params] = useSearchParams();
  const ref = params.get('ref');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-destructive" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="text-muted-foreground mt-2">
            Your payment could not be completed. You have not been charged.
          </p>
          {ref && (
            <p className="text-xs text-muted-foreground mt-2">
              Reference: <span className="font-mono">{ref}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard/payments">
            <Button>Try Again</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          If you believe this is an error or were charged, please contact support with your reference number.
        </p>
      </div>
    </div>
  );
}
