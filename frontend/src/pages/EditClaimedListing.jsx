import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PhotoUploader from '../components/PhotoUploader.jsx';

// Mirrors the backend allowlist exactly. Updating it here without updating
// the backend route is harmless — the backend will silently drop fields
// it doesn't accept.
//
// `photos` is special-cased: handled by <PhotoUploader> below, not by the
// generic FieldRow renderer. It stays in the allowlist so the payload
// builder still picks it up correctly.
const EDITABLE = [
  { key: 'priceMin',     label: 'Price (min, $/mo)',    type: 'number' },
  { key: 'priceMax',     label: 'Price (max, $/mo)',    type: 'number' },
  { key: 'bedroomsMin',  label: 'Bedrooms (min)',       type: 'number' },
  { key: 'bedroomsMax',  label: 'Bedrooms (max)',       type: 'number' },
  { key: 'bathroomsMin', label: 'Bathrooms (min)',      type: 'number' },
  { key: 'bathroomsMax', label: 'Bathrooms (max)',      type: 'number' },
  { key: 'contactEmail', label: 'Contact email',        type: 'email' },
  { key: 'contactPhone', label: 'Contact phone',        type: 'tel' },
  { key: 'sourceUrl',    label: 'Official website',     type: 'url' },
  { key: 'officeHours',  label: 'Office hours',         type: 'text' },
  { key: 'petFriendly',  label: 'Pet friendly',         type: 'checkbox' },
  { key: 'description',  label: 'Description',          type: 'textarea' },
  { key: 'amenities',    label: 'Amenities',            type: 'list' },
  { key: 'keyAmenities', label: 'Key amenities',        type: 'list' },
  { key: 'photos',       label: 'Photos',               type: 'photos' },
];

export default function EditClaimedListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/listings/${id}`)
      .then(({ listing }) => {
        setListing(listing);
        const initial = {};
        for (const f of EDITABLE) {
          const v = listing[f.key];
          if (f.type === 'photos') {
            initial[f.key] = Array.isArray(v) ? v : [];
          } else if (f.type === 'list') {
            initial[f.key] = Array.isArray(v) ? v.join('\n') : '';
          } else if (v == null) {
            initial[f.key] = f.type === 'checkbox' ? false : '';
          } else {
            initial[f.key] = v;
          }
        }
        setForm(initial);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, toast]);

  if (loading) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  if (!listing) return null;

  const verifiedFor = (user?.verifiedManagerFor || []).map(String);
  const allowed = verifiedFor.includes(String(id));
  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="section-cap">Not authorized</h1>
        <p className="text-sm text-ink-500 mt-2">
          You can only edit listings you have a verified manager claim for.{' '}
          <Link to={`/manager/claim-property?listing=${id}`} className="underline">
            Submit a claim
          </Link>{' '}
          and wait for admin approval.
        </p>
      </div>
    );
  }

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Build the update payload — convert lists from textarea back to arrays,
      // skip unchanged numeric fields that are NaN, photos stay as array.
      const payload = {};
      for (const f of EDITABLE) {
        const v = form[f.key];
        if (f.type === 'photos') {
          payload[f.key] = Array.isArray(v) ? v : [];
        } else if (f.type === 'list') {
          payload[f.key] = String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
        } else if (f.type === 'number') {
          if (v === '' || v == null) continue;
          const n = Number(v);
          if (Number.isFinite(n)) payload[f.key] = n;
        } else if (f.type === 'checkbox') {
          payload[f.key] = !!v;
        } else {
          payload[f.key] = v;
        }
      }
      const data = await api.patch(`/listings/${id}`, payload);
      toast.success(
        data.autoApproved
          ? `Saved. Updated: ${data.editedFields.join(', ')}.`
          : 'Saved. Your changes are pending admin review.'
      );
      navigate('/manager');
    } catch (err) {
      if (err.status === 401) return;
      if (err.status === 403) {
        toast.error('You can only edit listings you have a verified claim for.');
        return;
      }
      if (err.status === 503) {
        toast.error('Manager edits are temporarily disabled. Contact your hone admin.');
        return;
      }
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h1 className="section-cap mb-1">Edit official listing info</h1>
          <p className="text-sm text-ink-500">{listing.name}</p>
        </div>
        <span className="chip bg-sage-200 text-xs">Verified Property Manager</span>
      </div>

      <p className="text-xs text-ink-500 mb-4">
        These fields appear on the public listing as <strong>official, property-provided info</strong>.
        Student reviews and student-posted subleases are separate and you cannot edit them.
      </p>

      <form onSubmit={save} className="space-y-3">
        {EDITABLE.map((f) =>
          f.type === 'photos' ? (
            <PhotoUploader
              key={f.key}
              value={form[f.key] || []}
              onChange={(urls) => update(f.key, urls)}
              max={8}
              maxBytes={5 * 1024 * 1024}
              label="Listing photos"
              hint="Up to 8 photos. The first is used as the cover. Existing photos appear as previews — remove or reorder freely."
            />
          ) : (
            <FieldRow
              key={f.key}
              field={f}
              value={form[f.key]}
              onChange={(v) => update(f.key, v)}
            />
          )
        )}

        <div className="sm:relative fixed bottom-0 left-0 right-0 bg-white sm:bg-transparent border-t sm:border-0 border-ink-100 p-3 sm:p-0 sm:pt-2 flex gap-2 z-30">
          <button disabled={saving} className="btn-primary flex-1 sm:flex-none">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={() => navigate('/manager')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldRow({ field, value, onChange }) {
  return (
    <label className="block">
      <span className="label">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea rows={4} value={value || ''} onChange={(e) => onChange(e.target.value)} className="input rounded-2xl" />
      ) : field.type === 'list' ? (
        <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} className="input rounded-2xl" placeholder="One per line" />
      ) : field.type === 'checkbox' ? (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      ) : (
        <input type={field.type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="input" />
      )}
    </label>
  );
}
