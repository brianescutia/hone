import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ListingImage } from '../components/ImagePreviewInput.jsx';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState([]);
  const [listings, setListings] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/claims/mine'), api.get('/listings')])
      .then(([c, l]) => {
        setClaims(c.claims);
        setListings(l.listings);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const myListings = listings.filter(
    (l) => l.manager && String(l.manager) === String(user.id)
  );
  const claimable = listings.filter((l) => l.claimable);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="section-cap">Manager dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">
          {user.company} ·{' '}
          <span className="chip">{user.managerStatus}</span>
        </p>
      </div>

      {loading && <p>Loading…</p>}

      <section>
        <h2 className="section-cap mb-3">Claimed listings</h2>
        {myListings.length === 0 ? (
          <p className="text-sm text-ink-500">
            You don't manage any listings yet. Submit a claim request below.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myListings.map((l) => (
              <Link key={l._id} to={`/listings/${l._id}`} className="card overflow-hidden hover:shadow-md">
                <ListingImage src={l.photos?.[0]} className="w-full h-32 object-cover" alt={l.name} />
                <div className="p-3">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-ink-500">{l.address}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-cap">Claim a listing</h2>
          <button onClick={() => setShowClaimForm((s) => !s)} className="btn-primary text-xs">
            {showClaimForm ? 'Cancel' : '+ New claim request'}
          </button>
        </div>
        {showClaimForm && (
          <ClaimForm
            listings={claimable}
            onSubmitted={(c) => {
              setClaims([c, ...claims]);
              setShowClaimForm(false);
              toast.success('Claim request submitted. An admin will review it shortly.');
            }}
          />
        )}
        <div className="mt-3 space-y-2">
          {claims.length === 0 ? (
            <p className="text-sm text-ink-500">No claim requests submitted.</p>
          ) : (
            claims.map((c) => (
              <div key={c._id} className="card p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{c.listing?.name}</div>
                  <div className="text-xs text-ink-500">{c.listing?.address}</div>
                </div>
                <span className="chip">{c.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ClaimForm({ listings, onSubmitted }) {
  const [form, setForm] = useState({ listingId: '', phone: '', note: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { claim } = await api.post('/claims', form);
      onSubmitted(claim);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <label className="block">
        <span className="label">Listing</span>
        <select
          value={form.listingId}
          onChange={(e) => setForm({ ...form, listingId: e.target.value })}
          required
          className="input"
        >
          <option value="">Choose a listing to claim…</option>
          {listings.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Contact phone</span>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">Note to admin</span>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={3}
          className="input rounded-2xl"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={submitting} className="btn-primary">
        {submitting ? 'Submitting…' : 'Submit claim request'}
      </button>
    </form>
  );
}
