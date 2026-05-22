import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

// Only show demo credentials in dev OR if the operator explicitly opts in.
const SHOW_DEMO =
  import.meta.env.DEV ||
  import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function destinationFor(user) {
    return (
      location.state?.from ||
      (user.role === 'admin' ? '/admin' : user.role === 'manager' ? '/manager' : '/')
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(destinationFor(user));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle(credential) {
    setError(null);
    try {
      const { user, googleVerification } = await loginWithGoogle(credential);
      if (googleVerification === 'verified') {
        toast.success(`Welcome, ${user.name.split(' ')[0]}. You're verified as a UC Davis student.`);
      } else {
        toast.info(
          `Signed in as ${user.email}. This isn't a UC Davis Google account, so posting and verified reviews stay locked.`,
          { duration: 7000 }
        );
      }
      navigate(destinationFor(user));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-sage-200 rounded-3xl p-8 shadow-soft">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="section-cap">Sign in</h1>
            <p className="text-sm text-ink-700">or create an account</p>
          </div>
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V11z" />
          </svg>
        </div>

        {/* Primary: Google */}
        <div className="bg-white/70 rounded-2xl p-4 mb-4">
          <p className="text-sm font-medium text-ink-900">
            Continue with Google
          </p>
          <p className="text-xs text-ink-700 mt-1 mb-3">
            Use your UC Davis Google account to become a verified student. Only
            verified UC Davis students can post subleases or leave verified reviews.
          </p>
          <GoogleSignInButton onCredential={handleGoogle} onError={(e) => setError(e.message)} />
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-ink-100" />
          <span className="text-xs text-ink-500 uppercase">or</span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>

        {/* Fallback: email/password for managers, admin, manual accounts */}
        <p className="text-xs text-ink-700 mb-2">
          Email/password sign-in (for managers and admin accounts).
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
            required
            minLength={6}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={submitting} className="btn-sky w-full text-base py-3">
            {submitting ? 'Signing in…' : 'Sign in with email'}
          </button>
        </form>

        <div className="mt-4 text-sm text-ink-700 space-y-1">
          <p>
            Not already a user?{' '}
            <Link to="/signup" className="font-semibold hover:underline">
              Create an account
            </Link>
          </p>
          <p>
            Creating a leasing account?{' '}
            <Link to="/manager-login" className="font-semibold hover:underline">
              Apply here
            </Link>
          </p>
        </div>

        {SHOW_DEMO && (
          <div className="mt-4 p-3 bg-white/60 rounded-xl text-xs text-ink-700">
            <strong>Demo (dev only):</strong> student@ucdavis.edu / password123
          </div>
        )}
      </div>
    </div>
  );
}
