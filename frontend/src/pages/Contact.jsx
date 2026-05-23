import { Link } from 'react-router-dom';
import StaticPage from '../components/StaticPage.jsx';
import { getSupportEmail, supportMailto, SupportEmail } from '../lib/support.jsx';

export default function ContactPage() {
  const addr = getSupportEmail();
  return (
    <StaticPage title="Contact hone" lastUpdated="May 2026">
      <p>
        hone is run by a small team. We read every message we get. We don't
        always reply within an hour, but we read them.
      </p>

      <h2 className="font-semibold text-lg pt-2">Best ways to reach us</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          <strong>Report bad content directly.</strong> If you're flagging a
          scammy listing, a sketchy sublease, a fake review, or a harassing
          message, use the in-app <strong>Report</strong> button on that
          item. It lands in our moderation queue with the right context
          attached, which is faster than email.
        </li>
        <li>
          <strong>Account problems, manager claims, deletion requests, press, partnerships:</strong>{' '}
          email <SupportEmail subject="hone support" />.
        </li>
        <li>
          <strong>Security issues:</strong> if you've found a vulnerability,
          please email <SupportEmail subject="hone security" /> with the
          details before posting anywhere public. We'll respond within a few
          days and credit you when the fix ships if you'd like.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">Common questions</h2>

      <h3 className="font-medium pt-2">"I posted a sublease but it's not showing up."</h3>
      <p>
        Subleases from verified UC Davis students go live shortly after
        posting. If you registered with email/password instead of Google, or
        your account isn't on a <code>@ucdavis.edu</code> address, you can't
        post subleases — re-sign in with your UC Davis Google account.
      </p>

      <h3 className="font-medium pt-2">"I manage an apartment, how do I take ownership of the listing?"</h3>
      <p>
        Create a leasing account on the{' '}
        <Link to="/manager-login" className="underline">leaser sign-in page</Link>,
        then submit a property claim. An admin reviews it. Claims from work
        email addresses that match the property's official website domain
        get reviewed fastest.
      </p>

      <h3 className="font-medium pt-2">"Can I delete my account?"</h3>
      <p>
        Yes. Sign in, go to your dashboard, and use the "Delete my account"
        button in the Danger zone section. See the{' '}
        <Link to="/privacy" className="underline">Privacy Policy</Link> for
        what gets deleted vs anonymized.
      </p>

      <h3 className="font-medium pt-2">"Something else?"</h3>
      <p>
        {addr
          ? <>Email <SupportEmail /> with a short description. We'll get back to you.</>
          : <>Use the Report button on whatever you're trying to flag — that's the most reliable channel right now.</>}
      </p>

      <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 mt-6 text-sm">
        <strong>One thing we will never do:</strong> ask for your password,
        your bank info, or money over email. If you ever get an email
        claiming to be from hone and asking for those, it's not us.
      </div>

      <div className="pt-4 flex gap-3">
        {supportMailto('hone support') && (
          <a href={supportMailto('hone support')} className="btn-primary">
            Email support
          </a>
        )}
        <Link to="/report-problem" className="btn-ghost">
          Report a problem
        </Link>
      </div>
    </StaticPage>
  );
}
