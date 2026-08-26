import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

function primaryImage(images, type, primary, sizeTag) {
  const list = images?.[type] || [];
  if (!list.length) return null;
  const primarySlug = primary?.[type];
  const img = (primarySlug && list.find(i => i.slug === primarySlug)) || list[0];
  const sizes = img?.sizes || {};
  return sizes[sizeTag] || Object.values(sizes)[0] || null;
}

export default function SiteMinimal({ business }) {
  const { business_name, logo_url, category, region, profile, contact, location, images = {}, media_primary = {}, products = [] } = business;

  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <main className="max-w-xl mx-auto px-6 py-16 space-y-10">
        {/* Identity */}
        <div className="flex items-center gap-4">
          {logoImgUrl && (
            <img src={logoImgUrl} alt={business_name} className="h-14 w-14 rounded-full object-cover border" />
          )}
          <div>
            <h1 className="text-xl font-bold">{business_name}</h1>
            <p className="text-sm text-gray-400">
              {[category, region].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {profile.tagline && (
          <p className="text-lg text-gray-600 leading-relaxed border-l-2 border-gray-200 pl-4">{profile.tagline}</p>
        )}

        {profile.description && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">About</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.description}</p>
          </section>
        )}

        {/* Products / Services */}
        {products.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Products &amp; Services</h2>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.price && <span className="text-sm text-gray-600 shrink-0">KES {p.price}</span>}
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryItems.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Gallery</h2>
            <div className="grid grid-cols-2 gap-2">
              {galleryItems.map(img => {
                const url = img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes)[0];
                return url ? (
                  <img key={img.slug} src={url} alt={img.name} className="w-full aspect-square object-cover rounded-sm" loading="lazy" />
                ) : null;
              })}
            </div>
          </section>
        )}

        {/* Contact */}
        {(contact.phone || contact.email || contact.whatsapp) && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Contact</h2>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                <Phone className="h-4 w-4 text-gray-400" />{contact.phone}
              </a>
            )}
            {contact.whatsapp && (
              <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                <MessageCircle className="h-4 w-4 text-gray-400" />WhatsApp
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                <Mail className="h-4 w-4 text-gray-400" />{contact.email}
              </a>
            )}
          </section>
        )}

        {(location.city || location.street_address) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Location</h2>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{[location.street_address, location.city, location.region].filter(Boolean).join(", ")}</span>
            </div>
          </section>
        )}

        {profile.how_to_find && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">How to Find Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
          </section>
        )}

        <p className="text-xs text-gray-300 pt-4 border-t">
          Listed on <a href="/" className="underline">Tafuta.ke</a>
        </p>
      </main>
    </div>
  );
}
