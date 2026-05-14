import Stars from './Stars.jsx';

export default function ReviewCard({ review }) {
  const author = review.author?.name && !review.anonymous ? review.author.name : 'Anonymous';
  const verified = !review.anonymous && review.author?.verified;

  return (
    <div className="card p-4">
      <p className="text-sm leading-relaxed">"{review.body}"</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-700">
        <span className="w-6 h-6 rounded-full bg-sky-200 grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="font-medium">{author}</span>
        <Stars value={review.overall} />
        <span className="text-ink-500">·</span>
        <span className="text-ink-500">
          {verified ? 'verified renter' : 'renter'}
        </span>
      </div>
      {(review.management || review.noise || review.safety || review.maintenance || review.value || review.commute) && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-ink-700">
          {[
            ['Management', review.management],
            ['Noise', review.noise],
            ['Safety', review.safety],
            ['Maintenance', review.maintenance],
            ['Value', review.value],
            ['Commute', review.commute],
          ]
            .filter(([, v]) => !!v)
            .map(([label, v]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-ink-500">{label}</span>
                <Stars value={v} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
