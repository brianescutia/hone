import StaticPage from '../components/StaticPage.jsx';
import { SupportEmail } from '../lib/support.jsx';

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Service" lastUpdated="May 2026">
      <p className="italic text-ink-700">
        These are practical product terms for an early-stage UC Davis housing
        platform. They are not legal advice and should be replaced with
        lawyer-reviewed terms before any commercial or paid launch.
      </p>

      <h2 className="font-semibold text-lg pt-2">1. Who can use hone</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          You must be 18 or older, or a UC Davis student who is at least the
          age of majority in your state.
        </li>
        <li>
          You can browse without an account. To post a sublease, leave a
          verified review, save listings, or message other users, you need
          to sign up.
        </li>
        <li>
          To post a sublease or leave a verified student review, you must
          use a <code>@ucdavis.edu</code> email and click the verification
          link we send you.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">2. What you post is on you</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          You own and are responsible for everything you post: listings,
          subleases, reviews, messages, and report content.
        </li>
        <li>
          By posting, you grant hone a non-exclusive license to display it
          on the platform.
        </li>
        <li>
          Don't post things that aren't true. Don't post photos you don't
          have the right to use. Don't post personal info about other
          people. Don't post listings you're not actually authorized to
          sublease or rent.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">3. What we don't do</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          We don't sign leases, broker rentals, escrow money, or
          background-check anyone. hone is a discovery and communication
          tool.
        </li>
        <li>
          We don't guarantee that listings are accurate, that subleases are
          available, that the people you message are who they say they are,
          or that anyone will respond.
        </li>
        <li>
          External imported listings are explicitly labeled unverified. We
          do not vouch for them. Confirm everything directly with the
          original source.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">4. Don't do these things</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>Scams, fake listings, fraud, money laundering. Obviously.</li>
        <li>Harassment, hate speech, threats, or stalking other users.</li>
        <li>
          Spam, mass-posting, automated scraping of our pages, or trying to
          bypass our rate limits.
        </li>
        <li>
          Impersonating a UC Davis student you are not, or an apartment
          manager you don't actually represent.
        </li>
        <li>
          Attempting to break into other users' accounts, exploit security
          bugs without disclosing them, or run automated traffic against our
          API.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">5. Moderation</h2>
      <p>
        We can remove content, hide listings, suspend accounts, and reject
        manager claims at our discretion if we believe they violate these
        terms or are harmful to other users. We try to be fair; we don't
        promise a formal appeals process at this stage.
      </p>

      <h2 className="font-semibold text-lg pt-2">6. Disclaimers</h2>
      <p>
        hone is provided "as is" without warranty of any kind. We don't
        promise the site will be available, bug-free, or that any listing
        you find through us will work out. Your use of hone is at your own
        risk. To the maximum extent allowed by law, hone is not liable for
        any indirect, incidental, or consequential damages — including
        damages from a housing arrangement you make with another user.
      </p>

      <h2 className="font-semibold text-lg pt-2">7. Changes</h2>
      <p>
        We can update these terms. We'll bump the "Last updated" date at the
        top and post a notice in-app when changes are material. Continued
        use after a change means you accept the new terms.
      </p>

      <h2 className="font-semibold text-lg pt-2">8. Contact</h2>
      <p>
        Email <SupportEmail subject="hone — terms question" /> for anything
        related to these terms.
      </p>
    </StaticPage>
  );
}
