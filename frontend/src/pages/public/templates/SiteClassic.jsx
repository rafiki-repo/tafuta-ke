import { Phone, Mail, MessageCircle, Globe, MapPin, Clock } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const DAY_ALIAS = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

function resolveHours(hours, day) {
  return hours?.[day] ?? hours?.[DAY_ALIAS[day]] ?? null;
}

function HoursRow({ day, info }) {
  if (!info) return null;
  if (typeof info === "string") {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-gray-500 w-10">{DAY_SHORT[day]}</span>
        <span className="text-gray-700">{info.replace("-", " – ")}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500 w-10">{DAY_SHORT[day]}</span>
      {info.is_open === false ? (
        <span className="text-gray-400">Closed</span>
      ) : (
        <span className="text-gray-700">{info.open || "08:00"} – {info.close || "17:00"}</span>
      )}
    </div>
  );
}

// Pick the primary image URL for a type, falling back to the first available
function primaryImage(images, type, primary, sizeTag) {
  const list = images?.[type] || [];
  if (!list.length) return null;
  const primarySlug = primary?.[type];
  const img = (primarySlug && list.find(i => i.slug === primarySlug)) || list[0];
  const sizes = img?.sizes || {};
  return sizes[sizeTag] || Object.values(sizes)[0] || null;
}

export default function SiteClassic({ business }) {
  const { business_name, logo_url, business_tag, category, region, profile, contact, location, hours, images = {}, media_primary = {}, products = [] } = business;
  const hasHours = hours && Object.keys(hours).length > 0;

  const bannerUrl = primaryImage(images, "banner", media_primary, "600x200")
    || primaryImage(images, "profile", media_primary, "large");
  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Banner */}
      {bannerUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden bg-gray-200">
          <img src={bannerUrl} alt={business_name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          {logoImgUrl && (
            <img src={logoImgUrl} alt={business_name} className="h-16 w-16 rounded-full object-cover border" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business_name}</h1>
            {profile.tagline && <p className="text-sm text-gray-500 mt-0.5">{profile.tagline}</p>}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {category && <span className="capitalize">{category}</span>}
              {category && region && <span>·</span>}
              {region && <span>{region}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Contact */}
          {(contact.phone || contact.email || contact.whatsapp || contact.website) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Contact</h2>
              <div className="space-y-2">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />{contact.phone}
                  </a>
                )}
                {contact.whatsapp && (
                  <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <MessageCircle className="h-4 w-4 text-gray-400 shrink-0" />WhatsApp
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />{contact.email}
                  </a>
                )}
                {contact.website && (
                  <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                    <Globe className="h-4 w-4 text-gray-400 shrink-0" />{contact.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Location */}
          {(location.street_address || location.city) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Location</h2>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span>{[location.street_address, location.city, location.region].filter(Boolean).join(", ")}</span>
              </div>
            </section>
          )}

          {/* Hours */}
          {hasHours && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Hours
              </h2>
              <div className="space-y-1">
                {DAYS.map(day => {
                  const info = resolveHours(hours, day);
                  return <HoursRow key={day} day={day} info={info} />;
                })}
              </div>
            </section>
          )}
        </aside>

        {/* Main content */}
        <div className="md:col-span-2 space-y-8">
          {profile.description && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">About</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.description}</p>
            </section>
          )}

          {profile.how_to_find && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">How to Find Us</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
            </section>
          )}

          {/* Products / Services */}
          {products.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Products &amp; Services</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {products.map(p => (
                  <div key={p.id} className="rounded-lg border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      {p.price && <span className="text-sm font-semibold text-gray-700 shrink-0">KES {p.price}</span>}
                    </div>
                    {p.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery */}
          {galleryItems.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {galleryItems.map(img => {
                  const url = img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes)[0];
                  return url ? (
                    <img key={img.slug} src={url} alt={img.name} className="w-full aspect-square object-cover rounded-md" loading="lazy" />
                  ) : null;
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="border-t text-center text-xs text-gray-400 py-4">
        Listed on <a href="/" className="underline">Tafuta.ke</a>
      </footer>
    </div>
  );
}
