// Centralized trust badges for users and listings. Keeps language consistent
// across the app and makes the verification model legible to students.

export function UserBadge({ user, size = 'sm' }) {
  if (!user) return null;
  const cls = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';
  if (user.studentVerified || user.verificationStatus === 'verified_student') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sage-200 text-ink-900 ${cls}`}>
        <Check /> Verified UC Davis student
      </span>
    );
  }
  if (user.role === 'manager') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sky-200 text-ink-900 ${cls}`}>
        <Check /> Apartment manager
      </span>
    );
  }
  if (user.role === 'admin') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-ink-900 text-white ${cls}`}>
        Admin
      </span>
    );
  }
  if (user.emailVerified) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-cream-200 text-ink-700 ${cls}`}>
        Email verified
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-ink-100 text-ink-700 ${cls}`}>
      Unverified
    </span>
  );
}

export function ListingBadge({ listing, size = 'sm' }) {
  if (!listing) return null;
  const cls = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';

  if (listing.sourceType === 'external_import') {
    if (listing.verificationStatus === 'verified' || listing.verificationStatus === 'claimed') {
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-sage-200 text-ink-900 ${cls}`}>
          <Check /> Verified by hone
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 ${cls}`}>
        ! External lead — not verified by hone
      </span>
    );
  }

  if (listing.manager || listing.sourceType === 'manager_posted') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sky-200 text-ink-900 ${cls}`}>
        <Check /> Manager-posted
      </span>
    );
  }

  if (listing.sourceType === 'student_posted') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-cream-200 text-ink-700 ${cls}`}>
        Student-posted
      </span>
    );
  }

  return null;
}

// Visible note on listing detail pages — kept distinct from compact pill badges.
export function ListingTrustNote({ listing }) {
  if (!listing) return null;
  if (listing.sourceType === 'external_import' && listing.verificationStatus !== 'verified') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 mt-3">
        <strong>External lead — not verified by hone.</strong> This listing was
        imported from {listing.sourceName || 'another source'}. Details may be
        out of date. Verify directly with the property before sending money or
        signing anything.
      </div>
    );
  }
  return null;
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
