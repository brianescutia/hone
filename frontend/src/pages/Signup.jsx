import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SignupPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [success, setSuccess] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Hit the API directly so we can read devVerifyUrl from the response.
      const data = await api.post('/auth/register', {
        ...form,
        role: 'student',
      });
      // Hydrate auth context via login flow (token already stored on register
      // path inside AuthContext.register; mirror that by calling register).
      await register({ ...form, role: 'student' }).catch(() => {});
      setDevLink(data.devVerifyUrl || null);
      setSuccess(true);
      toast.success(
        'Account created. Check your inbox for a verification link.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const willBeVerified = /@ucdavis\.edu$/i.test(form.email);

  if (success) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-soft border border-ink-100">
          <h1 className="section-cap mb-2">Check your inbox</h1>
          <p className="text-sm text-ink-700">
            We sent a verification link to <strong>{form.email}</strong>. Click
            it to verify your address.
          </p>
          {willBeVerified ? (
            <p className="text-sm text-sage-700 mt-2">
              Once verified, you'll be marked as a verified UC Davis student and
              can post subleases, leave reviews, save listings, and message
              residents.
            </p>
          ) : (
            <p className="text-sm text-ink-500 mt-2">
              Heads up: this email isn't an <code>@ucdavis.edu</code> address,
              so you'll be able to browse but not post, review, or message until
              you re-sign-up with a Davis email.
            </p>
          )}

          {devLink && (
            <div className="mt-5 p-3 bg-cream-100 rounded-xl text-xs border border-cream-300">
              <p className="font-medium mb-1">
                Dev mode — click your verification link:
              </p>
              <a
                href={devLink}
                className="underline break-all text-sage-700"
              >
                {devLink}
              </a>
              <p className="text-ink-500 mt-1">
                (Shown here because the server is running in development mode.
                In production this is emailed, not displayed.)
              </p>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button onClick={() => navigate('/')} className="btn-primary">
              Browse listings
            </button>
            <Link to="/verify-email" className="btn-ghost">
              Manage verification
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-sage-200 rounded-3xl p-8 shadow-soft">
        <h1 className="section-cap mb-1">Create an account</h1>
        <p className="text-sm text-ink-700 mb-5">
          Sign up with your <code>@ucdavis.edu</code> email, then click the
          verification link to unlock posting, reviewing, and messaging.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder="full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            required
          />
          <input
            type="email"
            placeholder="email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
          {form.email && (
            <p className={`text-xs ${willBeVerified ? 'text-sage-700' : 'text-ink-500'}`}>
              {willBeVerified
                ? '✓ Davis email. Once you click your verification link, you’ll be a verified UC Davis student.'
                : 'Heads up: only @ucdavis.edu emails get verified-student privileges.'}
            </p>
          )}
          <input
            type="password"
            placeholder="password (at least 6 characters)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
            required
            minLength={6}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={submitting} className="btn-sky w-full text-base py-3">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-ink-700">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
