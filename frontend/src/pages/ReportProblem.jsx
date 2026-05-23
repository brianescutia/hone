import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getSupportEmail, supportMailto } from '../lib/support.jsx';

// Free-form "report a problem" page. The in-listing Report button is the
// right tool for "this specific listing is fake" cases; this page handles
// everything else: bugs, abuse you can't find a Report button for,
// off-platform scam attempts, ideas for the team, etc.
//
// Signed-in users have their report attached to their account (targetType:
// 'user', targetId: their own id — the admin queue treats this as a
// general inquiry). Signed-out users get a clear mailto path instead,
// since /api/reports requires auth.

const CATEGORIES = [
  { key: 'scam', label: 'Suspected scam (off-platform)' },
  { key: 'harassment', label: 'Harassment from another user' },
  { key: 'fake_listing', label: "I can't find the listing to report" },
  { key: 'wrong_information', label: 'Wrong info / outdated listing' },
  { key: 'spam', label: 'Spam / abuse' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'other', label: 'Bug, feature request, or other' },
];

export default function ReportProblemPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const supportAddr = getSupportEmail();

  const [category, setCategory] = useState('other');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <h1 className="section-cap">Report a problem</h1>
        <p className="text-sm text-ink-700">
          To submit a report through hone, sign in first. We attach reports
          to your account so our moderators can follow up if needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="btn-primary">Sign in to report</Link>
          {supportMailto('hone — report a problem') && (
            <a
              href={supportMailto('hone — report a problem')}
              className="btn-ghost"
            >
              Or email us
            </a>
          )}
        </div>
        <p className="text-xs text-ink-500">
          If you don't want to create an account, you can{' '}
          {supportAddr
            ? <>email <strong>{supportAddr}</strong> directly.</>
            : <>file the report on a specific listing or message instead — every one has a Report button.</>}
        </p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      toast.error('Please add a few sentences so our moderators can act on this.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        targetType: 'user',
        targetId: user.id,
        category,
        reason: reason.trim(),
      });
      toast.success('Thanks — your report is in the moderator queue.');
      navigate('/');
    } catch (err) {
      if (err.status === 401) return; // global handler takes over
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="section-cap mb-1">Report a problem</h1>
      <p className="text-sm text-ink-700 mb-4">
        Use this form for general issues. If you're flagging a specific
        listing, sublease, review, or message, use the <strong>Report</strong>{' '}
        button on that item instead — it gives our moderators more context.
      </p>

      <div className="rounded-xl bg-cream-100 border border-cream-300 p-3 mb-4 text-xs text-ink-700">
        Reports are reviewed by hone moderators. We don't share your identity
        with the person you're reporting. Misuse (false reports, flooding)
        may lead to your account being suspended — see{' '}
        <Link to="/terms" className="underline">Terms</Link>.
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="label">What's going on?</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={category === c.key ? 'filter-pill-active text-left' : 'filter-pill text-left'}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Tell us more</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
            maxLength={1000}
            required
            placeholder="What happened? Who was involved? Any links, listing names, or dates that would help us investigate."
            className="input rounded-2xl"
          />
          <p className="text-xs text-ink-500 mt-1">{reason.length}/1000 characters</p>
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
          <Link to="/" className="btn-ghost">Cancel</Link>
        </div>
      </form>

      <div className="mt-8 text-xs text-ink-500">
        For account deletion requests, use the Danger zone on your{' '}
        <Link to="/dashboard" className="underline">dashboard</Link>. For
        security disclosures, see <Link to="/contact" className="underline">Contact</Link>.
      </div>
    </div>
  );
}
