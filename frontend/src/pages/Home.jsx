import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import FilterBar from '../components/FilterBar.jsx';
import ListingCard from '../components/ListingCard.jsx';
import MapView from '../components/MapView.jsx';

export default function HomePage() {
  const [filters, setFilters] = useState({});
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

  // Build query string from filters
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.longTerm) p.set('longTerm', 'true');
    if (filters.sublease) p.set('sublease', 'true');
    if (filters.bedrooms) p.set('bedrooms', String(filters.bedrooms));
    if (filters.priceMin) p.set('priceMin', String(filters.priceMin));
    if (filters.priceMax) p.set('priceMax', String(filters.priceMax));
    if (filters.rating) p.set('rating', String(filters.rating));
    if (filters.maxBusMinutes) p.set('maxBusMinutes', String(filters.maxBusMinutes));
    if (filters.petFriendly) p.set('petFriendly', 'true');
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/listings${query}`)
      .then((data) => {
        if (!cancelled) setListings(data.listings);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const hasFilters = Object.values(filters).some(
    (v) => v !== '' && v !== null && v !== undefined && v !== false
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-58px)]">
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Mobile map/list toggle */}
      <div className="lg:hidden border-b border-ink-100 px-4 py-2 flex gap-2 bg-white">
        <button
          onClick={() => setMobileView('list')}
          className={mobileView === 'list' ? 'filter-pill-active' : 'filter-pill'}
        >
          List ({listings.length})
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={mobileView === 'map' ? 'filter-pill-active' : 'filter-pill'}
        >
          Map
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map */}
        <div
          className={`lg:flex-1 lg:min-h-0 border-r border-ink-100 ${
            mobileView === 'map' ? 'flex-1' : 'hidden'
          } lg:block`}
        >
          <MapView
            listings={listings}
            highlightedId={hoverId}
            onPinClick={setHoverId}
          />
        </div>

        {/* Listings */}
        <div
          className={`lg:w-[440px] xl:w-[500px] overflow-y-auto p-4 space-y-3 bg-white ${
            mobileView === 'list' ? 'flex-1' : 'hidden'
          } lg:block`}
        >
          {loading && (
            <div className="text-center text-ink-500 py-8">Loading listings…</div>
          )}
          {error && (
            <div className="text-center text-red-600 py-8">Error: {error}</div>
          )}
          {!loading && !error && listings.length === 0 && (
            <EmptyState
              hasFilters={hasFilters}
              onClear={() => setFilters({})}
            />
          )}
          {listings.map((l) => (
            <ListingCard
              key={l._id}
              listing={l}
              highlighted={hoverId === l._id}
              onHover={() => setHoverId(l._id)}
              onLeave={() => setHoverId(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="text-center py-12 px-4 bg-cream-50 rounded-2xl border border-cream-200">
      <div className="text-3xl mb-2">🏠</div>
      <p className="text-sm font-medium">
        {hasFilters ? 'No listings match those filters' : 'No listings yet'}
      </p>
      <p className="text-xs text-ink-500 mt-1">
        {hasFilters
          ? 'Try widening your price range or clearing some filters.'
          : 'Check back soon — we add new listings every week.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="btn-ghost mt-4 text-xs">
          Clear all filters
        </button>
      )}
    </div>
  );
}
