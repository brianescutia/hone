import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      const target =
        location.state?.from ||
        (user.role === 'admin' ? '/admin' : user.role === 'manager' ? '/manager' : '/');
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(target);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-sage-200 rounded-3xl p-8 shadow-soft">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="section-cap">Sign in</h1>
            <p className="text-sm text-ink-700">or create an account</p>
          </div>
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V11z" />
          </svg>
        </div>

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

          <div className="flex items-center justify-between text-xs text-ink-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Remember me
            </label>
            <a className="hover:underline" href="#">
              Forgot password?
            </a>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={submitting} className="btn-sky w-full text-base py-3">
            {submitting ? 'Signing in…' : 'Sign in'}
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

        <div className="mt-4 p-3 bg-white/60 rounded-xl text-xs text-ink-700">
          <strong>Demo:</strong> student@ucdavis.edu / password123
        </div>
      </div>
    </div>
  );
}
