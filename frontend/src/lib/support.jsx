// Centralized support-email handling.
//
// Production: read from VITE_SUPPORT_EMAIL (set in Vercel env). Without it,
// in production we return null and components hide the email line entirely
// rather than rendering a fake "admin@hone.local" address that would route
// nowhere and look unprofessional.
//
// Development: fall back to the placeholder so static pages still render
// something while you're iterating locally.

const RAW = import.meta.env.VITE_SUPPORT_EMAIL || '';
const IS_PROD = import.meta.env.PROD;

// Treat obvious fake addresses (the seeded ".local" example) as unset so
// they never leak into the prod build by accident.
function isPlaceholder(addr) {
  if (!addr) return true;
  return /@hone\.local$/i.test(addr) || /example\.com$/i.test(addr);
}

export function getSupportEmail() {
  if (RAW && !isPlaceholder(RAW)) return RAW;
  if (IS_PROD) return null;
  return 'admin@hone.local'; // dev-only placeholder
}

export function supportMailto(subject) {
  const addr = getSupportEmail();
  if (!addr) return null;
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${addr}${q}`;
}

// Convenience: render either an <a href="mailto:..."> or, when no support
// email is configured in prod, a plain instruction string. Components call
// this so they don't all reimplement the null-check.
export function SupportEmail({ subject, fallback = 'use the Report button on any listing or message' }) {
  const addr = getSupportEmail();
  if (!addr) return <span>{fallback}</span>;
  return (
    <a
      href={supportMailto(subject)}
      className="underline hover:text-ink-900"
    >
      {addr}
    </a>
  );
}
