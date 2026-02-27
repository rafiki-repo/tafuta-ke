import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin,
  Scissors, UtensilsCrossed, Cpu, Wrench, ShoppingCart,
  Shirt, Car, Heart, Dumbbell, BookOpen, Music, Store, CheckCircle2,
} from 'lucide-react';

function BinocularsIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="15" r="4" />
      <circle cx="18" cy="15" r="4" />
      <path d="M10 15h4" />
      <path d="M2 11l2-5h3l3 5" />
      <path d="M22 11l-2-5h-3l-3 5" />
      <path d="M10 6h4" />
    </svg>
  );
}
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { searchAPI } from '@/lib/api';

// Icon map keyed by lowercase category name
const CATEGORY_ICONS = {
  salon: Scissors,
  salons: Scissors,
  restaurant: UtensilsCrossed,
  restaurants: UtensilsCrossed,
  'food & beverage': UtensilsCrossed,
  cyber: Cpu,
  hardware: Wrench,
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

  return (
    <div
      className="flex gap-3 p-3 rounded-lg border border-border/40 bg-card cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
      onClick={() => navigate(`/business/${business.business_id}`)}
    >
      {/* Avatar */}
      <div className="w-20 h-20 rounded-md flex-shrink-0 relative">
        <div className="w-full h-full rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary/60">{initial}</span>
        </div>
        {isPremium && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Details */}
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
          {business.category && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
              {business.category}
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

        {business.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>📞 {business.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);

  const isFirstRender = useRef(true);

  useEffect(() => {
    loadMeta();
  }, []);

  // Initial businesses load
  useEffect(() => {
    loadBusinesses(searchQuery, selectedCategory, selectedRegion);
  }, []);

  // Debounced re-fetch when filters change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadBusinesses(searchQuery, selectedCategory, selectedRegion);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedRegion]);

  const loadMeta = async () => {
    try {
      const [categoriesRes, regionsRes] = await Promise.all([
        searchAPI.getCategories(),
        searchAPI.getRegions(),
      ]);
      setCategories(categoriesRes.data.data.categories || []);
      setRegions(regionsRes.data.data.regions || []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    } finally {
      setMetaLoading(false);
    }
  };

  const loadBusinesses = async (q, category, region) => {
    setBusinessesLoading(true);
    try {
      const params = {
        q: q || undefined,
        category: category || undefined,
        region: region || undefined,
        limit: 20,
      };
      const response = await searchAPI.search(params);
      setBusinesses(response.data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setBusinessesLoading(false);
    }
  };

  const toggleCategory = (cat) => {
    setSelectedCategory((prev) => (prev === cat ? '' : cat));
  };

  const toggleRegion = (region) => {
    setSelectedRegion((prev) => (prev === region ? '' : region));
  };

  const listingHeading = selectedCategory
    ? selectedCategory
    : selectedRegion
      ? `Businesses in ${selectedRegion}`
      : searchQuery
        ? `Results for "${searchQuery}"`
        : 'Popular Businesses';

  return (
    <div className="min-h-screen bg-background">
      {/* Orange Hero */}
      <section className="bg-gradient-to-b from-primary to-[#D43D15] px-4 pt-8 pb-10">
        <div className="max-w-xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BinocularsIcon className="w-8 h-8 text-white/90" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
            Find Businesses<br />Near You2
          </h1>
          <p className="text-white/80 text-sm mb-6 font-medium">
            Discover local businesses in Machakos, Kisumu, and beyond
          </p>

          {/* Pill Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search businesses, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white text-foreground text-sm font-medium border-0 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {/* Region Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedRegion('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !selectedRegion
                  ? 'bg-white text-primary shadow-md'
                  : 'bg-white/20 text-white/90 border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              All Regions
            </button>
            {regions.map((region) => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedRegion === region
                    ? 'bg-white text-primary shadow-md'
                    : 'bg-white/20 text-white/90 border border-white/20'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {region}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category Chips */}
      <section className="px-4 py-5 max-w-xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Categories
          </h2>
          <button
            onClick={() => setSelectedCategory('')}
            className={`text-xs font-semibold transition-colors ${
              !selectedCategory ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            All
          </button>
        </div>

        {metaLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[72px] h-[68px] rounded-xl bg-muted animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat);
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl min-w-[72px] transition-all flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-card border border-border/40 text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold whitespace-nowrap">{cat}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Business Listings */}
      <section className="px-4 pb-8 max-w-xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-foreground">{listingHeading}</h2>
          {!businessesLoading && businesses.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {businesses.length} found
            </Badge>
          )}
        </div>

        {businessesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/50">
                <div className="w-20 h-20 rounded-md bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12">
            <BinocularsIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No businesses found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Try a different search or category
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <BusinessCard key={business.business_id} business={business} />
            ))}
          </div>
        )}

        {/* Link to full search for more results */}
        {!businessesLoading && businesses.length >= 20 && (
          <div className="text-center mt-6">
            <Link
              to={`/search${searchQuery || selectedCategory || selectedRegion
                ? '?' + new URLSearchParams({
                    ...(searchQuery && { q: searchQuery }),
                    ...(selectedCategory && { category: selectedCategory }),
                    ...(selectedRegion && { region: selectedRegion }),
                  }).toString()
                : ''}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all results →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
