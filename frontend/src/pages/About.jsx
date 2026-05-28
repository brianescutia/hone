import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Team headshots
//
// Drop image files into `frontend/src/assets/team/` using the filenames
// listed in `photoFile` below (e.g. `zayd.jpg`). They will be picked up
// automatically by Vite — no other code changes needed.
//
// Supported extensions: .jpg, .jpeg, .png, .webp
// If a file is missing, that person falls back to an initials placeholder,
// so the build is safe even when no images exist yet.
// ---------------------------------------------------------------------------
const teamPhotos = import.meta.glob(
  '../assets/team/*.{jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' }
);

function resolvePhoto(filename) {
  if (!filename) return null;
  return teamPhotos[`../assets/team/${filename}`] ?? null;
}

const designTeam = [
  {
    name: 'Zayd',
    role: 'Product Manager',
    org: 'Product Space at UC Davis',
    photoFile: 'zayd.jpg',
    accent: 'bg-sage-200',
  },
  {
    name: 'Cindy',
    role: 'Product Manager',
    org: 'Product Space at UC Davis',
    photoFile: 'cindy.jpg',
    accent: 'bg-sky-200',
  },
  {
    name: 'Amelia',
    role: 'Product Manager',
    org: 'Product Space at UC Davis',
    photoFile: 'amelia.jpg',
    accent: 'bg-cream-200',
  },
  {
    name: 'Taiki',
    role: 'Product Manager',
    org: 'Product Space at UC Davis',
    photoFile: 'taiki.jpg',
    accent: 'bg-sage-100',
  },
];

const engineeringTeam = [
  {
    name: 'Brian Escutia',
    role: 'Backend Engineer',
    org: 'hone engineering',
    photoFile: 'brian.jpg',
    accent: 'bg-sky-200',
  },
  {
    name: 'Lucas Velasco',
    role: 'Frontend Engineer',
    org: 'hone engineering',
    photoFile: 'lucas.jpg',
    accent: 'bg-sage-200',
  },
];

function initialsFrom(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ name, photo, accent }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={`${name} headshot`}
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-ink-100"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full grid place-items-center font-pixel text-2xl sm:text-3xl text-ink-900 border border-ink-100 ${accent}`}
    >
      {initialsFrom(name)}
    </div>
  );
}

function PersonCard({ person }) {
  const photo = resolvePhoto(person.photoFile);
  return (
    <article className="card p-5 sm:p-6 flex flex-col items-center text-center gap-3">
      <Avatar name={person.name} photo={photo} accent={person.accent} />
      <div className="space-y-0.5">
        <h3 className="font-semibold text-ink-900">{person.name}</h3>
        <p className="text-sm text-ink-700">{person.role}</p>
        <p className="text-xs text-ink-500">{person.org}</p>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-cream-50 border-b border-ink-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="section-cap text-sm mb-3">About hone</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink-900 leading-tight">
            A calmer way to find UC Davis student housing.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink-700 leading-relaxed">
            Housing at UC Davis is scattered across Facebook groups, group
            chats, apartment websites, and one-off posts that get buried within
            a week. hone was built to pull that into one cleaner,
            student-focused experience — so finding a place to live feels less
            like piecing together a scavenger hunt and more like making a real
            decision with real information.
          </p>
        </div>
      </section>

      {/* Why we built it */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="section-cap text-sm mb-3">Why we built it</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900">
          Built around how Davis students actually look for housing.
        </h2>
        <div className="mt-5 space-y-4 text-ink-700 leading-relaxed">
          <p>
            UC Davis students deal with leases, roommates, subleases, deadlines,
            and a lot of information that lives in too many places at once. A
            sublease you saw in a group chat last week is gone today. A friend's
            recommendation lives in a screenshot. The apartment's own website
            doesn't show what it's actually like to live there.
          </p>
          <p>
            hone exists so students can move through that process faster and
            feel more confident about the choice they make — with information
            that's organized around how Davis students actually live, commute,
            and rent.
          </p>
        </div>
      </section>

      {/* Original Concept & Design Team */}
      <section className="bg-sage-50 border-y border-ink-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="section-cap text-sm mb-3">Original concept & design</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900">
            Designed by Product Space at UC Davis.
          </h2>
          <p className="mt-5 max-w-3xl text-ink-700 leading-relaxed">
            hone's original concept and design direction were created by Zayd,
            Cindy, Amelia, and Taiki through Product Space at UC Davis. As the
            original product design team, they helped shape the platform's user
            experience, visual identity, and student-centered housing approach.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {designTeam.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Team */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="section-cap text-sm mb-3">Engineering team</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900">
          Turning the design into a working platform.
        </h2>
        <p className="mt-5 max-w-3xl text-ink-700 leading-relaxed">
          This version of hone builds on the original Product Space concept by
          turning the design direction into a working web platform for UC Davis
          students. The engineering work focuses on making the site functional,
          maintainable, and ready to support real housing listings and
          student-focused tools.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl">
          {engineeringTeam.map((person) => (
            <PersonCard key={person.name} person={person} />
          ))}
        </div>
      </section>

      {/* What's Next */}
      <section className="bg-cream-50 border-t border-ink-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="section-cap text-sm mb-3">What's next</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink-900">
            Built for students, still growing.
          </h2>
          <p className="mt-5 text-ink-700 leading-relaxed">
            hone will keep improving — more real listings, better search tools,
            cleaner listing details, and a smoother housing discovery
            experience for UC Davis students. If you have feedback about what
            would actually help you find a place, we want to hear it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">
              Browse listings
            </Link>
            <Link to="/contact" className="btn-ghost">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
