import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Bug-fix: the previous version rendered popovers as `absolute` children of an
// `overflow-x-auto` scroll container, which clipped them regardless of z-index
// (overflow clipping ignores z-index). We now render popovers via React portal
// into <body>, positioned `fixed` using the pill's getBoundingClientRect().
// This also guarantees the dropdown sits above the Leaflet map (already
// clamped to z-index ≤ 800 in index.css).

const PILLS = [
  { key: 'longTerm', label: 'long term' },
  { key: 'sublease', label: 'sublease' },
  { key: 'bedrooms', label: 'bedrooms', popup: 'bedrooms' },
  { key: 'price', label: 'price', popup: 'price' },
  { key: 'rating', label: 'rating', popup: 'rating' },
  { key: 'commute', label: 'commute', popup: 'commute' },
  { key: 'all', label: 'all filters', popup: 'all' },
];

export default function FilterBar({ filters, onChange }) {
  const [open, setOpen] = useState(null);
  const triggerRefs = useRef({}); // key -> button element

  function toggleBool(key) {
    onChange({ ...filters, [key]: !filters[key] });
  }

  function setVal(key, val) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="relative z-[2000] bg-sage-200/70 border-b border-sage-300/40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[180px] sm:min-w-[220px] sm:max-w-md w-full sm:w-auto">
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => setVal('q', e.target.value)}
            placeholder="Davis, CA"
            className="input pr-10 bg-white"
          />
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <div className="flex gap-2 items-center overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0 no-scrollbar">
          {PILLS.map((p) => {
            if (!p.popup) {
              const active = !!filters[p.key];
              return (
                <button
                  key={p.key}
                  onClick={() => toggleBool(p.key)}
                  className={`shrink-0 ${active ? 'filter-pill-active' : 'filter-pill'}`}
                >
                  {p.label}
                </button>
              );
            }
            const active = open === p.key;
            const hasValue = isPopupActive(p.popup, filters);
            return (
              <button
                key={p.key}
                ref={(el) => (triggerRefs.current[p.key] = el)}
                onClick={() => setOpen(active ? null : p.key)}
                className={`shrink-0 ${
                  hasValue || active ? 'filter-pill-active' : 'filter-pill'
                }`}
                aria-expanded={active}
                aria-haspopup="dialog"
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <Popover
          anchor={triggerRefs.current[open]}
          onClose={() => setOpen(null)}
          type={PILLS.find((p) => p.key === open)?.popup}
          filters={filters}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function isPopupActive(type, f) {
  switch (type) {
    case 'bedrooms':
      return !!f.bedrooms;
    case 'price':
      return !!(f.priceMin || f.priceMax);
    case 'rating':
      return !!f.rating;
    case 'commute':
      return !!f.maxBusMinutes;
    case 'all':
      return !!f.petFriendly;
    default:
      return false;
  }
}

// Portal-based popover. Positions itself under the trigger using fixed
// coordinates so the overflow-x-auto container above can't clip it.
function Popover({ anchor, onClose, type, filters, onChange }) {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 264 });

  useLayoutEffect(() => {
    function reposition() {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const popWidth = 264;
      const margin = 8;
      // Prefer right-align to the trigger; clamp to viewport.
      let left = r.right - popWidth;
      left = Math.max(margin, Math.min(left, window.innerWidth - popWidth - margin));
      const top = r.bottom + 6;
      setPos({ top, left, width: popWidth });
    }
    reposition();
    window.addEventListener('resize', reposition);
    // capture: true catches scrolls inside any ancestor (e.g. the pill row)
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [anchor]);

  // Click-outside + Escape to close.
  useEffect(() => {
    function onDocDown(e) {
      if (popRef.current?.contains(e.target)) return;
      if (anchor?.contains(e.target)) return; // don't immediately close on the trigger
      onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 3000, // > leaflet panes (≤800) and filter bar (2000)
      }}
      className="card p-4 shadow-lg"
    >
      {type === 'bedrooms' && <BedroomsPopup filters={filters} onChange={onChange} />}
      {type === 'price' && <PricePopup filters={filters} onChange={onChange} />}
      {type === 'rating' && <RatingPopup filters={filters} onChange={onChange} />}
      {type === 'commute' && <CommutePopup filters={filters} onChange={onChange} />}
      {type === 'all' && <AllPopup filters={filters} onChange={onChange} />}
      <div className="flex justify-end mt-3">
        <button onClick={onClose} className="text-xs text-ink-500 hover:text-ink-900">
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}

function BedroomsPopup({ filters, onChange }) {
  return (
    <div>
      <div className="label">Minimum bedrooms</div>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() =>
              onChange({ ...filters, bedrooms: filters.bedrooms === n ? null : n })
            }
            className={filters.bedrooms === n ? 'filter-pill-active' : 'filter-pill'}
          >
            {n}+
          </button>
        ))}
      </div>
    </div>
  );
}

function PricePopup({ filters, onChange }) {
  return (
    <div className="space-y-2">
      <div className="label">Monthly price range ($)</div>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          placeholder="min"
          value={filters.priceMin || ''}
          onChange={(e) =>
            onChange({ ...filters, priceMin: e.target.value ? Number(e.target.value) : null })
          }
          className="input"
        />
        <span className="text-ink-500">–</span>
        <input
          type="number"
          placeholder="max"
          value={filters.priceMax || ''}
          onChange={(e) =>
            onChange({ ...filters, priceMax: e.target.value ? Number(e.target.value) : null })
          }
          className="input"
        />
      </div>
    </div>
  );
}

function RatingPopup({ filters, onChange }) {
  return (
    <div>
      <div className="label">Minimum rating</div>
      <div className="flex gap-2 flex-wrap">
        {[3, 4, 4.5].map((r) => (
          <button
            key={r}
            onClick={() =>
              onChange({ ...filters, rating: filters.rating === r ? null : r })
            }
            className={filters.rating === r ? 'filter-pill-active' : 'filter-pill'}
          >
            {r}+
          </button>
        ))}
      </div>
    </div>
  );
}

function CommutePopup({ filters, onChange }) {
  return (
    <div>
      <div className="label">Max bus commute to UC Davis (mins)</div>
      <div className="flex gap-2 flex-wrap">
        {[5, 10, 15, 20].map((m) => (
          <button
            key={m}
            onClick={() =>
              onChange({ ...filters, maxBusMinutes: filters.maxBusMinutes === m ? null : m })
            }
            className={filters.maxBusMinutes === m ? 'filter-pill-active' : 'filter-pill'}
          >
            ≤ {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function AllPopup({ filters, onChange }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!filters.petFriendly}
          onChange={(e) => onChange({ ...filters, petFriendly: e.target.checked })}
        />
        Pet-friendly
      </label>
    </div>
  );
}
