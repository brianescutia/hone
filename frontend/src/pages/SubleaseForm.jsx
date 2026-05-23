import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import ImagePreviewInput from '../components/ImagePreviewInput.jsx';
import SafetyNotice from '../components/SafetyNotice.jsx';

const EMPTY = {
  listing: '',
  title: '',
  roomType: 'private room',
  bathroomType: 'shared',
  startDate: '',
  endDate: '',
  price: '',
  utilitiesIncluded: false,
  utilitiesEstimate: '',
  roommates: 0,
  furnished: false,
  parking: false,
  petPolicy: '',
  genderPreference: 'any',
  description: '',
  photos: [],
  contactPreference: 'in_app_message',
  contactDetail: '',
  status: 'available',
};

function validate(form) {
  const errs = {};
  if (!form.listing) errs.listing = 'Choose a complex.';
  if (!form.title?.trim()) errs.title = 'Title is required.';
  if (!form.description || form.description.trim().length < 30)
    errs.description = 'Description must be at least 30 characters.';
  if (!form.contactPreference) errs.contactPreference = 'Pick how you want to be contacted.';

  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;
  if (!start || isNaN(start)) errs.startDate = 'Start date is required.';
  if (!end || isNaN(end)) errs.endDate = 'End date is required.';
  if (start && end && start >= end) errs.endDate = 'End date must be after start date.';

  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) errs.price = 'Price must be a positive number.';
  if (Number.isFinite(price) && (price < 100 || price > 10000))
    errs.price = 'Price must be between $100 and $10,000 per month.';

  if (
    form.contactPreference &&
    form.contactPreference !== 'in_app_message' &&
    !form.contactDetail?.trim()
  )
    errs.contactDetail = 'Add the email or phone number to use for contact.';

  return errs;
}

export default function SubleaseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/listings'),
      isEdit ? api.get(`/subleases/${id}`) : Promise.resolve(null),
    ])
      .then(([ls, sub]) => {
        setListings(ls.listings);
        if (sub) {
          const s = sub.sublease;
          setForm({
            ...EMPTY,
            ...s,
            listing: s.listing?._id || s.listing,
            startDate: s.startDate?.slice(0, 10),
            endDate: s.endDate?.slice(0, 10),
            photos: s.photos || [],
          });
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, toast]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/subleases/${id}`, form);
        toast.success('Sublease updated.');
      } else {
        const data = await api.post('/subleases', form);
        toast.success(
          data.message || 'Your sublease is pending review.',
          { duration: 6000 }
        );
      }
      navigate('/dashboard');
    } catch (err) {
      // 401 = stale or missing token. The global unauthorized handler in
      // AuthContext already cleared localStorage and is navigating to
      // /login, so we don't need to show our own toast here.
      if (err.status === 401) return;
      // 403 = logged in but not a verified UC Davis student. Show the
      // canonical message rather than the server's full sentence.
      if (err.status === 403) {
        toast.error('Only verified UC Davis students can post subleases.');
        return;
      }
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-ink-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="section-cap mb-1">{isEdit ? 'Edit sublease' : 'Post a sublease'}</h1>
      {!isEdit && (
        <p className="text-sm text-ink-500 mb-4">
          Subleases are reviewed by hone moderators before going public. Most are approved within a day.
        </p>
      )}

      <SafetyNotice variant="sublease" />

      <form onSubmit={submit} className="space-y-3 mt-4">
        <Field label="Apartment complex" error={errors.listing}>
          <select
            value={form.listing}
            onChange={(e) => update('listing', e.target.value)}
            className="input"
            required
          >
            <option value="">Select a complex…</option>
            {listings.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title" error={errors.title}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Summer sublease — private room in 3BR"
            className="input"
            required
            maxLength={120}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Room type">
            <select
              value={form.roomType}
              onChange={(e) => update('roomType', e.target.value)}
              className="input"
            >
              {['private room', 'shared room', 'studio', 'whole unit'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Bathroom">
            <select
              value={form.bathroomType}
              onChange={(e) => update('bathroomType', e.target.value)}
              className="input"
            >
              <option value="private">private</option>
              <option value="shared">shared</option>
            </select>
          </Field>
          <Field label="Start date" error={errors.startDate}>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update('startDate', e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="End date" error={errors.endDate}>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Monthly price ($)" error={errors.price}>
            <input
              type="number"
              value={form.price}
              onChange={(e) => update('price', e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
              min="100"
              max="10000"
              required
            />
          </Field>
          <Field label="Number of roommates">
            <input
              type="number"
              value={form.roommates}
              onChange={(e) => update('roommates', Number(e.target.value))}
              className="input"
              min="0"
              max="10"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.utilitiesIncluded}
              onChange={(e) => update('utilitiesIncluded', e.target.checked)}
            />
            Utilities included
          </label>
          {!form.utilitiesIncluded && (
            <label className="flex items-center gap-2">
              Est. utilities $:
              <input
                type="number"
                value={form.utilitiesEstimate}
                onChange={(e) =>
                  update('utilitiesEstimate', e.target.value === '' ? '' : Number(e.target.value))
                }
                className="input w-24"
                min="0"
              />
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.furnished}
              onChange={(e) => update('furnished', e.target.checked)}
            />
            Furnished
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.parking}
              onChange={(e) => update('parking', e.target.checked)}
            />
            Parking
          </label>
        </div>

        <Field label="Pet policy">
          <input
            type="text"
            value={form.petPolicy}
            onChange={(e) => update('petPolicy', e.target.value)}
            placeholder="e.g. No pets / Cats allowed"
            className="input"
          />
        </Field>

        <Field label="Gender preference (optional)">
          <select
            value={form.genderPreference}
            onChange={(e) => update('genderPreference', e.target.value)}
            className="input"
          >
            {['any', 'female', 'male', 'non-binary'].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Description"
          error={errors.description}
          hint={`${form.description?.length || 0}/30+ characters`}
        >
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            placeholder="Describe the room, vibe of the apartment, what's nearby, what makes this sublease worth taking."
            className="input rounded-2xl"
          />
        </Field>

        <Field label="Contact preference" error={errors.contactPreference}>
          <div className="grid sm:grid-cols-4 gap-2">
            {[
              ['in_app_message', 'In-app message'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['text', 'Text'],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => update('contactPreference', k)}
                className={
                  form.contactPreference === k ? 'filter-pill-active' : 'filter-pill'
                }
              >
                {l}
              </button>
            ))}
          </div>
        </Field>

        {form.contactPreference !== 'in_app_message' && (
          <Field label="Contact detail" error={errors.contactDetail}>
            <input
              type="text"
              value={form.contactDetail}
              onChange={(e) => update('contactDetail', e.target.value)}
              placeholder={
                form.contactPreference === 'email'
                  ? 'your@ucdavis.edu'
                  : '(555) 555-5555'
              }
              className="input"
            />
            <p className="text-xs text-ink-500 mt-1">
              Only shown to verified UC Davis students who view your post.
            </p>
          </Field>
        )}

        <ImagePreviewInput
          value={form.photos[0] || ''}
          onChange={(v) => update('photos', v ? [v] : [])}
          label="Photo (optional)"
          hint="Paste a public image URL. We'll add real uploads in a future release."
        />

        {isEdit && (
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="input"
            >
              <option value="available">available</option>
              <option value="pending">pending</option>
              <option value="taken">taken</option>
            </select>
          </Field>
        )}

        <div className="flex gap-2 pt-2">
          <button disabled={submitting} className="btn-primary">
            {submitting
              ? 'Saving…'
              : isEdit
              ? 'Save changes'
              : 'Submit for review'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, error, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </label>
  );
}
