function Icon({ kind }) {
  const props = {
    viewBox: '0 0 24 24',
    className: 'w-5 h-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (kind) {
    case 'bus':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M3 11h18M7 18v2M17 18v2" />
          <circle cx="8" cy="15.5" r="1" fill="currentColor" />
          <circle cx="16" cy="15.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'car':
      return (
        <svg {...props}>
          <path d="M5 13l1.5-4A2 2 0 0 1 8.4 7.5h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14M5 13v4h2v-2h10v2h2v-4" />
          <circle cx="7.5" cy="15.5" r="1" />
          <circle cx="16.5" cy="15.5" r="1" />
        </svg>
      );
    case 'bike':
      return (
        <svg {...props}>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l4-8h4l3 8M14 9l-2-4h-3" />
        </svg>
      );
    case 'walk':
      return (
        <svg {...props}>
          <circle cx="13" cy="4" r="1.5" />
          <path d="M9 22l3-6 3 2 2 4M11 14l-2-3 4-2 3 3" />
        </svg>
      );
  }
}

export default function CommuteTimes({ commute }) {
  if (!commute) return null;
  const rows = [
    {
      key: 'bus',
      label: commute.bus
        ? `${commute.bus.line ? `${commute.bus.line} · ` : ''}${commute.bus.stops || ''} stops`
        : null,
      mins: commute.bus?.minutes,
    },
    { key: 'car', label: commute.car ? `${commute.car.miles} mi` : null, mins: commute.car?.minutes },
    { key: 'bike', label: commute.bike ? `${commute.bike.miles} mi` : null, mins: commute.bike?.minutes },
    { key: 'walk', label: commute.walk ? `${commute.walk.miles} mi` : null, mins: commute.walk?.minutes },
  ];

  return (
    <div className="bg-cream-100 rounded-2xl p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl overflow-hidden aspect-[4/3] grid place-items-center text-ink-500 text-xs">
          {/* Placeholder map graphic */}
          <svg viewBox="0 0 200 150" className="w-full h-full">
            <rect width="200" height="150" fill="#F4EFDB" />
            <path d="M20 130 L50 100 L80 110 L120 70 L160 80 L185 40" stroke="#7FA4CC" strokeWidth="3" fill="none" />
            <circle cx="20" cy="130" r="4" fill="#1F1F1F" />
            <circle cx="185" cy="40" r="4" fill="#5F6C40" />
          </svg>
        </div>
        <div className="space-y-2">
          {rows.map((r) =>
            r.mins ? (
              <div key={r.key} className="bg-white rounded-xl px-3 py-2 flex items-center gap-3">
                <Icon kind={r.key} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{r.mins} mins</div>
                  {r.label && <div className="text-xs text-ink-500">{r.label}</div>}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
