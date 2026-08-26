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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">No active business with the address <strong>/site/{tag}</strong>.</p>
        <Link to="/search" className="text-primary underline text-sm">Browse businesses</Link>
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
