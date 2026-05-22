import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const SHOW_DEMO =
  import.meta.env.DEV ||
  import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

export default function ManagerLoginPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const user = await login(form.email, form.password);
        if (user.role !== 'manager')
          throw new Error("That account isn't a manager account. Use the regular sign-in instead.");
        toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
        navigate('/manager');
      } else {
        await register({ ...form, role: 'manager' });
        toast.success('Application submitted. An admin will review your account shortly.');
        navigate('/manager');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-cream-50 grid place-items-center p-4">
      <div className="w-full max-w-lg bg-sage-200 rounded-3xl p-8 shadow-soft">
        <h1 className="section-cap mb-1">
          {mode === 'signin' ? 'Sign in to leaser account' : 'Apply for a leaser account'}
        </h1>
        <p className="text-sm text-ink-700 mb-5">
          {mode === 'signin'
            ? 'For apartment managers and leasing offices.'
            : 'Your account will be reviewed before you can claim a listing.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          )}
          <input
            type="email"
            placeholder="email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            required
          />
          <input
            type="text"
            placeholder="company / apartment complex"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="input"
            required={mode === 'signup'}
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
            {submitting ? '…' : mode === 'signin' ? 'Sign in' : 'Submit application'}
          </button>
        </form>

        <div className="mt-4 text-sm text-ink-700 space-y-1">
          <p>
            {mode === 'signin' ? 'New leaser?' : 'Already a leaser?'}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-semibold hover:underline"
            >
              {mode === 'signin' ? 'Apply here' : 'Sign in'}
            </button>
          </p>
          <p>
            Not a leaser?{' '}
            <Link to="/login" className="font-semibold hover:underline">
              Return to renter sign-in
            </Link>
          </p>
        </div>

        {SHOW_DEMO && (
          <div className="mt-4 p-3 bg-white/60 rounded-xl text-xs text-ink-700">
            <strong>Demo (dev only):</strong> manager@almondwood.com / password123
          </div>
        )}
      </div>
    </div>
  );
}
