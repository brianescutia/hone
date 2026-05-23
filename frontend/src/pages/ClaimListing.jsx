import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ClaimListingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get('listing');

  const [listings, setListings] = useState([]);
  const [form, setForm] = useState({
    listingId: preselected || '',
    propertyName: '',
    workEmail: '',
    companyWebsite: '',
    phoneNumber: '',
    roleTitle: '',
    proofMessage: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/listings')
      .then(({ listings }) => setListings(listings))
      .catch((err) => toast.error(err.message));
  }, [toast]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="section-cap">Claim a property</h1>
        <p className="text-sm text-ink-500 mt-2">
          Please <Link to="/manager-login" className="underline">sign in as a manager</Link> first.
        </p>
      </div>
    );
  }
  if (user.role !== 'manager') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="section-cap">Claim a property</h1>
        <p className="text-sm text-ink-500 mt-2">
          Property claims are for managers/leasing offices. If you're a UC Davis student,
          you don't need to claim a property — your <code>@ucdavis.edu</code> Google sign-in
          already verifies you.
        </p>
      </div>
    );
  }

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post('/manager-claims', form);
      setResult(data);
      toast.success('Claim submitted. An admin will review it shortly.');
    } catch (err) {
      if (err.status === 401) return; // global handler takes over
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="section-cap">Claim submitted</h1>
        <div className="card p-4 mt-3">
          <p className="text-sm">
            Your claim for <strong>{result.claim.propertyName}</strong> is pending admin review.
          </p>
          <p className="text-xs text-ink-500 mt-2">
            Confidence: <strong>{result.claim.confidence}</strong>. {result.claim.confidenceReason}
          </p>
          <p className="text-xs text-ink-500 mt-2">
            We'll email you when an admin makes a decision. You can also check the status
            on your <Link to="/manager" className="underline">manager dashboard</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="section-cap mb-1">Claim a property</h1>
      <p className="text-sm text-ink-500 mb-4">
        Verify that you manage this property. We score claims by checking whether your
        work email domain matches the property's website. <strong>High-confidence claims
        still require admin review</strong> — they just get reviewed faster.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <Field label="Listing to claim">
          <select
            value={form.listingId}
            onChange={(e) => update('listingId', e.target.value)}
            className="input"
            required
          >
            <option value="">Choose a property…</option>
            {listings.map((l) => (
              <option key={l._id} value={l._id} disabled={l.claimedByManager}>
                {l.name} {l.claimedByManager ? ' (already claimed)' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Property name (as you'd like it displayed)">
          <input
            type="text"
            value={form.propertyName}
            onChange={(e) => update('propertyName', e.target.value)}
            className="input"
            placeholder="e.g. Almondwood Apartments"
          />
        </Field>

        <Field label="Work email" hint="Use your business email — gmail/outlook/yahoo will score 'low confidence'.">
          <input
            type="email"
            value={form.workEmail}
            onChange={(e) => update('workEmail', e.target.value)}
            className="input"
            placeholder="leasing@yourproperty.com"
            required
          />
        </Field>

        <Field label="Property website" hint="Helps us cross-reference your work email domain.">
          <input
            type="url"
            value={form.companyWebsite}
            onChange={(e) => update('companyWebsite', e.target.value)}
            className="input"
            placeholder="https://www.yourproperty.com"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Phone number">
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => update('phoneNumber', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Your role">
            <input
              type="text"
              value={form.roleTitle}
              onChange={(e) => update('roleTitle', e.target.value)}
              className="input"
              placeholder="e.g. Leasing Manager"
            />
          </Field>
        </div>

        <Field label="Anything else? (optional)" hint="Help our admin verify you faster.">
          <textarea
            rows={4}
            value={form.proofMessage}
            onChange={(e) => update('proofMessage', e.target.value)}
            className="input rounded-2xl"
            placeholder="e.g. I've worked at this property since 2022. You can verify via the leasing office number listed on our website."
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit claim for review'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </label>
  );
}
