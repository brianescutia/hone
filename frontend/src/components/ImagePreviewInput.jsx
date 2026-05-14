import { useState, useEffect } from 'react';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
      <rect width="200" height="150" fill="#F4EFDB"/>
      <text x="100" y="80" font-family="system-ui" font-size="12" fill="#A8A8A8" text-anchor="middle">No photo yet</text>
    </svg>`
  );

export function isLikelyImageUrl(s) {
  if (!s) return false;
  try {
    const u = new URL(s);
    if (!['http:', 'https:', 'data:'].includes(u.protocol)) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * URL input + live preview. Designed so we can swap in real file uploads
 * later without changing call sites — `value` is always a string URL or "".
 */
export default function ImagePreviewInput({
  value = '',
  onChange,
  label = 'Photo URL (optional)',
  hint,
}) {
  const [url, setUrl] = useState(value);
  const [valid, setValid] = useState(isLikelyImageUrl(value));
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => setUrl(value), [value]);

  function update(v) {
    setUrl(v);
    setErrored(false);
    setLoaded(false);
    setValid(isLikelyImageUrl(v));
    onChange(v);
  }

  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="url"
        value={url}
        onChange={(e) => update(e.target.value)}
        placeholder="https://…"
        className="input"
      />
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
      {url && !valid && (
        <p className="text-xs text-red-600 mt-1">Not a valid http(s) URL.</p>
      )}
      <div className="mt-2 w-40 h-32 rounded-lg overflow-hidden bg-cream-100 border border-ink-100">
        <img
          src={valid && !errored ? url : PLACEHOLDER}
          alt="Preview"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      </div>
      {valid && errored && (
        <p className="text-xs text-red-600 mt-1">
          Image failed to load. Check the URL is publicly accessible.
        </p>
      )}
    </label>
  );
}

export function ListingImage({ src, alt = '', className = '' }) {
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={errored || !src ? PLACEHOLDER : src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
      loading="lazy"
    />
  );
}
