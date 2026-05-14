import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = params.get('token');
  const id = params.get('id');

  const [state, setState] = useState(token && id ? 'verifying' : 'idle');
  const [error, setError] = useState(null);
  const [resendUrl, setResendUrl] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.post('/auth/verify-email', { token, id });
        if (cancelled) return;
        await refresh();
        setState('verified');
        toast.success(
          data.alreadyVerified ? 'Already verified.' : 'Email verified!'
        );
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id, refresh, toast]);

  async function resend() {
    try {
      const data = await api.post('/auth/resend-verification');
      toast.success('We sent a new verification link to your email.');
      if (data.devVerifyUrl) setResendUrl(data.devVerifyUrl);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8">
      <div className="card p-6">
        <h1 className="section-cap mb-3">Email verification</h1>

        {state === 'verifying' && <p>Verifying your email…</p>}

        {state === 'verified' && (
          <>
            <p className="text-sm">
              ✓ Your email is verified.{' '}
              {user?.studentVerified
                ? "You're now a verified UC Davis student and can post, review, save, and message."
                : 'Note: only @ucdavis.edu emails get verified-student privileges.'}
            </p>
            <button onClick={() => navigate('/')} className="btn-primary mt-4">
              Back to browse
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <p className="text-sm text-red-600">{error}</p>
            {user && !user.emailVerified && (
              <button onClick={resend} className="btn-primary mt-3">
                Resend verification link
              </button>
            )}
          </>
        )}

        {state === 'idle' && (
          <>
            {!user ? (
              <p className="text-sm">
                <Link to="/login" className="underline">
                  Sign in
                </Link>{' '}
                first to manage your email verification.
              </p>
            ) : user.emailVerified ? (
              <p className="text-sm">✓ Your email is already verified.</p>
            ) : (
              <>
                <p className="text-sm text-ink-700">
                  We sent a verification link to <strong>{user.email}</strong>.
                  Click it to verify your address. You can use hone in the
                  meantime, but posting, reviewing, and messaging are locked
                  until your email is verified.
                </p>
                <button onClick={resend} className="btn-primary mt-3">
                  Resend verification link
                </button>
              </>
            )}
          </>
        )}

        {resendUrl && (
          <div className="mt-4 p-3 bg-cream-100 rounded-xl text-xs">
            <p className="font-medium mb-1">Dev mode — your link:</p>
            <a href={resendUrl} className="underline break-all text-sage-700">
              {resendUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
