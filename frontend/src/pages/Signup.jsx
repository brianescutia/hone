import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function SignupPage() {
  const { register, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);

  async function handleGoogle(credential) {
    setError(null);
    try {
      const { user, googleVerification } = await loginWithGoogle(credential);
      if (googleVerification === 'verified') {
        toast.success(
          `Welcome, ${user.name.split(' ')[0]}. You're verified as a UC Davis student.`
        );
        navigate('/');
      } else {
        toast.info(
          `Signed in as ${user.email}. This isn't a UC Davis Google account — you can browse, but posting and verified reviews stay locked.`,
          { duration: 8000 }
        );
        navigate('/');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitEmail(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await register({ ...form, role: 'student' });
      // No "check your inbox" — students who go this path are explicitly
      // told to use Google to verify.
      toast.info(
        data.message ||
          'Account created. To become a verified UC Davis student, sign in with Google using your @ucdavis.edu account.',
        { duration: 8000 }
      );
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-sage-200 rounded-3xl p-8 shadow-soft">
        <h1 className="section-cap mb-1">Create an account</h1>
        <p className="text-sm text-ink-700 mb-4">
          Use your UC Davis Google account to become a verified student. Only
          verified UC Davis students can post subleases or leave verified
          reviews.
        </p>

        {/* Primary: Google */}
        <div className="bg-white/70 rounded-2xl p-4">
          <p className="text-sm font-medium mb-1">Continue with Google</p>
          <p className="text-xs text-ink-700 mb-3">
            Google will tell us your verified email. If it ends in{' '}
            <code>@ucdavis.edu</code>, you'll be marked as a verified UC Davis
            student automatically.
          </p>
          <GoogleSignInButton
            text="signup_with"
            onCredential={handleGoogle}
            onError={(e) => setError(e.message)}
          />
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-ink-100" />
          <span className="text-xs text-ink-500 uppercase">or</span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>

        {!showEmailFallback ? (
          <button
            type="button"
            onClick={() => setShowEmailFallback(true)}
            className="text-sm text-ink-700 underline"
          >
            Sign up with email/password instead (browsing only)
          </button>
        ) : (
          <>
            <p className="text-xs text-ink-700 mb-2">
              Email/password sign-up is for browsing only. To post subleases or
              leave verified reviews, use the Google button above.
            </p>
            <form onSubmit={submitEmail} className="space-y-3">
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
              <input
                type="password"
                placeholder="password (at least 6 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                required
                minLength={6}
              />
              <button disabled={submitting} className="btn-sky w-full text-base py-3">
                {submitting ? 'Creating account…' : 'Create browsing account'}
              </button>
            </form>
          </>
        )}

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
