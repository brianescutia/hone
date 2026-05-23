import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { UserBadge, ListingBadge } from '../components/Badges.jsx';
import { ListingImage } from '../components/ImagePreviewInput.jsx';

const CATEGORY_LABEL = {
  scam: 'Scam',
  harassment: 'Harassment',
  fake_listing: 'Fake listing',
  inappropriate_content: 'Inappropriate content',
  wrong_information: 'Wrong information',
  spam: 'Spam',
  other: 'Other',
};

const CONFIDENCE_CHIP = {
  high: 'bg-sage-200',
  medium: 'bg-cream-200',
  low: 'bg-red-100 text-red-900',
};

export default function AdminDashboardPage() {
  const { toast, confirm } = useToast();
  // managerClaims is the new ManagerClaim queue (separate from the legacy
  // ClaimRequest queue in `claims`). Both keys must default to [] so the
  // `.length` reads below never throw before the first fetch.
  const [data, setData] = useState({
    subleases: [],
    claims: [],
    managerClaims: [],
    reports: [],
    listings: [],
  });
  const [users, setUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  async function reload() {
    setLoading(true);
    try {
      const [p, u, l, lds] = await Promise.all([
        api.get('/admin/pending'),
        api.get('/admin/users'),
        api.get('/admin/listings'),
        api.get('/admin/external-leads?status=needs_review'),
      ]);
      // Defensive defaults: an older backend deploy might omit managerClaims.
      setData({
        subleases: p.subleases || [],
        claims: p.claims || [],
        managerClaims: p.managerClaims || [],
        reports: p.reports || [],
        listings: p.listings || [],
      });
      setUsers(u.users);
      setAllListings(l.listings);
      setLeads(lds.leads || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(label, fn, successMsg) {
    try {
      await fn();
      toast.success(successMsg || `${label} done.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function suspendUser(u) {
    const ok = await confirm({
      title: `Suspend ${u.name}?`,
      message: 'They will not be able to sign in until you unsuspend them.',
      confirmLabel: 'Suspend',
      destructive: true,
    });
    if (!ok) return;
    run('Suspend', () => api.patch(`/admin/users/${u._id}/suspend`, { reason: 'admin action' }), 'User suspended.');
  }

  const managerClaimsCount = data.managerClaims.length;
  const pendingCount =
    data.subleases.length +
    data.claims.length +
    managerClaimsCount +
    data.reports.length +
    data.listings.length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="section-cap mb-4">Admin dashboard</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ['pending', `pending (${pendingCount})`],
          ['leads', `external leads (${leads.length})`],
          ['users', `users (${users.length})`],
          ['listings', `listings (${allListings.length})`],
        ].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'filter-pill-active' : 'filter-pill'}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      {tab === 'pending' && (
        <div className="space-y-6">
          {/* Listings awaiting review (external imports) */}
          <Section title={`Pending listings (${data.listings.length})`}>
            {data.listings.length === 0 ? (
              <Empty msg="No external imports waiting on verification." />
            ) : (
              data.listings.map((l) => (
                <div key={l._id} className="card p-3 flex items-center gap-3">
                  <ListingImage src={l.photos?.[0]} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{l.name}</div>
                    <div className="text-xs text-ink-500 truncate">{l.address}</div>
                    <div className="mt-1"><ListingBadge listing={l} /></div>
                    {l.sourceUrl && (
                      <a
                        href={l.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-ink-500"
                      >
                        Source: {l.sourceName || 'link'}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      run('Verify', () => api.patch(`/admin/listings/${l._id}/verify`), 'Listing verified.')
                    }
                    className="btn-sky text-xs"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() =>
                      run(
                        'Hide',
                        () => api.patch(`/admin/listings/${l._id}/hide`, { hidden: true }),
                        'Listing hidden.'
                      )
                    }
                    className="btn-ghost text-xs text-red-600"
                  >
                    Hide
                  </button>
                </div>
              ))
            )}
          </Section>

          <Section title={`Pending subleases (${data.subleases.length})`}>
            {data.subleases.length === 0 ? (
              <Empty msg="No sublease posts waiting on moderation." />
            ) : (
              data.subleases.map((s) => (
                <div key={s._id} className="card p-3 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-ink-500">
                      {s.listing?.name} · by {s.poster?.name} ({s.poster?.email})
                    </div>
                    <div className="mt-1"><UserBadge user={s.poster} /></div>
                  </div>
                  <button
                    onClick={() =>
                      run('Approve', () => api.patch(`/admin/subleases/${s._id}/approve`), 'Sublease approved.')
                    }
                    className="btn-sky text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      run('Reject', () => api.patch(`/admin/subleases/${s._id}/reject`), 'Sublease rejected.')
                    }
                    className="btn-ghost text-xs text-red-600"
                  >
                    Reject
                  </button>
                </div>
              ))
            )}
          </Section>

          {/*
            New ManagerClaim queue. Source of truth for the property-claim
            system going forward; the legacy ClaimRequest section below stays
            wired up only so any in-flight legacy claims from before this fix
            can still be processed.
          */}
          <Section title={`Pending manager claims (${managerClaimsCount})`}>
            {managerClaimsCount === 0 ? (
              <Empty msg="No manager claims waiting." />
            ) : (
              data.managerClaims.map((c) => (
                <ManagerClaimCard key={c._id} claim={c} run={run} />
              ))
            )}
          </Section>

          {/* Legacy ClaimRequest model — kept visible until backlog drains. */}
          {data.claims.length > 0 && (
            <Section title={`Legacy claim requests (${data.claims.length})`}>
              {data.claims.map((c) => (
                <div key={c._id} className="card p-3 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm">
                      {c.manager?.name} → {c.listing?.name}
                    </div>
                    <div className="text-xs text-ink-500">
                      {c.manager?.email} · {c.company}
                    </div>
                    {c.note && (
                      <div className="text-xs italic text-ink-500 mt-1">"{c.note}"</div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      run('Approve', () => api.patch(`/admin/claims/${c._id}/approve`), 'Claim approved.')
                    }
                    className="btn-sky text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      run('Reject', () => api.patch(`/admin/claims/${c._id}/reject`), 'Claim rejected.')
                    }
                    className="btn-ghost text-xs text-red-600"
                  >
                    Reject
                  </button>
                </div>
              ))}
            </Section>
          )}

          <Section title={`Open reports (${data.reports.length})`}>
            {data.reports.length === 0 ? (
              <Empty msg="No open reports." />
            ) : (
              data.reports.map((r) => (
                <div key={r._id} className="card p-3 text-sm flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <div>
                      <span className="chip">{r.targetType}</span>{' '}
                      <span className="chip bg-amber-100 text-amber-900">
                        {CATEGORY_LABEL[r.category] || r.category}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 mt-1">
                      #{String(r.targetId).slice(-6)} reported by {r.reporter?.name}
                    </div>
                    {r.reason && <div className="text-xs mt-1">"{r.reason}"</div>}
                  </div>
                  {r.targetType === 'review' && (
                    <button
                      onClick={() =>
                        run('Remove', () => api.patch(`/admin/reviews/${r.targetId}/remove`), 'Review removed.')
                      }
                      className="btn-ghost text-xs text-red-600"
                    >
                      Remove review
                    </button>
                  )}
                  {r.targetType === 'sublease' && (
                    <button
                      onClick={() =>
                        run('Hide', () => api.patch(`/admin/subleases/${r.targetId}/hide`), 'Sublease hidden.')
                      }
                      className="btn-ghost text-xs text-red-600"
                    >
                      Hide sublease
                    </button>
                  )}
                  {r.targetType === 'listing' && (
                    <button
                      onClick={() =>
                        run(
                          'Hide',
                          () => api.patch(`/admin/listings/${r.targetId}/hide`, { hidden: true }),
                          'Listing hidden.'
                        )
                      }
                      className="btn-ghost text-xs text-red-600"
                    >
                      Hide listing
                    </button>
                  )}
                  <button
                    onClick={() =>
                      run('Resolve', () => api.patch(`/admin/reports/${r._id}/resolve`, { status: 'resolved' }), 'Report resolved.')
                    }
                    className="btn-sky text-xs"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() =>
                      run('Dismiss', () => api.patch(`/admin/reports/${r._id}/resolve`, { status: 'dismissed' }), 'Report dismissed.')
                    }
                    className="btn-ghost text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              ))
            )}
          </Section>
        </div>
      )}

      {tab === 'leads' && (
        <ExternalLeadsTab leads={leads} run={run} />
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100">
              <tr className="text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Status</th>
                <th className="p-2">Joined</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-ink-100">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 space-x-1">
                    <UserBadge user={u} />
                    {u.role === 'manager' && (
                      <span className="chip">manager: {u.managerStatus}</span>
                    )}
                    {u.suspended && <span className="chip bg-red-100 text-red-900">suspended</span>}
                  </td>
                  <td className="p-2 text-xs text-ink-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    {u.role !== 'admin' && !u.suspended && (
                      <button
                        onClick={() => suspendUser(u)}
                        className="btn-ghost text-xs text-red-600"
                      >
                        Suspend
                      </button>
                    )}
                    {u.suspended && (
                      <button
                        onClick={() =>
                          run('Unsuspend', () => api.patch(`/admin/users/${u._id}/unsuspend`), 'User unsuspended.')
                        }
                        className="btn-sky text-xs"
                      >
                        Unsuspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'listings' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {allListings.map((l) => (
            <div key={l._id} className="card p-3 flex gap-3">
              <ListingImage src={l.photos?.[0]} alt="" className="w-20 h-20 object-cover rounded-lg" />
              <div className="flex-1 text-sm min-w-0">
                <div className="font-medium truncate">{l.name}</div>
                <div className="text-xs text-ink-500 truncate">{l.address}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <ListingBadge listing={l} />
                  {l.claimedByManager && (
                    <span className="chip bg-sage-200">claimed by manager</span>
                  )}
                  {l.claimStatus === 'pending' && (
                    <span className="chip bg-cream-200">claim pending</span>
                  )}
                  {l.hidden && <span className="chip bg-red-100 text-red-900">hidden</span>}
                </div>
                <div className="text-xs mt-1">
                  Manager:{' '}
                  {l.claimedBy
                    ? `${l.claimedBy.name} (${l.claimedBy.email})`
                    : l.manager
                    ? `${l.manager.name} (${l.manager.email})`
                    : 'unclaimed'}
                </div>
                <div className="mt-2">
                  <button
                    onClick={() =>
                      run(
                        l.hidden ? 'Show' : 'Hide',
                        () => api.patch(`/admin/listings/${l._id}/hide`, { hidden: !l.hidden }),
                        l.hidden ? 'Listing visible.' : 'Listing hidden.'
                      )
                    }
                    className="btn-ghost text-xs"
                  >
                    {l.hidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Rich card for the new ManagerClaim model. Shows every signal the admin
// needs to make an approve/reject call without leaving the page:
// property + listing + manager identity, the work email and website domains
// being compared, the auto-computed confidence + its reason, any free-text
// proof message, and the current status.
function ManagerClaimCard({ claim, run }) {
  const listing = claim.listing || {};
  const manager = claim.manager || {};
  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[240px]">
          <div className="font-medium text-sm">
            {claim.propertyName || listing.name || '(unnamed property)'}
          </div>
          <div className="text-xs text-ink-500 mt-0.5">
            {listing.name && <span>Listing: <strong>{listing.name}</strong></span>}
            {listing.address && <span> · {listing.address}</span>}
          </div>

          <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <Detail label="Manager" value={manager.name} />
            <Detail label="Manager email" value={manager.email} />
            <Detail label="Work email" value={claim.workEmail} />
            <Detail
              label="Website"
              value={
                claim.companyWebsite ? (
                  <a
                    href={claim.companyWebsite}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline break-all"
                  >
                    {claim.companyWebsite}
                  </a>
                ) : null
              }
            />
            <Detail label="Email domain" value={claim.emailDomain} mono />
            <Detail label="Website domain" value={claim.websiteDomain} mono />
            {claim.roleTitle && <Detail label="Role" value={claim.roleTitle} />}
            {claim.phoneNumber && <Detail label="Phone" value={claim.phoneNumber} />}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`chip ${CONFIDENCE_CHIP[claim.confidence] || 'bg-cream-200'}`}>
              confidence: {claim.confidence}
            </span>
            <span className="chip bg-ink-100 text-ink-700">status: {claim.status}</span>
            {listing.claimStatus && listing.claimStatus !== 'unclaimed' && (
              <span className="chip bg-cream-100 text-ink-700">
                listing: {listing.claimStatus}
              </span>
            )}
          </div>

          {claim.confidenceReason && (
            <p className="text-xs text-ink-500 mt-2 italic">
              Why this confidence: {claim.confidenceReason}
            </p>
          )}
          {claim.proofMessage && (
            <div className="mt-2 rounded-xl bg-cream-100 border border-cream-300 p-2 text-xs">
              <div className="text-[10px] uppercase tracking-wide text-ink-500 mb-1">
                Proof message from manager
              </div>
              <p className="whitespace-pre-wrap break-words">{claim.proofMessage}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() =>
              run(
                'Approve',
                () => api.patch(`/admin/manager-claims/${claim._id}/approve`),
                'Manager claim approved — listing is now claimed.'
              )
            }
            className="btn-sky text-xs"
          >
            Approve
          </button>
          <button
            onClick={() => {
              // Allow the admin to leave a short rejection note that the
              // manager sees on their dashboard. An empty note is fine.
              const note =
                typeof window !== 'undefined'
                  ? window.prompt(
                      'Optional reason (shown to the manager):',
                      ''
                    )
                  : '';
              if (note === null) return; // cancelled
              run(
                'Reject',
                () =>
                  api.patch(`/admin/manager-claims/${claim._id}/reject`, {
                    adminNote: note || '',
                  }),
                'Manager claim rejected.'
              );
            }}
            className="btn-ghost text-xs text-red-600"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-ink-500">{label}: </span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="section-cap text-base mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ msg }) {
  return <p className="text-sm text-ink-500 italic">{msg}</p>;
}

function ExternalLeadsTab({ leads, run }) {
  if (leads.length === 0) {
    return (
      <div className="card p-6 text-center text-ink-500">
        <p className="text-sm">No external leads waiting on review.</p>
        <p className="text-xs mt-1">
          Import some via POST /api/admin/external-leads/import or run an Apify
          actor (if APIFY_TOKEN is configured).
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3">
        <strong>External lead — not verified.</strong> Approving creates a
        Listing draft marked <code>external_import</code> with{' '}
        <code>verificationStatus: unverified</code>. It will be visible to
        the public only after a verified UC Davis student, an approved
        manager, or admin verification claims it.
      </div>
      {leads.map((l) => (
        <div key={l._id} className="card p-3 flex flex-wrap items-start gap-3">
          {l.imageUrls?.[0] && (
            <img
              src={l.imageUrls[0]}
              alt=""
              loading="lazy"
              className="w-20 h-20 object-cover rounded-lg bg-cream-100"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-[220px] text-sm">
            <div className="font-medium truncate">{l.title || '(no title)'}</div>
            <div className="text-xs text-ink-500">
              {l.sourceName} ·{' '}
              {l.price ? `$${Number(l.price).toLocaleString()}/mo` : '—'} ·{' '}
              {l.locationText || '—'}
            </div>
            {l.description && (
              <p className="text-xs text-ink-700 mt-1 line-clamp-2">
                {l.description.slice(0, 280)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {l.sourceUrl && (
                <a
                  href={l.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs underline text-ink-500"
                >
                  Source link
                </a>
              )}
              <span className="text-xs text-ink-500">
                scraped {new Date(l.scrapedAt || l.createdAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5">
                External lead — not verified
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() =>
                run(
                  'Approve',
                  () => api.patch(`/admin/external-leads/${l._id}/approve`),
                  'Lead imported as a pending listing.'
                )
              }
              className="btn-sky text-xs"
            >
              Approve → Listing
            </button>
            <button
              onClick={() =>
                run(
                  'Duplicate',
                  () => api.patch(`/admin/external-leads/${l._id}/duplicate`),
                  'Lead marked duplicate.'
                )
              }
              className="btn-ghost text-xs"
            >
              Duplicate
            </button>
            <button
              onClick={() =>
                run(
                  'Reject',
                  () => api.patch(`/admin/external-leads/${l._id}/reject`),
                  'Lead rejected.'
                )
              }
              className="btn-ghost text-xs text-red-600"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
