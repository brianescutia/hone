// frontend/src/components/GoogleSignInButton.jsx
//
// Renders Google's official "Sign in with Google" button using Google
// Identity Services (GIS). When the user picks an account, Google calls
// our callback with a signed ID token; we forward it to the backend, which
// verifies it server-side and returns our app JWT.
//
// Why GIS over older flows:
//   - No popup window / no redirect dance / no cookies set on other origins.
//   - Works cleanly across our Vercel frontend ↔ Railway backend split.
//   - Backend is the only place we trust the email — frontend never sets
//     studentVerified on its own.

import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;

function loadGsi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function GoogleSignInButton({ onCredential, onError, text = 'continue_with' }) {
  const container = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGsi()
      .then((google) => {
        if (cancelled || !google || !container.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            // response.credential is the ID token (JWT).
            if (!response?.credential) {
              onError && onError(new Error('Google returned no credential.'));
              return;
            }
            onCredential(response.credential);
          },
          ux_mode: 'popup',
          auto_select: false,
        });
        google.accounts.id.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text, // 'signin_with' | 'continue_with' | 'signup_with'
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch((err) => onError && onError(err));
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError, text]);

  if (!clientId) {
    return (
      <div className="rounded-xl bg-cream-100 border border-cream-300 text-xs text-ink-700 p-3">
        Google sign-in isn't configured for this site. Set{' '}
        <code>VITE_GOOGLE_CLIENT_ID</code> in your Vercel environment and rebuild.
      </div>
    );
  }
  return <div ref={container} className="flex justify-center" />;
}
