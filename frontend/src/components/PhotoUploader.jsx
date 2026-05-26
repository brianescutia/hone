// frontend/src/components/PhotoUploader.jsx
//
// Reusable photo uploader for sublease + manager listing forms.
//
// Uses Cloudinary's UNSIGNED upload preset:
//   POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
//   FormData: file, upload_preset[, folder]
//
// No API key / secret is exposed to the browser. The preset must be
// configured as "Unsigned" in your Cloudinary dashboard, with file-type
// and file-size restrictions set there as well (defense in depth — we
// also validate client-side).
//
// Props:
//   value:      string[]    array of image URLs already uploaded (controlled)
//   onChange:   (urls) => void
//   max:        number      max images allowed (default 6)
//   maxBytes:   number      per-file size limit in bytes (default 5 MB)
//   label:      string      optional label
//   hint:       string      optional helper text
//   disabled:   bool        disable interactions
//
// Designed mobile-first: the file input opens the device camera/gallery
// picker on phones; previews are tappable and finger-friendly.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_MAX = 6;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = /^image\/(jpe?g|png|webp|heic|heif|gif)$/i;

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const UPLOAD_FOLDER = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || '';

function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Upload a single file to Cloudinary's unsigned upload endpoint using XHR
// so we get progress events. Returns the secure URL.
function uploadOne(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    if (UPLOAD_FOLDER) fd.append('folder', UPLOAD_FOLDER);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve(data.secure_url);
        } else {
          const msg =
            (data && data.error && data.error.message) ||
            `Upload failed (HTTP ${xhr.status}).`;
          reject(new Error(msg));
        }
      } catch (err) {
        reject(new Error('Upload failed: invalid response from Cloudinary.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(fd);
  });
}

export default function PhotoUploader({
  value = [],
  onChange,
  max = DEFAULT_MAX,
  maxBytes = DEFAULT_MAX_BYTES,
  label = 'Photos',
  hint = '',
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [uploads, setUploads] = useState([]); // [{ id, name, pct, error? }]
  const [error, setError] = useState(null);
  const configured = isCloudinaryConfigured();

  // Clean up object URLs we create for preview thumbnails (none currently —
  // we use the Cloudinary URL directly — but keep the hook in case we add
  // an "uploading thumbnail" preview later).
  useEffect(() => () => { /* noop */ }, []);

  function emit(next) {
    onChange && onChange(next);
  }

  function openPicker() {
    if (disabled) return;
    if (!configured) {
      setError(
        'Photo uploads aren\'t configured. Ask an admin to set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
      );
      return;
    }
    fileInputRef.current && fileInputRef.current.click();
  }

  async function handleFiles(fileList) {
    setError(null);
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const room = Math.max(0, max - value.length);
    if (room <= 0) {
      setError(`Maximum ${max} photos.`);
      return;
    }
    const accepted = [];
    for (const f of files.slice(0, room)) {
      if (!ALLOWED_TYPES.test(f.type)) {
        setError(`"${f.name}" isn't a supported image (jpg, png, webp, heic, gif).`);
        continue;
      }
      if (f.size > maxBytes) {
        setError(`"${f.name}" is ${fmtBytes(f.size)} — max is ${fmtBytes(maxBytes)}.`);
        continue;
      }
      accepted.push(f);
    }
    if (files.length > room) {
      setError((prev) => prev || `Only the first ${room} photo${room === 1 ? '' : 's'} will be uploaded (max ${max}).`);
    }
    if (accepted.length === 0) return;

    // Track each upload by a local id so we can update progress.
    const startingId = Date.now();
    const next = accepted.map((f, i) => ({
      id: startingId + i,
      name: f.name,
      pct: 0,
      error: null,
    }));
    setUploads((u) => [...u, ...next]);

    const uploadedUrls = [];
    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      const id = next[i].id;
      try {
        const url = await uploadOne(file, {
          onProgress: (pct) => {
            setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct } : x)));
          },
        });
        uploadedUrls.push(url);
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct: 100 } : x)));
      } catch (err) {
        setUploads((u) =>
          u.map((x) => (x.id === id ? { ...x, error: err.message || 'Upload failed.' } : x))
        );
        setError(err.message || 'One or more photos failed to upload.');
      }
    }

    if (uploadedUrls.length) {
      emit([...(value || []), ...uploadedUrls].slice(0, max));
    }

    // After a brief moment, drop completed uploads from the in-progress list.
    setTimeout(() => {
      setUploads((u) => u.filter((x) => x.error || (x.pct < 100)));
    }, 1200);
  }

  function removeAt(idx) {
    const next = (value || []).filter((_, i) => i !== idx);
    emit(next);
  }

  function moveLeft(idx) {
    if (idx <= 0) return;
    const next = [...(value || [])];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    emit(next);
  }

  const remaining = Math.max(0, max - (value?.length || 0));
  const anyUploading = uploads.some((u) => !u.error && u.pct < 100);

  return (
    <div className="block">
      {label && <span className="label">{label}</span>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        disabled={disabled || !configured}
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so the same file can be selected again after removal.
          e.target.value = '';
        }}
      />

      <div className="rounded-2xl bg-cream-50 border border-cream-200 p-3 sm:p-4">
        {/* Previews */}
        {(value && value.length > 0) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            {value.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-white border border-ink-100"
              >
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-ink-900/80 text-white px-2 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                <div className="absolute top-1 right-1 flex gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveLeft(idx)}
                      aria-label="Move left"
                      className="w-7 h-7 rounded-full bg-white/90 border border-ink-100 grid place-items-center text-sm hover:bg-white"
                    >
                      ←
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    aria-label="Remove photo"
                    className="w-7 h-7 rounded-full bg-white/90 border border-ink-100 grid place-items-center text-sm hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* In-flight uploads */}
        {uploads.length > 0 && (
          <ul className="space-y-1 mb-3">
            {uploads.map((u) => (
              <li key={u.id} className="text-xs text-ink-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{u.name}</span>
                  <span className="text-ink-500">
                    {u.error ? 'failed' : `${u.pct}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-full ${u.error ? 'bg-red-400' : 'bg-sage-400'}`}
                    style={{ width: `${u.error ? 100 : u.pct}%` }}
                  />
                </div>
                {u.error && <p className="text-red-600 mt-1">{u.error}</p>}
              </li>
            ))}
          </ul>
        )}

        {/* Add button + counter */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || !configured || remaining <= 0 || anyUploading}
            className="btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {anyUploading
              ? 'Uploading…'
              : remaining <= 0
              ? `Maximum ${max} photos reached`
              : (value && value.length)
              ? `+ Add more photos (${remaining} left)`
              : '+ Add photos'}
          </button>
          <span className="text-xs text-ink-500">
            {(value?.length || 0)}/{max} · {fmtBytes(maxBytes)} each
          </span>
        </div>

        {hint && <p className="text-xs text-ink-500 mt-2">{hint}</p>}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        {!configured && (
          <p className="text-xs text-amber-700 mt-2">
            Photo uploads are disabled — Cloudinary not configured.
          </p>
        )}
      </div>
    </div>
  );
}
