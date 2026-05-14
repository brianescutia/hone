import StaticPage from '../components/StaticPage.jsx';

export default function AboutPage() {
  return (
    <StaticPage title="About hone" lastUpdated="May 2026">
      <p>
        <strong>hone is a UC Davis–first student housing discovery platform.</strong>{' '}
        We focus on the things that actually matter for Davis students: real
        commute times to campus, verified student reviews, sublease postings
        from people you can verify are actually UC Davis students, and a way
        to compare apartments without wading through a generic national
        rental site.
      </p>

      <h2 className="font-semibold text-lg pt-2">What makes hone different</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          Only verified <code>@ucdavis.edu</code> students can post subleases
          and leave verified reviews. We send a real email-verification link
          — typing a Davis email isn't enough on its own.
        </li>
        <li>
          Every listing shows a commute panel built for Davis: bus minutes on
          Unitrans, bike minutes, walking distance, and driving time.
        </li>
        <li>
          External imports (from off-platform sources) are labeled clearly as
          unverified and never get the same trust badge as a student- or
          manager-posted listing until a real person reviews them.
        </li>
        <li>
          Apartment managers can claim their property only after admin
          approval — no one can speak for an apartment they don't actually
          represent.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">What hone is not</h2>
      <ul className="list-disc list-inside space-y-2 ml-2">
        <li>
          We're not Zillow. We don't try to cover every rental in the country
          — we cover Davis, well.
        </li>
        <li>
          We don't act as a broker or property manager. We don't take a cut
          of rent.
        </li>
        <li>
          We don't sign leases for you. Every sublease and rental is between
          you and the other party. Always read the lease yourself.
        </li>
      </ul>

      <h2 className="font-semibold text-lg pt-2">Get in touch</h2>
      <p>
        Built by students, for students. If you spot a bug, want to suggest a
        feature, or run an apartment complex near Davis and want to claim
        your listing, email <strong>admin@hone.local</strong> (replace with
        your real address before launch).
      </p>
    </StaticPage>
  );
}
