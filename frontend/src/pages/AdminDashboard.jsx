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

export default function AdminDashboardPage() {
  const { toast, confirm } = useToast();
  const [data, setData] = useState({ subleases: [], claims: [], reports: [], listings: [] });
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
      setData(p);
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

  const pendingCount =
    data.subleases.length + data.claims.length + data.reports.length + data.listings.length;

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

          <Section title={`Pending manager claims (${data.claims.length})`}>
            {data.claims.length === 0 ? (
              <Empty msg="No claim requests waiting." />
            ) : (
              data.claims.map((c) => (
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
              ))
            )}
          </Section>

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
                  {l.hidden && <span className="chip bg-red-100 text-red-900">hidden</span>}
                </div>
                <div className="text-xs mt-1">
                  Manager:{' '}
                  {l.manager ? `${l.manager.name} (${l.manager.email})` : 'unclaimed'}
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
