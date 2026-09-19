import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Globe, X } from "lucide-react";

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
    <p className={`text-[11px] font-extrabold uppercase tracking-[0.22em] mb-5 text-center ${light ? "text-gray-400" : "text-gray-400"}`}>
      {children}
    </p>
  );
}

// ── Individual service block ─────────────────────────────────────────────────
function ServiceBlock({ product }) {
  const imgUrl = product.image_url || product.image || null;
  return (
    <div className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={product.name}
          className="w-full aspect-[4/3] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
          <span className="text-5xl text-gray-300 select-none">✂</span>
        </div>
      )}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black uppercase text-base tracking-wide text-gray-900 leading-tight">
            {product.name}
          </h3>
          {product.price && (
            <span className="shrink-0 text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
              KES {product.price}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{product.description}</p>
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
export default function SiteMinimal({ business }) {
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
    <div className="min-h-screen bg-white font-sans">

      {/* ── DARK HEADER ─────────────────────────────────────────────────── */}
      <header className="bg-[#111111] text-white text-center px-5 pt-10 pb-8">
        {logoImgUrl && (
          <div className="mb-5">
            <img
              src={logoImgUrl}
              alt={business_name}
              className="h-20 w-20 rounded-full object-cover border-[3px] border-white mx-auto shadow-lg"
            />
          </div>
        )}
        <h1 className="text-[1.7rem] sm:text-5xl font-black uppercase leading-[1.1] tracking-wider">
          {business_name}
        </h1>
        {profile.tagline && (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-400">{profile.tagline}</p>
        )}
        {(category || region) && (
          <p className="mt-1.5 text-[11px] uppercase tracking-widest text-gray-600">
            {[category, region].filter(Boolean).join(" · ")}
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
        <div className="bg-[#f5f5f5] border-b border-gray-200 px-5 py-4">
          <div className="max-w-sm mx-auto space-y-2.5">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 text-sm font-semibold text-gray-900"
              >
                <Phone className="h-4 w-4 shrink-0 text-gray-500" />
                {contact.phone}
              </a>
            )}
            {locationStr && (
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-gray-500 mt-0.5" />
                <span>{locationStr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABOUT ───────────────────────────────────────────────────────── */}
      {profile.description && (
        <section className="bg-[#111111] text-white px-5 py-12">
          <div className="max-w-sm mx-auto text-center">
            <SecHead>About Us</SecHead>
            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
              {profile.description}
            </p>
          </div>
        </section>
      )}

      {/* ── SERVICES ────────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="bg-white py-10">
          <div className="max-w-sm mx-auto px-0">
            <div className="px-5 mb-6">
              <SecHead>Our Services</SecHead>
            </div>
            <div className="space-y-8">
              {products.map(p => <ServiceBlock key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ─────────────────────────────────────────────────────── */}
      {galleryItems.length > 0 && (
        <section className="bg-[#111111] py-10">
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
        <section className="bg-white px-5 py-12 border-b border-gray-100">
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
                    <span className="font-semibold uppercase text-[11px] tracking-wide text-gray-500 w-10">{DAY_SHORT[day]}</span>
                    {isClosed
                      ? <span className="text-gray-300 text-xs">Closed</span>
                      : <span className="text-gray-800 font-medium">{timeStr}</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── COME VISIT US ───────────────────────────────────────────────── */}
      <section className="bg-[#111111] text-white px-5 py-12">
        <div className="max-w-sm mx-auto text-center">
          <SecHead>Come Visit Us</SecHead>

          {locationStr && (
            <p className="text-sm text-gray-400 mb-6">{locationStr}</p>
          )}

          {profile.how_to_find && (
            <p className="text-sm text-gray-500 leading-relaxed mb-8 whitespace-pre-line">
              {profile.how_to_find}
            </p>
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
              <CtaButton href={`tel:${contact.phone}`} bg="#222222">
                <Phone className="h-5 w-5" />
                Call {contact.phone}
              </CtaButton>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
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
                className="flex items-center justify-center gap-3 w-full py-3 px-6 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Globe className="h-4 w-4" />
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── LIGHTBOX ────────────────────────────────────────────────────── */}
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
            className="max-h-[90vh] max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── MOBILE STICKY CTA ───────────────────────────────────────────── */}
      {(contact.phone || waNumber) && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#111111] border-t border-gray-800 px-3 py-2.5 flex gap-2 z-30">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase tracking-wide text-white bg-[#222222] rounded"
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
      <footer className="bg-[#0a0a0a] text-center text-[11px] text-gray-700 py-5 pb-20 md:pb-5 tracking-wider uppercase">
        Listed on{" "}
        <a href="https://tafuta.ke" className="text-gray-500 hover:text-gray-300 underline">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
