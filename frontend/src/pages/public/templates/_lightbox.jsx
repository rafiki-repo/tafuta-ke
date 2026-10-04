import { X } from "lucide-react";

// Full-size photo popup shared by all business website templates.
// Matches the business detail page: click outside the photo or the X to close; clicking the photo keeps it open.
export function PhotoLightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 rounded-full p-2"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
