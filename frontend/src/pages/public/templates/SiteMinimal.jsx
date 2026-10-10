import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Globe, Wrench, ShoppingBag, ShoppingCart, Heart, ExternalLink } from "lucide-react";
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

// ── Section heading ──────────────────────────────────────────────────────────
function SecHead({ children, light = false }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] mb-5 text-center text-[var(--c-faint)]">
      {children}
    </p>
  );
}

// ── Individual service block ─────────────────────────────────────────────────
function ServiceBlock({ product, onAddToCart, onImageClick }) {
  const imgUrl = product.image_url || product.image || null;
  return (
    <div className="border-b border-[var(--c-line)] pb-8 last:border-0 last:pb-0">
      {imgUrl ? (
        <button
          type="button"
          onClick={() => onImageClick(imgUrl)}
          className="w-full aspect-[4/3] bg-[var(--c-wash)] flex items-center justify-center overflow-hidden"
        >
          <img src={imgUrl} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
        </button>
      ) : (
        <div className="w-full aspect-[4/3] bg-[var(--c-line)] flex items-center justify-center">
          <ShoppingBag className="h-10 w-10 text-[var(--c-rule)]" />
        </div>
      )}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black uppercase text-base tracking-wide text-[var(--c-text)] leading-tight">
            {product.name}
          </h3>
          {product.price && (
            <span className="shrink-0 text-sm font-bold text-[var(--c-body)] bg-[var(--c-line)] px-2.5 py-0.5 rounded-full">
              KES {product.price}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-[var(--c-muted)] mt-1.5 leading-relaxed">{product.description}</p>
        )}
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--c-accentText)] bg-[var(--c-accent)] px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

// ── CTA button ───────────────────────────────────────────────────────────────
function CtaButton({ href, bg, children, external = false }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center justify-center gap-3 w-full py-3.5 px-6 font-bold text-sm uppercase tracking-wide text-white rounded-none"
      style={{ backgroundColor: bg }}
    >
      {children}
    </a>
  );
}

