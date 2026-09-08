/**
 * useConsentSession — starts the AgentAdmit hosted consent page for the
 * signed-in user.
 *
 * Your backend creates the consent session with your server-side `aa_` API
 * key (POST /api/v1/apps/{app_id}/consent-sessions, injecting the user's
 * app_user_id and your app's scope ceiling) and returns the hosted page URL as
 * `session_url`. This hook calls that backend endpoint and sends the user to
 * the hosted page, where scope selection, duration, intent, existing-grant
 * review, the presence ceremony, and the one-time token all happen. The token
 * never reaches your frontend.
 */

import { useCallback, useState } from 'react';
import { readAgentAdmitError } from '../lib/normalizeError';

export interface UseConsentSessionOptions {
  /**
   * Your backend endpoint that creates the consent session and returns
   * `{ session_url }`. Never call AgentAdmit directly from the browser: the
   * API key belongs on your server.
   */
  createUrl: string;
  /** Headers for the create call (for example your user session bearer token). */
  requestHeaders?: Record<string, string>;
  /**
   * Extra JSON body fields your backend accepts and forwards (for example a
   * template id or a declared `purpose`). Sent as-is.
   */
  body?: Record<string, unknown>;
  /** Response field carrying the hosted page URL. Default `session_url`. */
  urlField?: string;
  /**
   * How to open the hosted page. Default navigates the current tab, so the
   * consent session's `return_url` brings the user back to your app.
   */
  onSessionUrl?: (url: string) => void;
}

export interface UseConsentSessionReturn {
  /** Create the session and open the hosted page. Resolves to the URL, or null on failure. */
  start: () => Promise<string | null>;
  /** True while the create call is in flight. */
  starting: boolean;
  /** Last error message, or null. */
  error: string | null;
  clearError: () => void;
}

function defaultOpen(url: string): void {
  if (typeof window !== 'undefined') window.location.assign(url);
}

/** The hosted page is always served over HTTPS; refuse anything else. */
export function isAcceptableSessionUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function useConsentSession({
  createUrl,
  requestHeaders,
  body,
  urlField = 'session_url',
  onSessionUrl = defaultOpen,
}: UseConsentSessionOptions): UseConsentSessionReturn {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (): Promise<string | null> => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errData = readAgentAdmitError(data);
        throw new Error(errData.error_description || errData.error || 'Could not start the consent session');
      }
      const url = (data as Record<string, unknown>)[urlField];
      if (!isAcceptableSessionUrl(url)) {
        throw new Error('Consent session response did not include an https session_url');
      }
      onSessionUrl(url);
      return url;
    } catch (err: any) {
      setError(err?.message || 'Could not start the consent session');
      return null;
    } finally {
      setStarting(false);
    }
  }, [createUrl, requestHeaders, body, urlField, onSessionUrl]);

  const clearError = useCallback(() => setError(null), []);

  return { start, starting, error, clearError };
}
