import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      setLoading(false);
      return;
    }
    Promise.all([api.get('/manager-claims/mine'), api.get('/listings')])
      .then(([c, l]) => {
        setClaims(c.claims);
        // verifiedManagerFor lives on the user; cross-reference to get full listing objects.
        const verifiedSet = new Set((user.verifiedManagerFor || []).map(String));
        setListings(l.listings.filter((x) => verifiedSet.has(String(x._id))));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [user, toast]);

  if (!user) return null;
  if (user.role !== 'manager') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="section-cap">Manager dashboard</h1>
        <p className="text-sm text-ink-500 mt-2">
          This area is for property managers. If you're a UC Davis student, head to your{' '}
          <Link to="/dashboard" className="underline">student dashboard</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <header>
        <h1 className="section-cap">Manager dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">
          Welcome, {user.name}. {user.company && <>You manage <strong>{user.company}</strong>.</>}
        </p>
      </header>

      {loading && <p className="text-ink-500">Loading…</p>}

      {/* Claimed (approved) listings */}
      <section>
        <h2 className="section-cap mb-3">Your verified properties</h2>
        {listings.length === 0 ? (
          <EmptyCard
            title="No claimed listings yet"
            subtitle="Submit a claim below. Once an admin approves it, you'll be able to edit official listing details here."
          />
        ) : (
          <div className="space-y-2">
            {listings.map((l) => (
              <div key={l._id} className="card p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-ink-500">{l.address}</div>
                  <div className="mt-1 text-xs">
                    <span className="chip bg-sage-200">Verified Property Manager</span>
                  </div>
                </div>
                <Link to={`/manager/listings/${l._id}/edit`} className="btn-primary text-xs">
                  Edit official info
                </Link>
                <Link to={`/listings/${l._id}`} className="btn-ghost text-xs">
                  View public page
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending / past claims */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-cap">Your claims</h2>
          <Link to="/manager/claim-property" className="btn-primary text-xs">
            + Submit a new claim
          </Link>
        </div>
        {claims.length === 0 ? (
          <EmptyCard
            title="No claims submitted"
            subtitle="Claim a property to manage its official listing details on hone."
          />
        ) : (
          <div className="space-y-2">
            {claims.map((c) => (
              <ClaimCard key={c.id} claim={c} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-cap mb-2">What managers can and can't do</h2>
        <ul className="text-sm text-ink-700 space-y-1 list-disc list-inside">
          <li>Edit official listing details for your claimed properties only.</li>
          <li><strong>Cannot</strong> edit, delete, or hide student reviews.</li>
          <li><strong>Cannot</strong> delete or modify student subleases.</li>
          <li><strong>Cannot</strong> message students unless they message you first.</li>
          <li><strong>Cannot</strong> claim a property without admin approval.</li>
        </ul>
      </section>
    </div>
  );
}

function ClaimCard({ claim }) {
  const listing = claim.listing || {};
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">{claim.propertyName || listing.name}</div>
          <div className="text-xs text-ink-500">{listing.address}</div>
          <div className="mt-1 text-xs flex flex-wrap gap-1.5">
            <ClaimStatusChip status={claim.status} />
            <ConfidenceChip confidence={claim.confidence} />
          </div>
          {claim.status === 'pending' && (
            <p className="text-xs text-ink-500 mt-2">
              Your claim is pending admin review. Most are reviewed within 1–2 business days.
            </p>
          )}
          {claim.status === 'rejected' && claim.adminNote && (
            <p className="text-xs text-red-700 mt-2">
              Reason: {claim.adminNote}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-ink-500 grid sm:grid-cols-2 gap-1">
        <div><strong>Work email:</strong> {claim.workEmail}</div>
        {claim.companyWebsite && <div><strong>Website:</strong> {claim.companyWebsite}</div>}
        {claim.roleTitle && <div><strong>Role:</strong> {claim.roleTitle}</div>}
        {claim.phoneNumber && <div><strong>Phone:</strong> {claim.phoneNumber}</div>}
      </div>
    </div>
  );
}

function ClaimStatusChip({ status }) {
  const cls = {
    pending: 'bg-cream-200',
    approved: 'bg-sage-200',
    rejected: 'bg-red-100 text-red-900',
    revoked: 'bg-red-100 text-red-900',
  }[status] || 'bg-cream-200';
  return <span className={`chip ${cls}`}>{status}</span>;
}

function ConfidenceChip({ confidence }) {
  const cls = {
    high: 'bg-sage-200',
    medium: 'bg-cream-200',
    low: 'bg-red-100 text-red-900',
  }[confidence] || 'bg-cream-200';
  return <span className={`chip ${cls}`}>confidence: {confidence}</span>;
}

function EmptyCard({ title, subtitle }) {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-ink-500 mt-1">{subtitle}</p>
    </div>
  );
}