// ── Main template ─────────────────────────────────────────────────────────────
export default function SiteMinimal({ business, palette }) {
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

  const colors = colorVars(resolveColors(palette, "minimal"));
  const services = products.filter(p => (p.type || "service") === "service");
  const productItems = products.filter(p => p.type === "product");

  const bannerUrl =
    primaryImage(images, "banner", media_primary, "1200x400") ||
    primaryImage(images, "banner", media_primary, "600x200") ||
    primaryImage(images, "profile", media_primary, "large");
  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];
  const waNumber = contact.whatsapp?.replace(/\D/g, "") || contact.phone?.replace(/\D/g, "");
  const hasHours = hours && Object.keys(hours).length > 0;
  const locationStr = [location.street_address, location.city, location.region].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-[var(--c-base)] font-sans" style={colors}>

      {/* ── DARK HEADER ─────────────────────────────────────────────────── */}
      <header className="bg-[var(--c-dark)] text-[var(--c-onDark)] text-center px-5 pt-10 pb-8">
        {logoImgUrl && (
          <div className="mb-5">
            <img
              src={logoImgUrl}
              alt={business_name}
              className="h-20 w-20 rounded-full object-cover border-[3px] border-[var(--c-onDark)] mx-auto shadow-lg"
            />
          </div>
        )}
        <h1 className="text-[1.7rem] sm:text-5xl font-black uppercase leading-[1.1] tracking-wider">
          {business_name}
        </h1>
        {profile.tagline && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--c-onDarkBody)]">{profile.tagline}</p>
        )}
        {(category || region) && (
          <p className="mt-1.5 text-[11px] uppercase tracking-widest text-[var(--c-onDarkSubtle)]">
            {[category, region].filter(Boolean).join(" · ")}
          </p>
        )}
        {locally_owned && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--c-onDark)] border border-[color-mix(in_srgb,var(--c-onDark)_30%,transparent)] rounded-full px-3 py-1">
            <Heart className="h-3 w-3 fill-current" />
            Locally Owned
          </p>
        )}
      </header>

      {/* ── BANNER IMAGE ────────────────────────────────────────────────── */}
      {bannerUrl && (
        <div className="w-full overflow-hidden" style={{ maxHeight: "55vw" }}>
          <img
            src={bannerUrl}
            alt={business_name}
            className="w-full object-cover"
            style={{ minHeight: "160px" }}
          />
        </div>
      )}

      {/* ── CONTACT STRIP ───────────────────────────────────────────────── */}
      {(contact.phone || locationStr) && (
        <div className="bg-[var(--c-strip)] border-b border-[var(--c-lineStrong)] px-5 py-4">
          <div className="max-w-sm mx-auto space-y-2.5">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 text-sm font-semibold text-[var(--c-text)]"
              >
                <Phone className="h-4 w-4 shrink-0 text-[var(--c-muted)]" />
                {contact.phone}
              </a>
            )}
            {locationStr && (
              <div className="flex items-start gap-3 text-sm text-[var(--c-secondary)]">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--c-muted)] mt-0.5" />
                <span>{locationStr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABOUT ───────────────────────────────────────────────────────── */}
      {profile.description && (
        <section className="bg-[var(--c-dark)] text-[var(--c-onDark)] px-5 py-12">
          <div className="max-w-sm mx-auto text-center">
            <SecHead>About Us</SecHead>
            <p className="text-sm text-[var(--c-onDarkBody)] leading-relaxed whitespace-pre-line">
              {profile.description}
            </p>
          </div>
        </section>
      )}

      {/* ── SERVICES ────────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section className="bg-[var(--c-base)] py-10">
          <div className="max-w-sm mx-auto px-5">
            <SecHead>Our Services</SecHead>
            <div className="divide-y divide-[var(--c-line)] border border-[var(--c-line)] rounded-xl overflow-hidden">
              {services.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--c-base)]">
                  {p.image_url ? (
                    <button type="button" onClick={() => setLightbox(p.image_url)} className="shrink-0">
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-contain bg-[var(--c-wash)] border border-[var(--c-lineStrong)]" />
                    </button>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-[var(--c-line)] flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4 text-[var(--c-faint)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-wide text-[var(--c-text)] truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-[var(--c-muted)] truncate">{p.description}</p>
                    )}
                  </div>
                  {p.price && (
                    <span className="text-sm font-bold text-[var(--c-body)] shrink-0">KES {p.price}</span>
                  )}
                  {commerce_enabled && waNumber && (
                    <button
                      type="button"
                      onClick={() => setBookingService(p)}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold uppercase text-white bg-[#111111] px-2.5 py-1.5 transition-colors"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Book
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PRODUCTS ────────────────────────────────────────────────────── */}
      {productItems.length > 0 && (
        <section className="bg-[var(--c-strip)] py-10">
          <div className="max-w-sm mx-auto px-0">
            <div className="px-5 mb-6">
              <SecHead>Products</SecHead>
            </div>
            <div className="space-y-8">
              {productItems.map(p => (
                <ServiceBlock key={p.id} product={p} onAddToCart={commerce_enabled ? cart.addItem : null} onImageClick={setLightbox} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ─────────────────────────────────────────────────────── */}
      {galleryItems.length > 0 && (
        <section className="bg-[var(--c-dark)] py-10">
          <div className="max-w-sm mx-auto px-1">
            <div className="px-4 mb-5">
              <SecHead light>Gallery</SecHead>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {galleryItems.map(img => {
                const url = img.sizes?.large || img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes || {})[0];
                const thumb = img.sizes?.medium || img.sizes?.thumb || url;
                return url ? (
                  <button
                    key={img.slug}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="block aspect-square overflow-hidden"
                  >
                    <img
                      src={thumb}
                      alt={img.name}
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity duration-200"
                      loading="lazy"
                    />
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── BUSINESS HOURS ──────────────────────────────────────────────── */}
      {hasHours && (
        <section className="bg-[var(--c-base)] px-5 py-12 border-b border-[var(--c-line)]">
          <div className="max-w-sm mx-auto">
            <SecHead>Business Hours</SecHead>
            <div className="space-y-2">
              {DAYS.map(day => {
                const info = resolveHours(hours, day);
                if (!info) return null;
                const isClosed = typeof info === "object" && info.is_open === false;
                const timeStr = typeof info === "string"
                  ? info.replace("-", " – ")
                  : `${info.open || "08:00"} – ${info.close || "17:00"}`;
                return (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="font-semibold uppercase text-[11px] tracking-wide text-[var(--c-muted)] w-10">{DAY_SHORT[day]}</span>
                    {isClosed
                      ? <span className="text-[var(--c-rule)] text-xs">Closed</span>
                      : <span className="text-[var(--c-ink)] font-medium">{timeStr}</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── COME VISIT US ───────────────────────────────────────────────── */}
      <section className="bg-[var(--c-dark)] text-[var(--c-onDark)] px-5 py-12">
        <div className="max-w-sm mx-auto text-center">
          <SecHead>Come Visit Us</SecHead>

          {locationStr && (
            <p className="text-sm text-[var(--c-onDarkBody)] mb-6">{locationStr}</p>
          )}

          {profile.how_to_find && (
            <p className="text-sm text-[var(--c-onDarkMuted)] leading-relaxed mb-8 whitespace-pre-line">
              {profile.how_to_find}
            </p>
          )}

          {hasMapLocation(location) && (
            <div className="mb-8">
              <div className="border border-[var(--c-darkLine)] overflow-hidden">
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
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--c-onDarkBody)] hover:text-[var(--c-onDark)] mt-2"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Google Maps
              </a>
            </div>
          )}

          {/* CTA stack */}
          <div className="space-y-2 max-w-xs mx-auto">
            {waNumber && (
              <CtaButton href={`https://wa.me/${waNumber}`} bg="#25D366" external>
                <MessageCircle className="h-5 w-5" />
                WhatsApp Us
              </CtaButton>
            )}
            {contact.phone && (
              <CtaButton href={`tel:${contact.phone}`} bg="var(--c-accent)">
                <Phone className="h-5 w-5" />
                Call {contact.phone}
              </CtaButton>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 text-sm font-medium text-[var(--c-onDarkBody)] hover:text-[var(--c-onDark)] border border-[var(--c-darkBorder)] hover:border-[var(--c-onDarkMuted)] transition-colors"
              >
                <Mail className="h-4 w-4" />
                {contact.email}
              </a>
            )}
            {contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3 px-6 text-xs font-medium text-[var(--c-onDarkMuted)] hover:text-[var(--c-onDarkSoft)] transition-colors"
              >
                <Globe className="h-4 w-4" />
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── PHOTO LIGHTBOX ──────────────────────────────────────────────── */}
      {lightbox && <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}

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

      {/* ── MOBILE STICKY CTA ───────────────────────────────────────────── */}
      {(contact.phone || waNumber) && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[var(--c-dark)] border-t border-[var(--c-darkLine)] px-3 py-2.5 flex gap-2 z-30">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase tracking-wide text-[var(--c-accentText)] bg-[var(--c-accent)] rounded"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase tracking-wide text-white rounded"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[var(--c-deepDark)] text-center text-[11px] text-[var(--c-body)] py-5 pb-20 md:pb-5 tracking-wider uppercase">
        Listed on{" "}
        <a href="https://tafuta.ke" className="text-[var(--c-onDarkMuted)] hover:text-[var(--c-onDarkSoft)] underline">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
