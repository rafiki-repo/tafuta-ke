import { useState } from "react";
import { Phone, MessageCircle, MapPin, Globe, Wrench, ShoppingBag, ExternalLink, ShoppingCart, Heart } from "lucide-react";
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

function InfoPill({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[color-mix(in_srgb,var(--c-text)_70%,transparent)]">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-[var(--c-text)] break-words">{value}</p>
    </div>
  );
}

function ItemCard({ item, isProduct, onAddToCart, onImageClick }) {
  const imgUrl = item.image_url || item.image || null;
  const PlaceholderIcon = isProduct ? ShoppingBag : Wrench;
  return (
    <div className="rounded-2xl overflow-hidden bg-[color-mix(in_srgb,var(--c-text)_10%,transparent)] border-2 border-[color-mix(in_srgb,var(--c-text)_25%,transparent)]">
      <button
        type="button"
        onClick={imgUrl ? () => onImageClick(imgUrl) : undefined}
        className="block w-full aspect-square bg-[color-mix(in_srgb,var(--c-text)_10%,transparent)] flex items-center justify-center overflow-hidden"
      >
        {imgUrl ? (
          <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <PlaceholderIcon className="h-10 w-10 text-[color-mix(in_srgb,var(--c-text)_40%,transparent)]" />
        )}
      </button>
      <div className="p-3 text-center">
        <p className="font-extrabold uppercase tracking-wide text-sm text-[var(--c-text)]">{item.name}</p>
        {item.price && (
          <span className="inline-block mt-1 text-xs font-bold text-[var(--c-highlight)] bg-[var(--c-pill)] px-2.5 py-0.5 rounded-full">
            KES {item.price}
          </span>
        )}
        {item.description && (
          <p className="text-xs text-[color-mix(in_srgb,var(--c-text)_70%,transparent)] mt-1 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--c-text)] border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] hover:bg-[var(--c-text)] hover:text-[var(--c-deep)] py-1.5 rounded-xl transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

export default function SiteVibrant({ business, palette }) {
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

  const colors = colorVars(resolveColors(palette, "vibrant"));
  const services = products.filter(p => (p.type || "service") === "service");
  const productItems = products.filter(p => p.type === "product");

  const heroUrl =
    primaryImage(images, "profile", media_primary, "large") ||
    primaryImage(images, "banner", media_primary, "1200x400");
  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];
  const storeStrip = galleryItems.slice(0, 3);
  const waNumber = contact.whatsapp?.replace(/\D/g, "") || contact.phone?.replace(/\D/g, "");
  const hasHours = hours && Object.keys(hours).length > 0;
  const locationStr = [location.street_address, location.city, location.region].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-text)] font-sans" style={colors}>
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 pb-24">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <header className="text-center px-2">
          {logoImgUrl && (
            <img
              src={logoImgUrl}
              alt={business_name}
              className="h-20 w-20 rounded-full object-cover border-4 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] mx-auto mb-4 shadow-xl"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">{business_name}</h1>
          {profile.tagline && <p className="mt-2 text-[color-mix(in_srgb,var(--c-text)_80%,transparent)]">{profile.tagline}</p>}
          {(category || region) && (
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              {category && <span className="bg-[color-mix(in_srgb,var(--c-text)_20%,transparent)] rounded-full px-3 py-1 text-xs font-semibold capitalize">{category}</span>}
              {region && <span className="bg-[color-mix(in_srgb,var(--c-text)_20%,transparent)] rounded-full px-3 py-1 text-xs font-semibold">{region}</span>}
            </div>
          )}
        </header>

        {/* ── HERO CARD: image + quick info ──────────────────────────────── */}
        <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-4 space-y-3">
          {heroUrl && (
            <button
              type="button"
              onClick={() => setLightbox(heroUrl)}
              className="block w-full rounded-2xl overflow-hidden border-4 border-[color-mix(in_srgb,var(--c-text)_20%,transparent)]"
            >
              <img src={heroUrl} alt={business_name} className="w-full aspect-[4/3] object-cover" />
            </button>
          )}
          <div className="space-y-2">
            {locally_owned && (
              <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] px-4 py-3 text-center flex items-center justify-center gap-2">
                <Heart className="h-4 w-4 fill-current shrink-0" />
                <p className="text-base font-extrabold uppercase tracking-wide text-[var(--c-text)]">Locally Owned Business</p>
              </div>
            )}
            <InfoPill label="Phone Number" value={contact.phone} />
            <InfoPill label="Location" value={[location.city, location.region || region].filter(Boolean).join(", ")} />
          </div>
        </section>

        {/* ── ABOUT / STORE ───────────────────────────────────────────────── */}
        {(profile.description || storeStrip.length > 0) && (
          <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-6 text-center space-y-3">
            <h2 className="text-xl font-black uppercase">Check Out Our Store!</h2>
            {storeStrip.length > 0 && (
              <div className="flex gap-1.5 rounded-2xl overflow-hidden border-4 border-[color-mix(in_srgb,var(--c-text)_20%,transparent)]">
                {storeStrip.map(img => {
                  const url = img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes || {})[0];
                  return url ? (
                    <img key={img.slug} src={url} alt={img.name} className="flex-1 aspect-square object-cover" loading="lazy" />
                  ) : null;
                })}
              </div>
            )}
            {profile.description && (
              <p className="font-bold leading-relaxed whitespace-pre-line">{profile.description}</p>
            )}
          </section>
        )}

        {/* ── SERVICES ────────────────────────────────────────────────────── */}
        {services.length > 0 && (
          <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-6 space-y-3">
            <h2 className="text-xl font-black uppercase text-center">Our Services</h2>
            <div className="space-y-2">
              {services.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_25%,transparent)] px-4 py-3">
                  {p.image_url ? (
                    <button type="button" onClick={() => setLightbox(p.image_url)} className="shrink-0">
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-xl object-cover" />
                    </button>
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-[color-mix(in_srgb,var(--c-text)_10%,transparent)] border border-[color-mix(in_srgb,var(--c-text)_25%,transparent)] flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4 text-[color-mix(in_srgb,var(--c-text)_60%,transparent)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-[color-mix(in_srgb,var(--c-text)_70%,transparent)] truncate">{p.description}</p>}
                  </div>
                  {p.price && <span className="text-sm font-bold shrink-0">KES {p.price}</span>}
                  {commerce_enabled && waNumber && (
                    <button
                      type="button"
                      onClick={() => setBookingService(p)}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-pink-700 bg-white px-2.5 py-1.5 rounded-xl"
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

        {/* ── PRODUCTS / CATALOG (falls back to gallery) ─────────────────── */}
        {(productItems.length > 0 || (services.length === 0 && galleryItems.length > 0)) && (
          <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-6 space-y-3">
            <h2 className="text-xl font-black uppercase text-center">
              {productItems.length > 0 ? "Our Products" : "Take A Look"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {productItems.length > 0
                ? productItems.map(p => (
                    <ItemCard key={p.id} item={p} isProduct onAddToCart={commerce_enabled ? cart.addItem : null} onImageClick={setLightbox} />
                  ))
                : galleryItems.map(img => {
                    const url = img.sizes?.large || img.sizes?.medium || Object.values(img.sizes || {})[0];
                    return url ? (
                      <ItemCard key={img.slug} item={{ id: img.slug, name: img.name, image_url: url }} onImageClick={setLightbox} />
                    ) : null;
                  })}
            </div>
          </section>
        )}

        {/* ── VISIT US ────────────────────────────────────────────────────── */}
        <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-6 space-y-4 text-center">
          <h2 className="text-xl font-black uppercase">Come Visit Us!</h2>
          {profile.how_to_find && (
            <p className="text-[color-mix(in_srgb,var(--c-text)_90%,transparent)] leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
          )}

          <div className="flex flex-col gap-2.5">
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-green-500 hover:bg-green-400 py-3 font-bold transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp Me
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] py-3 font-bold hover:bg-[color-mix(in_srgb,var(--c-text)_10%,transparent)] transition-colors"
              >
                <Phone className="h-5 w-5" />
                {contact.phone}
              </a>
            )}
            {contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] py-3 font-bold hover:bg-[color-mix(in_srgb,var(--c-text)_10%,transparent)] transition-colors"
              >
                <Globe className="h-5 w-5" />
                Visit Our Page
              </a>
            )}
          </div>

          {locationStr && (
            <p className="flex items-center justify-center gap-1.5 text-[color-mix(in_srgb,var(--c-text)_90%,transparent)] text-sm font-semibold">
              <MapPin className="h-4 w-4 shrink-0" />
              {locationStr}
            </p>
          )}
          {contact.email && (
            <p>
              <span className="text-xs uppercase tracking-widest text-[color-mix(in_srgb,var(--c-text)_60%,transparent)] block">Email Address</span>
              <a href={`mailto:${contact.email}`} className="font-bold underline">{contact.email}</a>
            </p>
          )}

          {hasMapLocation(location) && (
            <>
              <div className="rounded-2xl overflow-hidden border-4 border-[color-mix(in_srgb,var(--c-text)_20%,transparent)]">
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
                className="inline-flex items-center gap-1 text-xs font-bold underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Google Maps
              </a>
            </>
          )}
        </section>

        {/* ── HOURS ───────────────────────────────────────────────────────── */}
        {hasHours && (
          <section className="rounded-[2rem] bg-[var(--c-card)] shadow-xl shadow-black/25 p-6">
            <h2 className="text-xl font-black uppercase text-center mb-3">Business Hours</h2>
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
                    <span className="text-[color-mix(in_srgb,var(--c-text)_70%,transparent)] w-10">{DAY_SHORT[day]}</span>
                    {isClosed
                      ? <span className="text-[color-mix(in_srgb,var(--c-text)_50%,transparent)]">Closed</span>
                      : <span className="font-semibold">{timeStr}</span>
                    }
                  </div>
                );
              })}
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
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--c-deep)] border-t border-[color-mix(in_srgb,var(--c-text)_20%,transparent)] px-3 py-2.5 flex gap-2 z-30">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--c-text)_40%,transparent)] text-[var(--c-text)] font-bold text-sm active:scale-95 transition-transform">
              <Phone className="h-4 w-4" />Call
            </a>
          )}
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-bold text-sm active:scale-95 transition-transform">
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
        </div>
      )}

      {/* ── PHOTO LIGHTBOX ──────────────────────────────────────────────── */}
      {lightbox && <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <footer className="text-center text-xs text-[color-mix(in_srgb,var(--c-text)_60%,transparent)] py-5 pb-24">
        Listed on{" "}
        <a href="https://tafuta.ke" className="text-[color-mix(in_srgb,var(--c-text)_80%,transparent)] underline hover:text-[var(--c-text)]">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
