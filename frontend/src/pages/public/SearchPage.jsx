import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { searchAPI } from '@/lib/api';
import { truncate } from '@/lib/utils';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [searchParams]);

  // Debounce filter changes → update URL params (triggers loadBusinesses)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category) params.set('category', filters.category);
      if (filters.region) params.set('region', filters.region);
      setSearchParams(params, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const loadMetadata = async () => {
    try {
      const [categoriesRes, regionsRes] = await Promise.all([
        searchAPI.getCategories(),
        searchAPI.getRegions(),
      ]);
      setCategories(categoriesRes.data.data.categories || []);
      setRegions(regionsRes.data.data.regions || []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const params = {
        q: searchParams.get('q') || undefined,
        category: searchParams.get('category') || undefined,
        region: searchParams.get('region') || undefined,
        page: searchParams.get('page') || 1,
        limit: 20,
      };
      const response = await searchAPI.search(params);
      setBusinesses(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  return (
    <div className="py-8">
      <div className="container-safe">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    type="text"
                    placeholder="Keywords..."
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Region</label>
                  <Select
                    value={filters.region}
                    onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                  >
                    <option value="">All Regions</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Search Results</h1>
              <p className="text-muted-foreground">
                {loading ? 'Searching...' : `Found ${pagination.total} businesses`}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : businesses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No businesses found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {businesses.map((business) => {
                    const logoSlug = business.media?.logo;
                    const logoUrl = logoSlug && business.business_tag
                      ? `/media/${business.business_tag}_${business.business_id}/logo/${logoSlug}_icon.webp`
                      : null;
                    return (
                    <Link key={business.business_id} to={`/business/${business.business_id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-3">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={business.business_name}
                                className="h-12 w-12 rounded-lg object-cover shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg font-bold text-muted-foreground">
                                {business.business_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold mb-2">
                                {business.business_name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {business.region}
                                </div>
                                <Badge variant="outline">{business.category}</Badge>
                                {business.verification_tier !== 'basic' && (
                                  <Badge variant="success">
                                    <Star className="h-3 w-3 mr-1" />
                                    {business.verification_tier}
                                  </Badge>
                                )}
                                {business.has_active_ads && (
                                  <Badge variant="secondary">Featured</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-muted-foreground">
                            {truncate(business.description, 200)}
                          </p>
                          {business.phone && (
                            <p className="text-sm text-muted-foreground mt-2">
                              📞 {business.phone}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                    );
                  })}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-4">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
