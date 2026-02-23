import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { userAPI } from '@/lib/api';

export default function MyBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const response = await userAPI.getBusinesses();
      setBusinesses(response.data.data.businesses || []);
    } catch (error) {
      console.error('Failed to load businesses:', error);
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : businesses.length === 0 ? (
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{business.business_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{business.category}</span>
                      <span>•</span>
                      <span>{business.region}</span>
                    </div>
                  </div>
                  <Badge variant={business.status === 'active' ? 'success' : 'secondary'}>
                    {business.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
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
