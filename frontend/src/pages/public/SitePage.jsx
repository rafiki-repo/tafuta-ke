import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { siteAPI } from "@/lib/api";
import { loadPalettes } from "@/lib/palette";
import SiteClassic from "./templates/SiteClassic";
import SiteBold from "./templates/SiteBold";
import SiteMinimal from "./templates/SiteMinimal";
import SiteVibrant from "./templates/SiteVibrant";

const TEMPLATES = {
  classic: SiteClassic,
  bold: SiteBold,
  minimal: SiteMinimal,
  vibrant: SiteVibrant,
};

export default function SitePage() {
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const previewTemplate = searchParams.get("template");
  const previewPaletteId = searchParams.get("palette");
  const [business, setBusiness] = useState(null);
  const [previewPalette, setPreviewPalette] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    siteAPI
      .getByTag(tag)
      .then((res) => setBusiness(res.data.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [tag]);

  // Owner preview: ?palette=ID shows that palette without it being saved to the business.
  useEffect(() => {
    if (!previewPaletteId) {
      setPreviewPalette(null);
      return;
    }
    loadPalettes()
      .then((list) => setPreviewPalette(list.find((p) => p.id === previewPaletteId) || null))
      .catch(() => setPreviewPalette(null));
  }, [previewPaletteId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-4 bg-gray-50">
        <div className="text-6xl font-black text-gray-200">404</div>
        <h1 className="text-xl font-bold text-gray-800">This website is not available</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          The business website at <strong>/site/{tag}</strong> is either not active or has not been set up yet.
        </p>
        <Link
          to="/search"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gray-900 px-4 py-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          Browse businesses
        </Link>
      </div>
    );
  }

  const Template = TEMPLATES[previewTemplate] || TEMPLATES[business.site_template] || SiteClassic;
  const palette = (previewPaletteId && previewPalette) || business.color_palette || null;
  return (
    <>
      {previewTemplate && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between">
          <span>
            Preview: <strong className="capitalize">{previewTemplate}</strong> template
            {previewPalette && <> · <strong>{previewPalette.title}</strong> colors</>}
          </span>
          <button onClick={() => window.close()} className="underline hover:no-underline">Close preview</button>
        </div>
      )}
      <Template business={business} palette={palette} />
    </>
  );
}
