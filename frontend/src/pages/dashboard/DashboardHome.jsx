import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { userAPI } from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

export default function DashboardHome() {
  const { user } = useAuthStore();
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name}!</h1>
        <p className="text-muted-foreground">
          Manage your businesses and track your growth
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard/businesses/new">
            <Button className="w-full" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add New Business
            </Button>
          </Link>
          <Link to="/dashboard/payments">
            <Button variant="outline" className="w-full" size="lg">
              <CreditCard className="h-5 w-5 mr-2" />
              Make Payment
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Businesses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Businesses</CardTitle>
          <Link to="/dashboard/businesses">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8">
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
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.slice(0, 5).map((business) => (
                <div
                  key={business.business_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{business.business_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{business.category}</span>
                      <span>•</span>
                      <span>{business.region}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={business.status === 'active' ? 'success' : 'secondary'}>
                      {business.status}
                    </Badge>
                    <Link to={`/dashboard/businesses/${business.business_id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
