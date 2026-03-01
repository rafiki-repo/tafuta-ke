import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { businessAPI } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';

export default function BusinessDetailPage() {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBusiness();
  }, [id]);

  const loadBusiness = async () => {
    try {
      const response = await businessAPI.get(id);
      setBusiness(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="container-safe flex justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="py-12">
        <div className="container-safe max-w-2xl">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Business not found'}</AlertDescription>
          </Alert>
          <Link to="/search" className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const content = business.content_json || {};
  const profile = content.profile?.en || {};
  const contact = content.contact || {};
  const location = content.location || {};

  // PRD-07 media helpers
  const mediaBase = business.business_tag && business.business_id
    ? `/media/${business.business_tag}_${business.business_id}`
    : null;
  const media = content.media || {};
  const bannerSlug = Array.isArray(media.banner) ? media.banner[0] : null;
  const bannerUrl = mediaBase && bannerSlug
    ? `${mediaBase}/banner/${bannerSlug}_600x200.webp`
    : null;
  const logoSlug = typeof media.logo === 'string' ? media.logo : null;
  const logoUrl = mediaBase && logoSlug
    ? `${mediaBase}/logo/${logoSlug}_medium.webp`
    : business.logo_url || null;
  const gallerySlugs = Array.isArray(media.gallery) ? media.gallery : [];

  return (
    <div className="py-8">
      <div className="container-safe">
        <Link to="/search" className="inline-block mb-6">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </Link>

        {/* Banner */}
        {bannerUrl && (
          <div className="mb-6 rounded-xl overflow-hidden h-40 sm:h-56">
            <img
              src={bannerUrl}
              alt={`${business.business_name} banner`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-3">
                      {business.business_name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="outline">{business.category}</Badge>
                      {business.verification_tier !== 'basic' && (
                        <Badge variant="success">
                          <Star className="h-3 w-3 mr-1" />
                          {business.verification_tier}
                        </Badge>
                      )}
                      <Badge variant={business.status === 'active' ? 'success' : 'secondary'}>
                        {business.status}
                      </Badge>
                    </div>
                  </div>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={business.business_name}
                      className="h-20 w-20 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">
                    {profile.description || 'No description available'}
                  </p>
                </div>

                {profile.services && profile.services.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Services</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {profile.services.map((service, idx) => (
                        <li key={idx}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.hours && (
                  <div>
                    <h3 className="font-semibold mb-2">Business Hours</h3>
                    <p className="text-muted-foreground">{profile.hours}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {business.subdomain && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Visit Our Website</h3>
                      <p className="text-sm text-muted-foreground">
                        {business.subdomain}.tafuta.ke
                      </p>
                    </div>
                    <a
                      href={`https://${business.subdomain}.tafuta.ke`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button>
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {gallerySlugs.length > 0 && mediaBase && (
              <Card>
                <CardHeader>
                  <CardTitle>Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gallerySlugs.map((slug) => (
                      <div key={slug} className="aspect-square rounded overflow-hidden bg-muted">
                        <img
                          src={`${mediaBase}/gallery/${slug}_thumb.webp`}
                          alt="Gallery"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="font-medium hover:text-primary"
                      >
                        {formatPhoneNumber(contact.phone)}
                      </a>
                    </div>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="font-medium hover:text-primary"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {contact.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Website</p>
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{business.region}</p>
                    {location.city && (
                      <p className="text-sm text-muted-foreground">{location.city}</p>
                    )}
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {location.address}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
