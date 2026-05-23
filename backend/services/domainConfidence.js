// Computes a confidence score for a manager claim by comparing the work
// email domain to the property website domain.
//
// All inputs are tolerant — bad/missing values just slide to lower
// confidence. Never throws.

const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'ymail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aim.com',
  'fastmail.com', 'fastmail.fm',
  'gmx.com', 'gmx.us',
  'mail.com', 'zoho.com', 'tutanota.com', 'tutanota.de',
  'duck.com', 'hey.com',
]);

// Suffixes we strip when reducing a hostname to its registrable domain.
// Not a full Public Suffix List, just the common ones we'll see.
const MULTI_PART_TLDS = new Set([
  'co.uk', 'co.nz', 'co.jp', 'co.in', 'co.kr', 'co.za',
  'com.au', 'com.br', 'com.mx', 'com.sg',
  'ac.uk', 'gov.uk', 'org.uk',
]);

function normalizeHost(h) {
  if (!h || typeof h !== 'string') return null;
  let s = h.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  s = s.replace(/[:?#].*$/, '');
  s = s.replace(/^www\./, '');
  return s || null;
}

function extractEmailDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const at = email.indexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return normalizeHost(email.slice(at + 1));
}

function extractWebsiteDomain(url) {
  return normalizeHost(url);
}

// Reduce host to its registrable domain. example.com → example.com,
// foo.example.com → example.com, foo.example.co.uk → example.co.uk.
function registrableDomain(host) {
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length < 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  const lastThree = parts.length >= 3 ? parts.slice(-3).join('.') : null;
  if (lastThree && MULTI_PART_TLDS.has(lastTwo)) return lastThree;
  return lastTwo;
}

function isFreeProvider(domain) {
  if (!domain) return false;
  return FREE_PROVIDERS.has(domain) || FREE_PROVIDERS.has(registrableDomain(domain));
}

// Two domains are "related" if they share a registrable domain, or one
// contains the other as a substring of length ≥ 4 (to avoid bogus
// matches on common short words).
function areRelated(emailDomain, siteDomain) {
  if (!emailDomain || !siteDomain) return false;
  if (emailDomain === siteDomain) return true;
  const eReg = registrableDomain(emailDomain);
  const sReg = registrableDomain(siteDomain);
  if (eReg && sReg && eReg === sReg) return true;

  const eLabel = (eReg || emailDomain).split('.')[0];
  const sLabel = (sReg || siteDomain).split('.')[0];
  if (eLabel && sLabel && eLabel.length >= 4 && sLabel.length >= 4) {
    if (eLabel === sLabel) return true;
    if (eLabel.includes(sLabel) || sLabel.includes(eLabel)) return true;
  }
  return false;
}

function scoreClaim({ workEmail, companyWebsite } = {}) {
  const emailDomain = extractEmailDomain(workEmail);
  const websiteDomain = extractWebsiteDomain(companyWebsite);
  const free = isFreeProvider(emailDomain);

  if (free) {
    return {
      confidence: 'low',
      emailDomain,
      websiteDomain,
      emailIsFreeProvider: true,
      domainsMatchExactly: false,
      reason: 'Work email uses a free/personal email provider.',
    };
  }

  if (!emailDomain) {
    return {
      confidence: 'low',
      emailDomain: null,
      websiteDomain,
      emailIsFreeProvider: false,
      domainsMatchExactly: false,
      reason: 'No work email provided.',
    };
  }

  if (!websiteDomain) {
    return {
      confidence: 'medium',
      emailDomain,
      websiteDomain: null,
      emailIsFreeProvider: false,
      domainsMatchExactly: false,
      reason: 'Work email is on a business domain, but no property website was provided to verify against.',
    };
  }

  const exact =
    emailDomain === websiteDomain ||
    registrableDomain(emailDomain) === registrableDomain(websiteDomain);

  if (exact) {
    return {
      confidence: 'high',
      emailDomain,
      websiteDomain,
      emailIsFreeProvider: false,
      domainsMatchExactly: true,
      reason: 'Work email domain matches the property website domain.',
    };
  }

  if (areRelated(emailDomain, websiteDomain)) {
    return {
      confidence: 'medium',
      emailDomain,
      websiteDomain,
      emailIsFreeProvider: false,
      domainsMatchExactly: false,
      reason: 'Work email domain is related to (but not an exact match for) the property website domain.',
    };
  }

  return {
    confidence: 'low',
    emailDomain,
    websiteDomain,
    emailIsFreeProvider: false,
    domainsMatchExactly: false,
    reason: 'Work email domain does not match the property website domain.',
  };
}

module.exports = {
  scoreClaim,
  extractEmailDomain,
  extractWebsiteDomain,
  registrableDomain,
  isFreeProvider,
  FREE_PROVIDERS,
};
