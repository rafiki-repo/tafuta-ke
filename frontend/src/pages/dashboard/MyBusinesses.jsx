import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { userAPI } from '@/lib/api';

const statusVariant = {
  active: 'success',
  pending: 'warning',
  deactivated: 'secondary',
  suspended: 'destructive',
  out_of_business: 'secondary',
  deleted: 'destructive',
};

const statusLabel = {
  active: 'Active',
  pending: 'Pending',
  deactivated: 'Deactivated',
  suspended: 'Suspended',
  out_of_business: 'Closed',
  deleted: 'Deleted',
};

const roleVariant = {
  owner: 'default',
  admin: 'secondary',
  employee: 'outline',
};

export default function MyBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setError(null);
      const response = await userAPI.getBusinesses();
      setBusinesses(response.data.data.businesses || []);
    } catch {
      setError('Failed to load your businesses. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Businesses</h1>
          <p className="text-muted-foreground">Manage all your business listings</p>
        </div>
        <Link to="/dashboard/businesses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : businesses.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first business
            </p>
            <Link to="/dashboard/businesses/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Business
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businesses.map((business) => (
            <Card key={business.business_id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mb-1 truncate">{business.business_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{business.category}</span>
                      <span>•</span>
                      <span>{business.region}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={statusVariant[business.status] || 'secondary'}>
                      {statusLabel[business.status] || business.status}
                    </Badge>
                    {business.user_role && (
                      <Badge variant={roleVariant[business.user_role] || 'outline'} className="text-xs">
                        {business.user_role}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {business.status === 'pending' && (
                  <p className="text-xs text-yellow-700 mb-3">
                    Awaiting admin approval before appearing in search results.
                  </p>
                )}
                {business.subdomain && (
                  <p className="text-xs text-muted-foreground font-mono mb-3">
                    {business.subdomain}.{business.region?.toLowerCase()}.tafuta.ke
                  </p>
                )}
                <div className="flex gap-2">
                  <Link to={`/dashboard/businesses/${business.business_id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">Edit</Button>
                  </Link>
                  <Link to={`/dashboard/businesses/${business.business_id}/history`}>
                    <Button variant="ghost">History</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
