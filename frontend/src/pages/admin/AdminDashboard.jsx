import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { BusinessGrowthChart } from '@/components/admin/BusinessGrowthChart';
import { adminAPI } from '@/lib/api';

export default function AdminDashboard() {
  const [totalActive, setTotalActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAPI.getAnalytics();
        if (!cancelled) setTotalActive(res.data.data.totals.businesses);
      } catch {
        if (!cancelled) setError('Failed to load dashboard stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <Card className="max-w-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total active businesses
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading && <Spinner size="sm" />}
          {!loading && error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && (
            <p className="text-3xl font-semibold">{totalActive.toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      <BusinessGrowthChart variant="compact" />
    </div>
  );
}
