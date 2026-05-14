import { useState } from 'react';

export default function PhotoGallery({ photos = [] }) {
  const [main, setMain] = useState(0);
  if (!photos.length) {
    return (
      <div className="bg-cream-100 aspect-[4/3] rounded-2xl grid place-items-center text-ink-500">
        No photos yet
      </div>
    );
  }
  return (
    <div className="bg-cream-100 rounded-2xl p-2">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
        <img
          src={photos[main]}
          alt={`Photo ${main + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {photos.slice(0, 4).map((url, i) => (
          <button
            key={i}
            onClick={() => setMain(i)}
            className={`aspect-square overflow-hidden rounded-lg bg-white border-2 ${
              i === main ? 'border-sage-400' : 'border-transparent'
            }`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {photos.length > 4 && (
        <div className="text-center mt-2 text-xs text-ink-500">
          {photos.length} photos total
        </div>
      )}
    </div>
  );
}
