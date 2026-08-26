import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, CheckCircle2, Store,
  Camera, Scissors, UtensilsCrossed, Cpu, Wrench,
  ShoppingCart, Shirt, Car, Heart, Dumbbell, BookOpen, Music,
  Megaphone,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { searchAPI } from '@/lib/api';

const CATEGORY_ICONS = {
  salon: Scissors,
  salons: Scissors,
  restaurant: UtensilsCrossed,
  restaurants: UtensilsCrossed,
  'food & beverage': UtensilsCrossed,
  cyber: Cpu,
  technology: Cpu,
  studio: Camera,
  hardware: Wrench,
  'household and electronics': ShoppingCart,
  grocery: ShoppingCart,
  groceries: ShoppingCart,
  tailor: Shirt,
  tailors: Shirt,
  mechanic: Car,
  mechanics: Car,
  pharmacy: Heart,
  pharmacies: Heart,
  gym: Dumbbell,
  bookshop: BookOpen,
  bookshops: BookOpen,
  entertainment: Music,
};

function getCategoryIcon(name) {
  return CATEGORY_ICONS[name?.toLowerCase()] || Store;
}

function BusinessCard({ business }) {
  const navigate = useNavigate();
  const initial = business.business_name?.charAt(0)?.toUpperCase() || '?';
  const isPremium = business.verification_tier && business.verification_tier !== 'basic';
  const logoSlug = business.media?.logo;
  const logoUrl =
    logoSlug && business.business_tag
      ? `/media/${business.business_tag}/logo/${logoSlug}_icon.webp`
      : null;

  return (
    <div
      className="flex gap-3 p-3 rounded-lg border border-border/40 bg-card cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
      onClick={() => navigate(`/business/${business.business_id}`)}
    >
      <div className="w-20 h-20 rounded-md flex-shrink-0 relative">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={business.business_name}
            className="w-full h-full rounded-md object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="w-full h-full rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
          style={logoUrl ? { display: 'none' } : undefined}
        >
          <span className="text-2xl font-bold text-primary/60">{initial}</span>
        </div>
        {isPremium && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1 mb-1">
          <h3 className="font-bold text-sm text-foreground truncate">
            {business.business_name}
          </h3>
          {isPremium && (
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-1.5">
          {business.is_featured && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 font-medium border-0">
              ★ Top Pick
            </Badge>
          )}
          {business.has_active_ads && (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary font-medium border-0">
              Featured
            </Badge>
          )}
        </div>

        {business.region && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{business.region}</span>
          </div>
        )}

        {business.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {business.description}
          </p>
        )}
      </div>
    </div>
  );
}

function AdCard({ ad }) {
  const content = (
    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground mb-1">{ad.headline}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{ad.body}</p>
          {ad.cta && (
            <p className="text-xs font-semibold text-primary mt-2">{ad.cta} →</p>
          )}
        </div>
      </div>
    </div>
  );

  if (ad.link) {
    return <Link to={ad.link}>{content}</Link>;
  }
  return content;
}

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setData(null);
    searchAPI.getCategoryPage(slug)
      .then(res => setData(res.data.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-xl mx-auto text-center">
          <Store className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Category not found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This category doesn't exist or has been removed.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { category, total, businesses, ads } = data;
  const CategoryIcon = getCategoryIcon(category);
  const searchUrl = `/search?category=${encodeURIComponent(category)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-b from-primary to-[#D43D15] px-4 pt-6 pb-8">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                {category}
              </h1>
              <p className="text-white/75 text-sm mt-0.5">
                {total === 0
                  ? 'No businesses listed yet'
                  : `${total} business${total === 1 ? '' : 'es'} listed`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">
        {/* Featured / pinned businesses */}
        {businesses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">Featured Businesses</h2>
              <Badge variant="secondary" className="text-xs">★ Top Picks</Badge>
            </div>
            <div className="space-y-3">
              {businesses.map(b => (
                <BusinessCard key={b.business_id} business={b} />
              ))}
            </div>
          </section>
        )}

        {/* View all link */}
        {total > 3 && (
          <Link
            to={searchUrl}
            className="flex items-center justify-center gap-1.5 py-3 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
          >
            View all {total} {category} businesses →
          </Link>
        )}

        {/* Promotional ads */}
        {ads.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-foreground mb-3">Promotions</h2>
            <div className="space-y-3">
              {ads.map(ad => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          </section>
        )}

        {/* Register CTA if no businesses */}
        {total === 0 && (
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Register your business free
          </Link>
        )}
      </div>
    </div>
  );
}
