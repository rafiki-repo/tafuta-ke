import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Globe, X, Wrench, ShoppingBag, ExternalLink, CalendarPlus, ShoppingCart } from "lucide-react";
import { useCart, BookingModal, CartDrawer, CartFab } from "./_booking";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const DAY_ALIAS = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

function resolveHours(h, day) {
  return h?.[day] ?? h?.[DAY_ALIAS[day]] ?? null;
}

function primaryImage(images, type, primary, sizeTag) {
  const list = images?.[type] || [];
  if (!list.length) return null;
  const slug = primary?.[type];
  const img = (slug && list.find(i => i.slug === slug)) || list[0];
  const sizes = img?.sizes || {};
  return sizes[sizeTag] || Object.values(sizes)[0] || null;
}

function CatalogCard({ item, isProduct, onAddToCart }) {
  const imgUrl = item.image_url || item.image || null;
  const PlaceholderIcon = isProduct ? ShoppingBag : Wrench;
  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-orange-500/40 transition-colors">
      {imgUrl ? (
        <div className="w-full aspect-[4/3] bg-gray-800 flex items-center justify-center overflow-hidden">
          <img src={imgUrl} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gray-800 flex items-center justify-center">
          <PlaceholderIcon className="h-10 w-10 text-gray-600" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-white leading-snug">{item.name}</p>
          {item.price && (
            <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              KES {item.price}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white border border-gray-700 hover:bg-orange-500 hover:border-orange-500 py-1.5 rounded-lg transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

export default function SiteBold({ business }) {
  const {
    business_name = "",
    logo_url,
    category,
    region,
    profile = {},
    contact = {},
    location = {},
    hours,
    images = {},
    media_primary = {},
    products = [],
  } = business;

  const [lightbox, setLightbox] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  const services = products.filter(p => (p.type || "service") === "service");
  const productItems = products.filter(p => p.type === "product");

  const bannerUrl =
    primaryImage(images, "banner", media_primary, "1200x400") ||
    primaryImage(images, "profile", media_primary, "large");
  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];
  const waNumber = contact.whatsapp?.replace(/\D/g, "") || contact.phone?.replace(/\D/g, "");
  const hasHours = hours && Object.keys(hours).length > 0;
  const locationStr = [location.street_address, location.city].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <header className="relative px-6 py-16 text-center overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        ) : null}
        <div className={`relative z-10 -m-6 p-16 ${!bannerUrl ? "bg-gradient-to-br from-orange-600 to-orange-500" : ""}`}>
          {logoImgUrl && (
            <img
              src={logoImgUrl}
              alt={business_name}
              className="h-24 w-24 rounded-full object-cover border-4 border-white/30 mx-auto mb-6 shadow-xl"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{business_name}</h1>
          {profile.tagline && <p className="mt-3 text-lg text-white/80 max-w-lg mx-auto">{profile.tagline}</p>}
          {(category || region) && (
            <div className="mt-4 flex justify-center gap-3 flex-wrap">
              {category && <span className="bg-white/20 rounded-full px-3 py-1 text-sm capitalize">{category}</span>}
              {region && <span className="bg-white/20 rounded-full px-3 py-1 text-sm">{region}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ── CONTACT BAR ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 font-medium whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <Phone className="h-3.5 w-3.5" />{contact.phone}
            </a>
          )}
          {(contact.whatsapp || contact.phone) && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <MessageCircle className="h-3.5 w-3.5" />WhatsApp
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <Mail className="h-3.5 w-3.5" />{contact.email}
            </a>
          )}
          {locationStr && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 whitespace-nowrap px-3 py-1.5 shrink-0">
              <MapPin className="h-3.5 w-3.5" />{locationStr}
            </span>
          )}
        </div>
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12 pb-24 md:pb-12">

        {/* About */}
        {profile.description && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">{profile.description}</p>
          </section>
        )}

        {/* Services */}
        {services.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4">Our Services</h2>
            <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
              {services.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-gray-400 truncate">{p.description}</p>
                    )}
                  </div>
                  {p.price && (
                    <span className="text-sm font-bold text-orange-400 shrink-0">KES {p.price}</span>
                  )}
                  {waNumber && (
                    <button
                      type="button"
                      onClick={() => setBookingService(p)}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-orange-500 hover:bg-orange-400 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Book
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        {productItems.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4">Products</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {productItems.map(p => (
                <CatalogCard key={p.id} item={p} isProduct={true} onAddToCart={waNumber ? cart.addItem : null} />
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryItems.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {galleryItems.map(img => {
                const url = img.sizes?.large || img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes || {})[0];
                const thumb = img.sizes?.medium || img.sizes?.thumb || url;
                return url ? (
                  <button
                    key={img.slug}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="block aspect-square overflow-hidden rounded-lg group"
                  >
                    <img
                      src={thumb}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                      loading="lazy"
                    />
                  </button>
                ) : null;
              })}
            </div>
          </section>
        )}

        {/* Hours + Location */}
        {(hasHours || location.city) && (
          <div className="grid sm:grid-cols-2 gap-8">
            {hasHours && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">Business Hours</h2>
                <div className="space-y-1.5">
                  {DAYS.map(day => {
                    const info = resolveHours(hours, day);
                    if (!info) return null;
                    const isClosed = typeof info === "object" && info.is_open === false;
                    const timeStr = typeof info === "string"
                      ? info.replace("-", " – ")
                      : `${info.open || "08:00"} – ${info.close || "17:00"}`;
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="text-gray-500 w-10">{DAY_SHORT[day]}</span>
                        {isClosed
                          ? <span className="text-gray-700">Closed</span>
                          : <span className="text-gray-300 font-medium">{timeStr}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {location.city && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">Location</h2>
                <div className="space-y-1.5 text-sm text-gray-300">
                  {location.street_address && <p>{location.street_address}</p>}
                  {(location.city || location.region) && (
                    <p>{[location.city, location.region].filter(Boolean).join(", ")}</p>
                  )}
                  {profile.how_to_find && (
                    <p className="text-gray-500 text-xs mt-2 leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([location.street_address, location.city, location.region].filter(Boolean).join(", "))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Google Maps
                  </a>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Contact */}
        {(contact.phone || contact.whatsapp || contact.email || contact.website) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4">Get in Touch</h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {contact.phone && (
                <a href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-orange-500/50 transition-colors">
                  <Phone className="h-4 w-4 text-orange-400" />
                  {contact.phone}
                </a>
              )}
              {(contact.whatsapp || contact.phone) && (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-white bg-green-600 rounded-xl px-4 py-3 hover:bg-green-500 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-orange-500/50 transition-colors">
                  <Mail className="h-4 w-4 text-orange-400" />
                  {contact.email}
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-orange-500/50 transition-colors">
                  <Globe className="h-4 w-4 text-orange-400" />
                  {contact.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ── CART FAB ─────────────────────────────────────────────────────── */}
      <CartFab itemCount={cart.itemCount} onClick={() => setCartOpen(true)} />

      {/* ── BOOKING MODAL ────────────────────────────────────────────────── */}
      {bookingService && waNumber && (
        <BookingModal
          service={bookingService}
          businessName={business_name}
          waNumber={waNumber}
          onClose={() => setBookingService(null)}
        />
      )}

      {/* ── CART DRAWER ──────────────────────────────────────────────────── */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          businessName={business_name}
          waNumber={waNumber}
          onClose={() => setCartOpen(false)}
        />
      )}

      {/* ── MOBILE STICKY CTA ────────────────────────────────────────────── */}
      {(contact.phone || waNumber) && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-gray-900 border-t border-gray-800 px-3 py-2.5 flex gap-2 z-30">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm active:scale-95 transition-transform">
              <Phone className="h-4 w-4" />Call
            </a>
          )}
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold text-sm active:scale-95 transition-transform">
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
        </div>
      )}

      {/* ── LIGHTBOX ─────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 rounded-full p-2"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <footer className="border-t border-gray-800 text-center text-xs text-gray-600 py-5 pb-20 md:pb-5">
        Listed on{" "}
        <a href="https://tafuta.ke" className="text-gray-500 underline hover:text-gray-300">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
