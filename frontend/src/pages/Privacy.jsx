import StaticPage from '../components/StaticPage.jsx';

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy" lastUpdated="May 2026">
      <p>
        This page explains what data hone collects, why, and how to delete
        it. We've kept this plain-English on purpose. It is not a substitute
        for advice from a privacy lawyer before public launch.
      </p>

      <h2 className="font-semibold text-lg pt-2">What we collect</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          <strong>Account info.</strong> Name, email, password (stored as a
          one-way bcrypt hash — we never store or see your real password),
          role (student / manager / admin), and for managers, the company or
          property name.
        </li>
        <li>
          <strong>Verification state.</strong> Whether your email has been
          verified, whether you're a verified UC Davis student, and (for
          managers) whether your claim has been approved.
        </li>
        <li>
          <strong>Listings and subleases you post.</strong> Title,
          description, price, dates, room type, photos (as URLs you provide),
          and the listing or apartment they're attached to.
        </li>
        <li>
          <strong>Reviews you leave.</strong> Star ratings, written body, and
          whether you chose to display them anonymously.
        </li>
        <li>
          <strong>Messages.</strong> The conversations you have with other
          users on hone. We can see them in our database; we only access
          them to resolve reports or follow valid legal process.
        </li>
        <li>
          <strong>Reports.</strong> When you report a listing, sublease,
          review, or message, we store who reported what and why so our
          moderators can act on it.
        </li>
        <li>
          <strong>Saved listings.</strong> The listings you've favorited.
        </li>
        <li>
          <strong>External leads.</strong> When we import a housing lead
          from an external source, we store the source URL, title, price,
          and description for admin review. We strip out seller contact
          details before any public display.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">What we do not collect</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>We don't track you across other websites.</li>
        <li>We don't sell your data. There is no advertising business.</li>
        <li>
          We don't ask for your real address, phone number, payment info, or
          government ID. (If we add those later we'll update this page
          first.)
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">How we use it</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>To verify your account and gate posting privileges.</li>
        <li>To show your listings, subleases, and reviews to other users.</li>
        <li>To route messages between users on the platform.</li>
        <li>To moderate reports and remove bad content.</li>
        <li>
          To send you the email-verification link when you sign up. We send
          this through{' '}
          <a
            href="https://resend.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Resend
          </a>{' '}
          (subprocessor). We don't send marketing email.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">Where it lives</h2>
      <p>
        Account data, listings, subleases, reviews, messages, and reports are
        stored in a MongoDB Atlas database. The app servers run on a hosting
        provider (Render or Vercel depending on the component). We don't
        host data outside these providers.
      </p>

      <h2 className="font-semibold text-lg pt-2">Deleting your account</h2>
      <p>
        Email <strong>admin@hone.local</strong> from the address tied to your
        account and ask us to delete it. We will:
      </p>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>Delete your user record (name, email, password hash, bio).</li>
        <li>Delete your saved listings and reports you filed.</li>
        <li>
          Detach your name from reviews and subleases (we anonymize rather
          than delete so other students aren't left with broken threads, but
          you can ask us to delete instead — we'll honor that).
        </li>
        <li>
          Delete messages you've sent unless they're tied to an open
          moderation case.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">Children</h2>
      <p>
        hone is intended for university students, who are typically 18+. We
        do not knowingly collect data from anyone under 13. If you believe a
        minor has signed up, email us and we'll remove the account.
      </p>

      <h2 className="font-semibold text-lg pt-2">Contact</h2>
      <p>
        Questions? Email <strong>admin@hone.local</strong>.
      </p>
    </StaticPage>
  );
}
