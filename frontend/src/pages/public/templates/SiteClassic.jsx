import { useState } from "react";
import { Phone, Mail, MessageCircle, Globe, MapPin, Clock, X, ExternalLink } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const DAY_ALIAS = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

function resolveHours(hours, day) {
  return hours?.[day] ?? hours?.[DAY_ALIAS[day]] ?? null;
}

function primaryImage(images, type, primary, sizeTag) {
  const list = images?.[type] || [];
  if (!list.length) return null;
  const primarySlug = primary?.[type];
  const img = (primarySlug && list.find(i => i.slug === primarySlug)) || list[0];
  const sizes = img?.sizes || {};
  return sizes[sizeTag] || Object.values(sizes)[0] || null;
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
      <span className="block w-6 h-0.5 bg-gray-300" />
      {children}
    </h2>
  );
}

function ServiceCard({ product }) {
  const imgUrl = product.image_url || product.image || null;
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      {imgUrl ? (
        <img src={imgUrl} alt={product.name} className="w-full aspect-[4/3] object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-3xl text-gray-300">✂</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 leading-snug">{product.name}</p>
          {product.price && (
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              KES {product.price}
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{product.description}</p>
        )}
      </div>
    </div>
  );
}

export default function SiteClassic({ business }) {
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
  const hasHours = hours && Object.keys(hours).length > 0;
  const waNumber = contact.whatsapp?.replace(/\D/g, "") || contact.phone?.replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[55vw] max-h-[420px] min-h-[220px] bg-gray-800 overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt={business_name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            {logoImgUrl && (
              <img
                src={logoImgUrl}
                alt={business_name}
                className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-white shrink-0 shadow-lg"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-white leading-tight truncate">{business_name}</h1>
              {profile.tagline && (
                <p className="text-white/80 text-sm mt-0.5 line-clamp-1">{profile.tagline}</p>
              )}
              {(category || region) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {category && (
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">{category}</span>
                  )}
                  {region && (
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{region}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT BAR ─────────────────────────────────────────────────────── */}
      {(contact.phone || contact.whatsapp || contact.email || contact.website || location.city) && (
        <section className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {contact.phone && (
              <a href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {contact.phone}
              </a>
            )}
            {(contact.whatsapp || contact.phone) && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors shrink-0">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {contact.email}
              </a>
            )}
            {contact.website && (
              <a href={contact.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {location.city && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500 whitespace-nowrap px-3 py-1.5 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {[location.street_address, location.city].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-12 pb-24 md:pb-12">

        {/* About */}
        {profile.description && (
          <section>
            <SectionTitle>About Us</SectionTitle>
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-line max-w-2xl">
              {profile.description}
            </p>
          </section>
        )}

        {/* Products & Services */}
        {products.length > 0 && (
          <section>
            <SectionTitle>Our Services</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {products.map(p => <ServiceCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryItems.length > 0 && (
          <section>
            <SectionTitle>Gallery</SectionTitle>
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
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ) : null;
              })}
            </div>
          </section>
        )}

        {/* Hours + Location side by side */}
        {(hasHours || location.city || location.street_address) && (
          <div className="grid sm:grid-cols-2 gap-8">
            {hasHours && (
              <section>
                <SectionTitle>
                  <Clock className="h-3.5 w-3.5 inline-block mr-1" />Business Hours
                </SectionTitle>
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
                          ? <span className="text-gray-300">Closed</span>
                          : <span className="text-gray-700 font-medium">{timeStr}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {(location.city || location.street_address) && (
              <section>
                <SectionTitle>
                  <MapPin className="h-3.5 w-3.5 inline-block mr-1" />Location
                </SectionTitle>
                <div className="space-y-2 text-sm text-gray-700">
                  {location.street_address && <p>{location.street_address}</p>}
                  {(location.city || location.region) && (
                    <p>{[location.city, location.region].filter(Boolean).join(", ")}</p>
                  )}
                  {location.postal_code && <p>{location.postal_code}</p>}
                  {location.city && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent([location.street_address, location.city, location.region].filter(Boolean).join(", "))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* How to Find Us */}
        {profile.how_to_find && (
          <section>
            <SectionTitle>How to Find Us</SectionTitle>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base whitespace-pre-line max-w-2xl">
              {profile.how_to_find}
            </p>
          </section>
        )}
      </main>

      {/* ── MOBILE STICKY CTA ───────────────────────────────────────────────── */}
      {(contact.phone || waNumber) && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 flex gap-3 z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm active:scale-95 transition-transform">
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm active:scale-95 transition-transform">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      )}

      {/* ── GALLERY LIGHTBOX ────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 rounded-full p-2"
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

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t text-center text-xs text-gray-400 py-5">
        Listed on{" "}
        <a href="https://tafuta.ke" className="hover:text-gray-600 underline underline-offset-2">
          Tafuta.ke
        </a>
      </footer>
    </div>
  );
}
