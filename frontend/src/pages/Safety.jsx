import StaticPage from '../components/StaticPage.jsx';

export default function SafetyPage() {
  return (
    <StaticPage title="Staying safe on hone" lastUpdated="May 2026">
      <p>
        Housing platforms attract scams. Subleases especially — they're
        short-term, high-trust, and often arranged sight-unseen. The
        guidelines below are the same ones experienced student renters
        already follow. None of them is paranoid; all of them have saved
        someone money in the past year.
      </p>

      <h2 className="font-semibold text-lg pt-2">Never send money before…</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          Touring the unit in person, or doing a live video call walk-through
          if you're moving from out of town.
        </li>
        <li>
          Confirming the lease or sublease terms in writing. Get a copy of
          the actual document.
        </li>
        <li>
          Verifying the person you're paying is actually the person on the
          lease. Ask to see their UC Davis student ID for subleases.
        </li>
        <li>
          Using a payment method that has some trace (Zelle to a real
          account, check, ACH). Avoid gift cards, wire transfers to private
          parties, or anything one-way and irreversible.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">Red flags</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          The price is way below market and the poster is pushing you to
          decide fast.
        </li>
        <li>
          They can't or won't meet in person or do a video tour, and have an
          excuse for every workaround you suggest.
        </li>
        <li>
          They ask for a deposit before sending the lease, or ask for the
          full sublease in cash up front.
        </li>
        <li>
          The poster's account is brand new, unverified, and has no other
          posts or activity.
        </li>
        <li>
          The listing photos are reverse-image-search hits from other rental
          sites in other cities.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">External listings</h2>
      <p>
        Some listings on hone are imported from external sources (e.g.{' '}
        apartments.com, Facebook Marketplace) and labeled{' '}
        <em>"External lead — not verified by hone."</em> These are{' '}
        <strong>not</strong> verified by us. Treat them as starting points to
        contact the source directly — don't assume the price, availability,
        or photos are accurate, and never send money based on the hone page
        alone.
      </p>

      <h2 className="font-semibold text-lg pt-2">Report problems</h2>
      <p>
        Every listing, sublease, review, and conversation has a Report
        button. If something looks like a scam, fake listing, or harassment,
        flag it. Our moderators see reports as they come in, and a few
        seconds of your time can stop a bad post from reaching the next
        student.
      </p>
      <p>
        If you can't find the item to report — or if the problem isn't tied
        to a specific listing — use the{' '}
        <a href="/report-problem" className="underline">Report a problem</a>{' '}
        page instead.
      </p>
      <p>
        If you've already been scammed and money was involved, also file a
        report with the{' '}
        <a
          href="https://www.ic3.gov/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          FBI's IC3
        </a>{' '}
        and your bank. Time matters for recovery.
      </p>

      <h2 className="font-semibold text-lg pt-2">A note on safety messaging</h2>
      <p>
        hone shows safety reminders on every sublease and external-listing
        page. They're there because they help — even experienced renters get
        rushed. Read them.
      </p>
    </StaticPage>
  );
}
