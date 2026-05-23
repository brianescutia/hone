import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Stars from '../components/Stars.jsx';
import PhotoGallery from '../components/PhotoGallery.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import SubleaseCard from '../components/SubleaseCard.jsx';
import ExpenseCalculator from '../components/ExpenseCalculator.jsx';
import CommuteTimes from '../components/CommuteTimes.jsx';
import { ListingBadge, ListingTrustNote, UserBadge } from '../components/Badges.jsx';
import ListingClaimBadge from '../components/ListingClaimBadge.jsx';
import { ListingImage } from '../components/ImagePreviewInput.jsx';
import ReportButton from '../components/ReportButton.jsx';
import SafetyNotice from '../components/SafetyNotice.jsx';

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePlan, setActivePlan] = useState('all');
  const [tab, setTab] = useState('amenities');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/listings/${id}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function startConversation(target, label, opts = {}) {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'student' && !user.studentVerified) {
      toast.error('Verify your UC Davis email to message users.');
      navigate('/verify-email');
      return;
    }
    try {
      const { conversation } = await api.post('/conversations', {
        otherUserId: target,
        listingId: data.listing._id,
        subleaseId: opts.subleaseId || null,
        contextLabel: label,
      });
      navigate(`/messages?c=${conversation._id}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  if (error) return <div className="p-12 text-center text-red-600">Error: {error}</div>;
  if (!data) return null;

  const { listing, subleases, reviews, similar } = data;
  const plans = listing.floorPlans || [];
  const visiblePlans =
    activePlan === 'all' ? plans : plans.filter((p) => p.bedrooms === Number(activePlan));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top — gallery + summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <button onClick={() => navigate(-1)} className="btn-ghost mb-3">
            ← Back
          </button>
          <PhotoGallery photos={listing.photos} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ListingClaimBadge listing={listing} />
          </div>
          <div className="flex flex-wrap items-baseline gap-3 mt-2">
            <h1 className="text-2xl sm:text-3xl font-semibold">{listing.name}</h1>
            <Stars value={listing.rating} size="lg" showNumber />
          </div>
          <p className="text-ink-500 mt-1">{listing.address}</p>
          <p className="text-lg mt-2">
            <span className="font-semibold">${listing.priceMin.toLocaleString()}</span>
            <span className="text-ink-500"> /month</span>
            <span className="text-xs text-ink-500 ml-2">
              lowest price (per total apartment)
            </span>
          </p>
          <div className="text-sm text-ink-700 mt-1 space-y-0.5">
            {listing.contactPhone && <div>Phone: {listing.contactPhone}</div>}
            {listing.contactEmail && <div>Email: {listing.contactEmail}</div>}
          </div>

          <ListingTrustNote listing={listing} />

          <div className="grid grid-cols-3 gap-2 mt-4">
            <SummaryBox title="Price / month">
              ${listing.priceMin.toLocaleString()}
              {listing.priceMax > listing.priceMin && ` – $${listing.priceMax.toLocaleString()}`}
            </SummaryBox>
            <SummaryBox title="Bed & bath">
              {listing.bedroomsMin}
              {listing.bedroomsMax !== listing.bedroomsMin && `–${listing.bedroomsMax}`} bd ·{' '}
              {listing.bathroomsMin}
              {listing.bathroomsMax !== listing.bathroomsMin && `–${listing.bathroomsMax}`} ba
            </SummaryBox>
            <SummaryBox title="Key amenities">
              {(listing.keyAmenities || []).slice(0, 2).join(', ') || '—'}
            </SummaryBox>
          </div>

          {listing.description && (
            <p className="text-sm text-ink-700 leading-relaxed mt-4">
              {listing.description}
            </p>
          )}

          {/* Contact panels */}
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <div className="bg-sky-100 rounded-xl p-4 text-sm">
              <div className="font-semibold mb-1">Contact management</div>
              {listing.contactPhone && <div>{listing.contactPhone}</div>}
              {listing.contactEmail && <div className="break-all">{listing.contactEmail}</div>}
              {listing.officeHours && (
                <div className="text-ink-500 mt-1 text-xs">{listing.officeHours}</div>
              )}
              {listing.manager && (
                <button
                  onClick={() =>
                    startConversation(
                      listing.manager,
                      `Apartment manager — ${listing.name}`
                    )
                  }
                  className="btn-sky mt-3 w-full"
                >
                  Message manager
                </button>
              )}
            </div>
            <div className="bg-sky-100 rounded-xl p-4 text-sm">
              <div className="font-semibold mb-1">Contact a current resident</div>
              <ul className="list-disc list-inside text-xs text-ink-700 space-y-0.5">
                <li>
                  Currently {reviews.filter((r) => r.author?.studentVerified || r.author?.verified).length}{' '}
                  verified Davis students reviewed this place
                </li>
                {listing.rating > 0 && <li>{listing.rating.toFixed(1)}+ star rating</li>}
                <li>Use in-app message — don't share phone numbers publicly</li>
              </ul>
              {(() => {
                const resident = reviews.find(
                  (r) => (r.author?.studentVerified || r.author?.verified) && r.author?._id
                );
                return (
                  <button
                    disabled={!resident}
                    onClick={() =>
                      resident &&
                      startConversation(
                        resident.author._id,
                        `Verified student renter — ${listing.name}`
                      )
                    }
                    className="btn-sky mt-3 w-full disabled:opacity-50"
                  >
                    {resident ? 'Contact a current resident' : 'No residents available yet'}
                  </button>
                );
              })()}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <ReportButton targetType="listing" targetId={listing._id} />
          </div>
        </div>
      </div>

      {/* Sublease */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-cap">Sublease</h2>
        </div>
        <div className="bg-sky-100 rounded-2xl p-4">
          <p className="text-xs text-ink-700 mb-3">
            Currently <strong>{subleases.length}</strong> approved sublease
            {subleases.length === 1 ? '' : 's'} at this listing.
          </p>
          <div className="space-y-2">
            {subleases.length === 0 && (
              <div className="bg-white rounded-xl p-4 text-sm text-ink-500 text-center">
                No subleases posted yet for this listing.
              </div>
            )}
            {subleases.map((s) => (
              <SubleaseCard
                key={s._id}
                sublease={s}
                onMessage={(sub) =>
                  startConversation(
                    sub.poster._id,
                    `Verified student subleaser — ${listing.name}`,
                    { subleaseId: sub._id }
                  )
                }
              />
            ))}
          </div>
          {subleases.length > 0 && (
            <div className="mt-3">
              <SafetyNotice variant="sublease" />
            </div>
          )}
        </div>
      </section>

      {/* Pricing and floor plans */}
      {plans.length > 0 && (
        <section>
          <h2 className="section-cap mb-3">Pricing and floor plans</h2>
          <div className="card p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setActivePlan('all')}
                className={activePlan === 'all' ? 'filter-pill-active' : 'filter-pill'}
              >
                all
              </button>
              {[1, 2, 3, 4].map((n) =>
                plans.some((p) => p.bedrooms === n) ? (
                  <button
                    key={n}
                    onClick={() => setActivePlan(String(n))}
                    className={activePlan === String(n) ? 'filter-pill-active' : 'filter-pill'}
                  >
                    {n} bedroom
                  </button>
                ) : null
              )}
            </div>
            <div className="space-y-3">
              {visiblePlans.length === 0 && (
                <p className="text-sm text-ink-500">No floor plans match that filter.</p>
              )}
              {visiblePlans.map((p, i) => (
                <div key={i} className="bg-cream-50 rounded-xl p-3 sm:p-4 flex gap-4">
                  {p.imageUrl ? (
                    <ListingImage
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-32 h-32 object-cover rounded-lg bg-white"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-white grid place-items-center text-ink-500 text-xs">
                      Floor plan
                    </div>
                  )}
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-ink-700 mt-1">
                      Rental rate: ${p.price?.toLocaleString()}/mo
                    </div>
                    <div className="text-ink-500 text-xs mt-0.5">
                      Area: {p.sqft} sq.ft · Security deposit: ${p.deposit?.toLocaleString()}
                    </div>
                    {p.specialAvailability && (
                      <div className="mt-1 text-xs">
                        <strong>Special availability:</strong> {p.specialAvailability}
                      </div>
                    )}
                    {listing.contactPhone && (
                      <div className="text-xs text-ink-500 mt-1">
                        Call for pricing and move-in info: {listing.contactPhone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Amenities, fees, policies */}
      {(listing.amenities?.length || listing.feesAndPolicies?.length) ? (
        <section>
          <h2 className="section-cap mb-3">Amenities, fees, and policies</h2>
          <div className="card p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('amenities')}
                className={tab === 'amenities' ? 'filter-pill-active' : 'filter-pill'}
              >
                amenities
              </button>
              <button
                onClick={() => setTab('fees')}
                className={tab === 'fees' ? 'filter-pill-active' : 'filter-pill'}
              >
                fees and policies
              </button>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {(tab === 'amenities' ? listing.amenities : listing.feesAndPolicies)?.map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Reviews */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-cap">Reviews</h2>
          {user?.role === 'student' && user.studentVerified && (
            <button
              onClick={() => setShowReviewForm((s) => !s)}
              className="btn-primary text-xs"
            >
              {showReviewForm ? 'Cancel' : 'Leave a review'}
            </button>
          )}
        </div>
        {showReviewForm && (
          <ReviewForm
            listingId={listing._id}
            onSubmitted={(rev) => {
              setData({
                ...data,
                reviews: [
                  {
                    ...rev,
                    author: {
                      name: user.name,
                      studentVerified: user.studentVerified,
                      _id: user.id,
                    },
                  },
                  ...reviews,
                ],
              });
              setShowReviewForm(false);
              toast.success('Review posted.');
            }}
          />
        )}
        <div className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-ink-500">No reviews yet — be the first.</p>
          )}
          {reviews.map((r) => (
            <ReviewCardWithReport key={r._id} review={r} />
          ))}
        </div>
      </section>

      {/* Commute */}
      <section>
        <h2 className="section-cap mb-3">Commute times</h2>
        <CommuteTimes commute={listing.commute} />
      </section>

      {/* Expense calculator */}
      <ExpenseCalculator listing={listing} />

      {/* Similar listings */}
      {similar?.length > 0 && (
        <section>
          <h2 className="section-cap mb-3">Similar listings</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {similar.map((s) => (
              <Link
                key={s._id}
                to={`/listings/${s._id}`}
                className="card overflow-hidden hover:shadow-md transition"
              >
                <ListingImage src={s.photos?.[0]} alt={s.name} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-ink-500">{s.address}</div>
                  <div className="text-sm mt-1">${s.priceMin.toLocaleString()}+/mo</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-ink-500 text-center">
        To list a property — new apartments, subleases, etc. — visit the{' '}
        <Link to="/manager-login" className="underline">
          leaser sign-in
        </Link>
        .
      </p>
    </div>
  );
}

function ReviewCardWithReport({ review }) {
  return (
    <div className="relative group">
      <ReviewCard review={review} />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <ReportButton
          targetType="review"
          targetId={review._id}
          triggerLabel="Report"
          triggerClassName="text-xs text-ink-500 hover:text-red-600 underline"
        />
      </div>
    </div>
  );
}

function SummaryBox({ title, children }) {
  return (
    <div className="bg-sky-100 rounded-xl px-3 py-2 text-center text-sm">
      <div className="text-[10px] text-ink-500 uppercase tracking-wide">{title}</div>
      <div className="font-medium leading-tight mt-0.5">{children}</div>
    </div>
  );
}

function ReviewForm({ listingId, onSubmitted }) {
  const { toast } = useToast();
  const [overall, setOverall] = useState(5);
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [axes, setAxes] = useState({
    management: 5,
    noise: 5,
    safety: 5,
    maintenance: 5,
    value: 5,
    commute: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { review } = await api.post('/reviews', {
        listing: listingId,
        overall,
        body,
        anonymous,
        ...axes,
      });
      onSubmitted(review);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 mb-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="label">Overall:</span>
        <select
          value={overall}
          onChange={(e) => setOverall(Number(e.target.value))}
          className="input w-auto"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {Object.keys(axes).map((k) => (
          <label key={k} className="flex items-center justify-between gap-1">
            <span className="capitalize">{k}</span>
            <select
              value={axes[k]}
              onChange={(e) => setAxes({ ...axes, [k]: Number(e.target.value) })}
              className="input w-auto"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Share your honest experience…"
        className="input rounded-2xl"
        required
        minLength={20}
      />
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
        />
        Post anonymously
      </label>
      <button disabled={submitting} type="submit" className="btn-primary">
        {submitting ? 'Posting…' : 'Post review'}
      </button>
    </form>
  );
}
