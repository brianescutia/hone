import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const CATEGORIES = [
  { key: 'scam', label: 'Scam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'fake_listing', label: 'Fake listing' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'wrong_information', label: 'Wrong information' },
  { key: 'spam', label: 'Spam' },
  { key: 'other', label: 'Other' },
];

/**
 * Generic report dialog. Pass `targetType` and `targetId`. Renders a small
 * button by default; expanded when clicked. Use `triggerClassName` /
 * `triggerLabel` to restyle.
 */
export default function ReportButton({
  targetType,
  targetId,
  triggerLabel = 'Report',
  triggerClassName = 'btn-ghost text-xs',
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('other');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.post('/reports', {
        targetType,
        targetId,
        category,
        reason,
      });
      toast.success(data.message || 'Reported. Thanks — moderators will review.');
      setOpen(false);
      setReason('');
      setCategory('other');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[9100] grid place-items-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div>
              <h3 className="font-semibold text-lg">Report this {targetType}</h3>
              <p className="text-xs text-ink-500 mt-1">
                Reports are reviewed by hone moderators. Misuse may suspend your account.
              </p>
            </div>
            <div>
              <span className="label">Category</span>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={
                      category === c.key ? 'filter-pill-active' : 'filter-pill'
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="label">Details (optional)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="What happened?"
                className="input rounded-2xl"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
