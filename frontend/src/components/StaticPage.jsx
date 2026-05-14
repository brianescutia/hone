// Shared layout for /privacy, /terms, /safety, /about so they all read
// like real product pages rather than four bespoke one-offs.

export default function StaticPage({ title, lastUpdated, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="section-cap text-2xl mb-2">{title}</h1>
      {lastUpdated && (
        <p className="text-xs text-ink-500 mb-6">Last updated: {lastUpdated}</p>
      )}
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-ink-900">
        {children}
      </div>
    </div>
  );
}
