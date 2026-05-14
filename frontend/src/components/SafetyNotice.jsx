// Standard hone safety copy shown on sublease pages and external-import
// listings. Keep the language consistent so students learn to recognize it.

export default function SafetyNotice({ variant = 'sublease' }) {
  return (
    <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">🛡️</span>
        <div className="flex-1">
          <p className="font-medium">Stay safe</p>
          <p className="text-ink-700 mt-1">
            Never send money before verifying the listing, touring when possible,
            and confirming lease or sublease terms in writing. If something feels
            off, use the <strong>Report</strong> button — our moderators review
            every report.
          </p>
          {variant === 'sublease' && (
            <ul className="list-disc list-inside text-xs text-ink-500 mt-2 space-y-0.5">
              <li>Meet in person or video-tour before paying.</li>
              <li>Pay via traceable methods only (Venmo with a note, bank transfer, check).</li>
              <li>Confirm the subleaser is on the actual lease.</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
