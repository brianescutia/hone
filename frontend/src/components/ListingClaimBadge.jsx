// Drop-in badge for the public listing card / detail page. Reads the
// listing's claim fields and renders the right label per the product spec:
//
//   - claimedByManager + managerVerified  → "Verified Property Manager"
//   - claimedByManager only                → "Claimed by Property"
//   - claimStatus = 'pending'              → "Claim pending review"
//   - sourceType = 'external_import'       → "External listing — not verified by hone"
//   - default (unclaimed)                  → "Unclaimed listing"
//
// Usage:
//   <ListingClaimBadge listing={listing} />

export default function ListingClaimBadge({ listing, className = '' }) {
  if (!listing) return null;

  if (listing.sourceType === 'external_import' && !listing.claimedByManager) {
    return (
      <span className={`chip bg-cream-200 text-ink-700 ${className}`} title="Imported from an external source. Verify details with the property before contacting.">
        External listing — not verified by hone
      </span>
    );
  }

  if (listing.claimedByManager && listing.managerVerified) {
    return (
      <span className={`chip bg-sage-200 ${className}`} title="A property manager has verified ownership of this listing and edits official details directly.">
        Verified Property Manager
      </span>
    );
  }

  if (listing.claimedByManager) {
    return (
      <span className={`chip bg-sage-200 ${className}`} title="A property manager has claimed this listing.">
        Claimed by Property
      </span>
    );
  }

  if (listing.claimStatus === 'pending') {
    return (
      <span className={`chip bg-cream-200 ${className}`} title="A manager has submitted a claim for this listing. An admin is reviewing it.">
        Claim pending review
      </span>
    );
  }

  return (
    <span className={`chip bg-cream-100 text-ink-500 ${className}`} title="No property manager has verified this listing. Info comes from public records and reviews.">
      Unclaimed listing
    </span>
  );
}

// Field-level helper: label a value as official (property-provided) or
// community (student-provided). Use sparingly — overusing it is noisy.
export function OfficialFieldLabel({ children = 'Property-provided', className = '' }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide text-sage-700 ${className}`}>
      {children}
    </span>
  );
}

export function CommunityFieldLabel({ children = 'Student-provided', className = '' }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide text-ink-500 ${className}`}>
      {children}
    </span>
  );
}
