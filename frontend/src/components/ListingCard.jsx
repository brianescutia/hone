import { Link, useNavigate } from 'react-router-dom';
import Stars from './Stars.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';
import { ListingBadge } from './Badges.jsx';
import { ListingImage } from './ImagePreviewInput.jsx';

function formatPrice(min, max) {
  const hasMin = typeof min === 'number' && min > 0;
  const hasMax = typeof max === 'number' && max > 0;

  if (!hasMin && !hasMax) return 'Contact for pricing';

  if (hasMin && hasMax && min !== max) {
    return `$${min.toLocaleString()} – $${max.toLocaleString()}/mo`;
  }

  return `$${(hasMin ? min : max).toLocaleString()}+/mo`;
}

function HeartIcon({ filled, className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? '#1F1F1F' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function ListingCard({ listing, highlighted, onHover, onLeave }) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const saved =
    !!user?.savedListings?.some((id) => String(id) === String(listing._id));

  async function toggleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { savedListings } = await api.post(`/listings/${listing._id}/favorite`);
      setUser({ ...user, savedListings });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Link
      to={`/listings/${listing._id}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`block card overflow-hidden hover:shadow-md transition ${highlighted ? 'ring-2 ring-sage-400' : ''
        }`}
    >
      <div className="flex gap-3">
        <div className="w-40 h-32 sm:w-44 sm:h-36 shrink-0 bg-ink-100 overflow-hidden">
          <ListingImage
            src={listing.photos?.[0]}
            alt={listing.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 py-2 pr-2 sm:pr-3 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">
                {listing.name}
              </h3>
              <p className="text-xs text-ink-500 truncate">{listing.address}</p>
              <p className="text-sm font-medium mt-1">
                {formatPrice(listing.priceMin, listing.priceMax)}
              </p>
            </div>
            <button
              onClick={toggleSave}
              aria-label={saved ? 'Unsave' : 'Save listing'}
              className="p-1 hover:scale-110 transition"
            >
              <HeartIcon filled={saved} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2 items-center">
            <ListingBadge listing={listing} />
            {listing.tags?.includes('long term') && (
              <span className="chip-sky">long term</span>
            )}
            {listing.tags?.includes('sublease') && (
              <span className="chip-sky">sublease</span>
            )}
            <span className="chip">
              {listing.bedroomsMin === listing.bedroomsMax
                ? `${listing.bedroomsMin} bd`
                : `${listing.bedroomsMin}–${listing.bedroomsMax} bd`}{' '}
              ·{' '}
              {listing.bathroomsMin === listing.bathroomsMax
                ? `${listing.bathroomsMin} ba`
                : `${listing.bathroomsMin}–${listing.bathroomsMax} ba`}
            </span>
            {listing.petFriendly && <span className="chip-sage">pet-friendly</span>}
          </div>

          {listing.rating > 0 && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-500">
              <Stars value={listing.rating} />
              <span>
                {listing.rating.toFixed(1)} · {listing.reviewCount} reviews
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
