import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { UserBadge, ListingBadge } from '../components/Badges.jsx';
import { ListingImage } from '../components/ImagePreviewInput.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function DashboardPage() {
  const { user, loginWithGoogle, logout, refresh } = useAuth();
  const { toast, confirm } = useToast();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [mySubleases, setMySubleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/users/me/saved'), api.get('/subleases/mine')])
      .then(([s, m]) => {
        setSaved(s.savedListings);
        setMySubleases(m.subleases);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  async function deleteSublease(id, title) {
    const ok = await confirm({
      title: 'Delete this sublease post?',
      message: `"${title}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.del(`/subleases/${id}`);
      setMySubleases(mySubleases.filter((s) => s._id !== id));
      toast.success('Sublease deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleGoogleUpgrade(credential) {
    try {
      const { user: updated, googleVerification } = await loginWithGoogle(credential);
      await refresh();
      if (googleVerification === 'verified') {
        toast.success(`Verified as UC Davis student. Welcome, ${updated.name.split(' ')[0]}.`);
      } else {
        toast.info(
          "Signed in, but that Google account isn't @ucdavis.edu. You can browse, but posting and verified reviews stay locked.",
          { duration: 8000 }
        );
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  const isStudent = user.role === 'student';
  const needsVerification = isStudent && !user.studentVerified;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="section-cap">Welcome back, {user.name.split(' ')[0]}</h1>
        <div className="mt-2">
          <UserBadge user={user} size="lg" />
        </div>
      </div>

      {/* Verification nudge — Google */}
      {needsVerification && (
        <div className="card p-4 border-amber-200 bg-amber-50">
          <p className="text-sm">
            <strong>Become a verified UC Davis student.</strong> Sign in with
            Google using your <code>@ucdavis.edu</code> account to unlock
            posting subleases, leaving verified reviews, saving listings, and
            messaging.
          </p>
          <div className="mt-3">
            <GoogleSignInButton
              text="continue_with"
              onCredential={handleGoogleUpgrade}
              onError={(e) => toast.error(e.message)}
            />
          </div>
        </div>
      )}

      {isStudent &&
        user.emailVerified &&
        !user.studentVerified &&
        user.verificationStatus === 'not_ucdavis' && (
          <div className="card p-4 border-cream-300 bg-cream-50">
            <p className="text-sm">
              <strong>You're signed in, but this is not a UC Davis Google account.</strong>{' '}
              You can browse listings, but you need a UC Davis account to post
              subleases or leave verified reviews. Sign out and sign back in
              with your <code>@ucdavis.edu</code> Google account if you have one.
            </p>
          </div>
        )}

      {loading && <p className="text-ink-500">Loading…</p>}

      {/* Saved listings */}
      <section>
        <h2 className="section-cap mb-3">Saved listings</h2>
        {saved.length === 0 ? (
          <EmptyState
            icon="♡"
            title="No saved listings yet"
            subtitle="Tap the heart on a listing to save it for later."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saved.map((l) => (
              <Link key={l._id} to={`/listings/${l._id}`} className="card overflow-hidden hover:shadow-md">
                <ListingImage src={l.photos?.[0]} alt={l.name} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-ink-500">{l.address}</div>
                  <div className="text-sm mt-1">${l.priceMin.toLocaleString()}+/mo</div>
                  <div className="mt-2"><ListingBadge listing={l} /></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My subleases */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-cap">My sublease posts</h2>
          {user.studentVerified && (
            <Link to="/subleases/new" className="btn-primary text-xs">
              + Post a sublease
            </Link>
          )}
        </div>
        {mySubleases.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No sublease posts yet"
            subtitle={
              user.studentVerified
                ? 'Post your first sublease — it goes live after a quick admin check.'
                : 'Verify with Google using your UC Davis account to post a sublease.'
            }
          />
        ) : (
          <div className="space-y-2">
            {mySubleases.map((s) => (
              <div key={s._id} className="card p-4 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-ink-500">
                    {s.listing?.name} · ${s.price.toLocaleString()}/mo
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <ModerationBadge value={s.moderation} />
                    <span className="chip">status: {s.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/subleases/${s._id}/edit`} className="btn-ghost text-xs">
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteSublease(s._id, s.title)}
                    className="btn-ghost text-xs text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Profile */}
      <section>
        <h2 className="section-cap mb-3">Profile</h2>
        <div className="card p-4 text-sm space-y-1">
          <div><strong>Name:</strong> {user.name}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Role:</strong> {user.role}</div>
          <div><strong>Sign-in method:</strong> {user.authProvider || 'local'}</div>
          <div><strong>Status:</strong> <UserBadge user={user} /></div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="section-cap mb-3 text-red-700">Danger zone</h2>
        <div className="card p-4 border-red-200">
          <p className="text-sm text-ink-700">
            Delete your hone account. This will hard-delete your profile,
            subleases you posted, reports you filed, and conversations.
            Reviews you've left will be anonymized.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Delete your hone account?',
                  message:
                    'Your profile, subleases, reports, and conversations will be permanently deleted. Reviews will be anonymized. This cannot be undone.',
                  confirmLabel: 'Delete my account',
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await api.del('/users/me');
                  toast.success('Account deleted. Sorry to see you go.');
                  logout();
                  navigate('/');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
              className="btn bg-red-500 text-white hover:bg-red-600 text-sm"
            >
              Delete my account
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Delete account AND wipe reviews?',
                  message:
                    'This deletes everything above PLUS your reviews. Continue?',
                  confirmLabel: 'Delete everything',
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await api.del('/users/me?wipeReviews=true');
                  toast.success('Account and reviews deleted.');
                  logout();
                  navigate('/');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
              className="btn-ghost text-sm text-red-600"
            >
              Delete + wipe reviews
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ModerationBadge({ value }) {
  if (value === 'approved') return <span className="chip bg-sage-200">approved</span>;
  if (value === 'rejected') return <span className="chip bg-red-100 text-red-900">rejected</span>;
  return <span className="chip bg-cream-200">pending review</span>;
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-8 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-ink-500 mt-1">{subtitle}</p>
    </div>
  );
}
