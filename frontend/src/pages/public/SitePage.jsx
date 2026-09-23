import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";
import { siteAPI } from "@/lib/api";
import SiteClassic from "./templates/SiteClassic";
import SiteBold from "./templates/SiteBold";
import SiteMinimal from "./templates/SiteMinimal";

const TEMPLATES = {
  classic: SiteClassic,
  bold: SiteBold,
  minimal: SiteMinimal,
};

export default function SitePage() {
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const previewTemplate = searchParams.get("template");
  const [business, setBusiness] = useState(null);
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
  return (
    <>
      {previewTemplate && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between">
          <span>Preview: <strong className="capitalize">{previewTemplate}</strong> template</span>
          <button onClick={() => window.close()} className="underline hover:no-underline">Close preview</button>
        </div>
      )}
      <Template business={business} />
    </>
  );
}
