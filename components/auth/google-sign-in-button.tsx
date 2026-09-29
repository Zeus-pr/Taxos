'use client';

import Script from 'next/script';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type GoogleCredential = { credential?: string };
type GoogleButtonOptions = {
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  logo_alignment: 'left';
  width: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredential) => void; ux_mode: 'popup' }) => void;
          renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(async (response: GoogleCredential) => {
    if (!response.credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const payload = await result.json();
      if (!result.ok || !payload.ok) {
        setError(payload.error ?? 'Google sign-in failed. Please try again.');
        return;
      }
      router.replace(payload.next ?? '/app');
      router.refresh();
    } catch {
      setError('We could not reach TaxOS. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [router]);

  const renderGoogleButton = useCallback(() => {
    const google = window.google?.accounts.id;
    const element = mountRef.current;
    if (!google || !element || !clientId) return;

    element.replaceChildren();
    google.initialize({ client_id: clientId, callback: handleCredential, ux_mode: 'popup' });
    google.renderButton(element, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.max(240, Math.min(element.clientWidth, 360)),
    });
  }, [clientId, handleCredential]);

  return (
    <div className="mt-6">
      <div className="relative flex items-center" aria-hidden="true">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="px-3 text-xs text-neutral-400">or continue with</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {clientId ? (
        <>
          <Script id="google-identity-services" src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={renderGoogleButton} />
          <div ref={mountRef} className="mt-4 flex min-h-10 justify-center" />
          {busy && <p className="mt-2 text-center text-xs text-neutral-500" role="status">Signing in with Google…</p>}
          {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-200 px-4 py-3 text-center text-xs leading-relaxed text-neutral-500">
          Google sign-in will be available after the Google OAuth web client ID is configured.
        </p>
      )}
    </div>
  );
}
