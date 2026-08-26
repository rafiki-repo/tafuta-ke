import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

function primaryImage(images, type, primary, sizeTag) {
  const list = images?.[type] || [];
  if (!list.length) return null;
  const primarySlug = primary?.[type];
  const img = (primarySlug && list.find(i => i.slug === primarySlug)) || list[0];
  const sizes = img?.sizes || {};
  return sizes[sizeTag] || Object.values(sizes)[0] || null;
}

export default function SiteBold({ business }) {
  const { business_name, logo_url, category, region, profile, contact, location, images = {}, media_primary = {}, products = [] } = business;

  const bannerUrl = primaryImage(images, "banner", media_primary, "1200x400")
    || primaryImage(images, "profile", media_primary, "large");
  const logoImgUrl = primaryImage(images, "logo", media_primary, "medium") || logo_url;
  const galleryItems = images.gallery || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Hero */}
      <header
        className="relative px-6 py-16 text-center overflow-hidden"
        style={bannerUrl ? {} : undefined}
      >
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className={`relative z-10 ${bannerUrl ? "" : "bg-gradient-to-br from-orange-600 to-orange-500"} -m-6 p-16`}>
          {logoImgUrl && (
            <img src={logoImgUrl} alt={business_name} className="h-24 w-24 rounded-full object-cover border-4 border-white/30 mx-auto mb-6 shadow-xl" />
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

      {/* Contact bar */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-6">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-medium">
              <Phone className="h-4 w-4" />{contact.phone}
            </a>
          )}
          {contact.whatsapp && (
            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 font-medium">
              <MessageCircle className="h-4 w-4" />WhatsApp
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-medium">
              <Mail className="h-4 w-4" />{contact.email}
            </a>
          )}
          {(location.city || location.street_address) && (
            <span className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="h-4 w-4" />
              {[location.street_address, location.city].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {profile.description && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">{profile.description}</p>
          </section>
        )}

        {/* Products / Services */}
        {products.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4">Products &amp; Services</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {products.map(p => (
                <div key={p.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-white">{p.name}</p>
                    {p.price && <span className="text-sm font-bold text-orange-400 shrink-0">KES {p.price}</span>}
                  </div>
                  {p.description && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.description}</p>}
                </div>
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
                const url = img.sizes?.medium || img.sizes?.thumb || Object.values(img.sizes)[0];
                return url ? (
                  <img key={img.slug} src={url} alt={img.name} className="w-full aspect-square object-cover rounded-md" loading="lazy" />
                ) : null;
              })}
            </div>
          </section>
        )}

        {profile.how_to_find && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">How to Find Us</h2>
            <p className="text-gray-400 leading-relaxed whitespace-pre-line">{profile.how_to_find}</p>
          </section>
        )}
      </main>

      <footer className="border-t border-gray-800 text-center text-xs text-gray-600 py-4">
        Listed on <a href="/" className="text-gray-500 underline">Tafuta.ke</a>
      </footer>
    </div>
  );
}
