export default function Stars({ value = 0, size = 'sm', showNumber = false }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill =
          i < full ? '#1F1F1F' : i === full && half ? 'url(#half)' : 'none';
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`${cls} text-ink-900`}
            fill={fill}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="#1F1F1F" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.3 5.5 21 7 14 2 9.3 9 9 12 2" />
          </svg>
        );
      })}
      {showNumber && value > 0 && (
        <span className="ml-1 text-sm text-ink-700">{value.toFixed(1)}</span>
      )}
    </span>
  );
}
