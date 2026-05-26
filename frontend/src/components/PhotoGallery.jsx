import { useEffect, useState } from 'react';

// PhotoGallery
//
// Renders a primary photo plus a thumbnail strip below it. On mobile we
// expose more thumbs by horizontal scroll, on desktop we grid them.
// Clicking a photo opens a lightbox; left/right and ←/→ keys navigate.

export default function PhotoGallery({ photos = [] }) {
  const [main, setMain] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Keep `main` valid if the photos prop shrinks (e.g. on form edit).
  useEffect(() => {
    if (main >= photos.length) setMain(0);
  }, [photos.length, main]);

  // Keyboard nav inside the lightbox.
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowRight') setMain((i) => (i + 1) % photos.length);
      else if (e.key === 'ArrowLeft') setMain((i) => (i - 1 + photos.length) % photos.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, photos.length]);

  if (!photos.length) {
    return (
      <div className="bg-cream-100 aspect-[4/3] rounded-2xl grid place-items-center text-ink-500">
        No photos yet
      </div>
    );
  }

  return (
    <div className="bg-cream-100 rounded-2xl p-2">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block w-full aspect-[4/3] overflow-hidden rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"
        aria-label={`View photo ${main + 1} of ${photos.length} fullscreen`}
      >
        <img
          src={photos[main]}
          alt={`Photo ${main + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </button>

      {/* Thumbnail strip — scrollable on mobile, grid on sm+ */}
      <div
        className="mt-2 flex sm:grid sm:grid-cols-4 gap-2 overflow-x-auto sm:overflow-visible no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0"
        role="listbox"
        aria-label="Photo thumbnails"
      >
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setMain(i)}
            role="option"
            aria-selected={i === main}
            className={`shrink-0 w-20 h-20 sm:w-auto sm:h-auto sm:aspect-square overflow-hidden rounded-lg bg-white border-2 ${
              i === main ? 'border-sage-400' : 'border-transparent'
            }`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="text-center mt-2 text-xs text-ink-500">
        {main + 1} of {photos.length}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9500] bg-black/90 flex items-center justify-center p-2 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
          >
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => setMain((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => setMain((i) => (i + 1) % photos.length)}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
          <img
            src={photos[main]}
            alt={`Photo ${main + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
            {main + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
