function dateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  const e = new Date(end).toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

export default function SubleaseCard({ sublease, onMessage }) {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-ink-100 flex items-start gap-3">
      <span className="w-9 h-9 shrink-0 rounded-full bg-sky-200 grid place-items-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-sm">
            {sublease.poster?.name || 'Verified student'}
          </span>
          <span className="text-xs text-ink-500 capitalize">
            · {sublease.genderPreference !== 'any' ? sublease.genderPreference : ''}
          </span>
          <span className="text-xs text-ink-500">· {dateRange(sublease.startDate, sublease.endDate)}</span>
        </div>
        <p className="text-xs text-ink-700 mt-0.5">
          ${sublease.price.toLocaleString()}/month
          {sublease.utilitiesIncluded ? ' (utilities included)' : ' (utilities not included)'}
          {' · '}
          {sublease.roomType} {sublease.bathroomType === 'private' ? '· private bath' : '· shared bath'}
        </p>
        {sublease.description && (
          <p className="text-xs text-ink-500 mt-1 line-clamp-2">{sublease.description}</p>
        )}
      </div>
      <button onClick={() => onMessage?.(sublease)} className="btn-ghost text-xs px-3 py-1">
        message
      </button>
    </div>
  );
}
