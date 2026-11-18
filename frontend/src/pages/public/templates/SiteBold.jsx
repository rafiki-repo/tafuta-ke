import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Globe, Wrench, ShoppingBag, ExternalLink, ShoppingCart, Heart } from "lucide-react";
import { hasMapLocation, mapEmbedUrl, mapLinkUrl } from "@/lib/location";
import { colorVars, resolveColors } from "@/lib/palette";
import { PhotoLightbox } from "./_lightbox";
import { CalendarPlus } from "lucide-react";
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

function CatalogCard({ item, isProduct, onAddToCart, onImageClick }) {
  const imgUrl = item.image_url || item.image || null;
  const PlaceholderIcon = isProduct ? ShoppingBag : Wrench;
  return (
    <div className="rounded-xl overflow-hidden bg-[var(--c-panel)] border border-[var(--c-line)] hover:border-[color-mix(in_srgb,var(--c-accent)_40%,transparent)] transition-colors">
      {imgUrl ? (
        <button
          type="button"
          onClick={() => onImageClick(imgUrl)}
          className="w-full aspect-[4/3] bg-[var(--c-tile)] flex items-center justify-center overflow-hidden"
        >
          <img src={imgUrl} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
        </button>
      ) : (
        <div className="w-full aspect-[4/3] bg-[var(--c-tile)] flex items-center justify-center">
          <PlaceholderIcon className="h-10 w-10 text-[var(--c-faint)]" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-[var(--c-text)] leading-snug">{item.name}</p>
          {item.price && (
            <span className="text-xs font-bold text-[var(--c-highlight)] bg-[color-mix(in_srgb,var(--c-highlight)_10%,transparent)] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              KES {item.price}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-[var(--c-soft)] mt-1 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--c-text)] border border-[var(--c-lineStrong)] hover:bg-[var(--c-accent)] hover:border-[var(--c-accent)] hover:text-[var(--c-accentText)] py-1.5 rounded-lg transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

export default function SiteBold({ business, palette }) {
  const {
    business_name = "",
    logo_url,
    category,
    region,
    locally_owned,
    profile = {},
    contact = {},
    location = {},
    hours,
    images = {},
    media_primary = {},
    products = [],
    commerce_enabled = false,
  } = business;

  const [lightbox, setLightbox] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  const colors = colorVars(resolveColors(palette, "bold"));
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
    <div className="min-h-screen bg-[var(--c-base)] text-[var(--c-text)] font-sans" style={colors}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <header className="relative px-6 py-16 text-center overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        ) : null}
        <div className={`relative z-10 -m-6 p-16 ${!bannerUrl ? "bg-gradient-to-br from-[var(--c-heroFrom)] to-[var(--c-heroTo)]" : ""}`}>
          {logoImgUrl && (
            <img
              src={logoImgUrl}
              alt={business_name}
              className="h-24 w-24 rounded-full object-cover border-4 border-white/30 mx-auto mb-6 shadow-xl"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{business_name}</h1>
          {profile.tagline && <p className="mt-3 text-lg text-[color-mix(in_srgb,var(--c-text)_80%,transparent)] max-w-lg mx-auto">{profile.tagline}</p>}
          {(category || region || locally_owned) && (
            <div className="mt-4 flex justify-center gap-3 flex-wrap">
              {locally_owned && (
                <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-sm font-semibold">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  Locally Owned
                </span>
              )}
              {category && <span className="bg-white/20 rounded-full px-3 py-1 text-sm capitalize">{category}</span>}
              {region && <span className="bg-white/20 rounded-full px-3 py-1 text-sm">{region}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ── CONTACT BAR ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--c-panel)] border-b border-[var(--c-line)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 text-sm text-[var(--c-highlight)] hover:text-[var(--c-highlightHover)] font-medium whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
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
              className="flex items-center gap-1.5 text-sm text-[var(--c-highlight)] hover:text-[var(--c-highlightHover)] whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <Mail className="h-3.5 w-3.5" />{contact.email}
            </a>
          )}
          {locationStr && (
            <span className="flex items-center gap-1.5 text-sm text-[var(--c-muted)] whitespace-nowrap px-3 py-1.5 shrink-0">
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-3">About</h2>
            <p className="text-[var(--c-body)] leading-relaxed text-lg whitespace-pre-line">{profile.description}</p>
          </section>
        )}

        {/* Services */}
        {services.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-4">Our Services</h2>
            <div className="divide-y divide-[var(--c-line)] rounded-xl border border-[var(--c-line)] overflow-hidden">
              {services.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--c-panel)] hover:bg-[var(--c-panelHover)] transition-colors">
                  {p.image_url ? (
                    <button type="button" onClick={() => setLightbox(p.image_url)} className="shrink-0">
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                    </button>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-[var(--c-tile)] border border-[var(--c-lineStrong)] flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4 text-[var(--c-muted)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-text)] truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-[var(--c-soft)] truncate">{p.description}</p>
                    )}
                  </div>
                  {p.price && (
                    <span className="text-sm font-bold text-[var(--c-highlight)] shrink-0">KES {p.price}</span>
                  )}
                  {commerce_enabled && waNumber && (
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-4">Products</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {productItems.map(p => (
                <CatalogCard key={p.id} item={p} isProduct={true} onAddToCart={commerce_enabled ? cart.addItem : null} onImageClick={setLightbox} />
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryItems.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-4">Gallery</h2>
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
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-3">Business Hours</h2>
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
                        <span className="text-[var(--c-muted)] w-10">{DAY_SHORT[day]}</span>
                        {isClosed
                          ? <span className="text-[var(--c-lineStrong)]">Closed</span>
                          : <span className="text-[var(--c-body)] font-medium">{timeStr}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {(location.city || hasMapLocation(location)) && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-3">Location</h2>
                <div className="space-y-1.5 text-sm text-[var(--c-body)]">
                  {location.street_address && <p>{location.street_address}</p>}
                  {(location.city || location.region) && (
                    <p>{[location.city, location.region].filter(Boolean).join(", ")}</p>
                  )}
                  {profile.how_to_find && (
                    <p className="text-[var(--c-muted)] text-xs mt-2 leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
                  )}
                  {hasMapLocation(location) && (
                    <>
                      <div className="rounded overflow-hidden border border-[var(--c-line)]">
                        <iframe
                          title="Location map"
                          width="100%"
                          height="220"
                          style={{ border: 0 }}
                          loading="lazy"
                          src={mapEmbedUrl(location)}
                        />
                      </div>
                      <a
                        href={mapLinkUrl(location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--c-highlight)] hover:text-[var(--c-highlightHover)] mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in Google Maps
                      </a>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Contact */}
        {(contact.phone || contact.whatsapp || contact.email || contact.website) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--c-accent)] mb-4">Get in Touch</h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {contact.phone && (
                <a href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)] bg-[var(--c-tile)] border border-[var(--c-lineStrong)] rounded-xl px-4 py-3 hover:border-[color-mix(in_srgb,var(--c-accent)_50%,transparent)] transition-colors">
                  <Phone className="h-4 w-4 text-[var(--c-highlight)]" />
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
                  className="flex items-center gap-2 text-sm text-[var(--c-body)] bg-[var(--c-tile)] border border-[var(--c-lineStrong)] rounded-xl px-4 py-3 hover:border-[color-mix(in_srgb,var(--c-accent)_50%,transparent)] transition-colors">
                  <Mail className="h-4 w-4 text-[var(--c-highlight)]" />
                  {contact.email}
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--c-soft)] bg-[var(--c-tile)] border border-[var(--c-lineStrong)] rounded-xl px-4 py-3 hover:border-[color-mix(in_srgb,var(--c-accent)_50%,transparent)] transition-colors">
                  <Globe className="h-4 w-4 text-[var(--c-highlight)]" />
                  {contact.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {commerce_enabled && <CartFab itemCount={cart.itemCount} onClick={() => setCartOpen(true)} />}

      {bookingService && waNumber && (
        <BookingModal
          service={bookingService}
          businessName={business_name}
          waNumber={waNumber}
          onClose={() => setBookingService(null)}
        />
      )}

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
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[var(--c-panel)] border-t border-[var(--c-line)] px-3 py-2.5 flex gap-2 z-30">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--c-accent)] text-[var(--c-accentText)] font-bold text-sm active:scale-95 transition-transform">
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

      {/* ── PHOTO LIGHTBOX ──────────────────────────────────────────────── */}
      {lightbox && <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <footer className="border-t border-[var(--c-line)] text-center text-xs text-[var(--c-faint)] py-5 pb-20 md:pb-5">
        Listed on{" "}
        <a href="https://tafuta.ke" className="text-[var(--c-muted)] underline hover:text-[var(--c-body)]">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
