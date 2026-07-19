/**
 * runPresenceCeremony — the reusable WebAuthn presence ceremony.
 *
 * Extracted so both <PresenceChallenge> (the agent-connection step-up) and
 * <ConsentSettingsPanel> (the consent-mutation step-up) run the same flow and
 * so a caller can obtain the single-use presence handle the app backend mints,
 * rather than only a fire-and-forget "verified" signal.
 *
 * Contract with YOUR app backend (relying party = your app's own domain — the
 * ceremony cannot run cross-origin against a different RP):
 *
 *   POST optionsUrl [body: { purpose? }]
 *     -> { mode: 'registration' | 'authentication', options: <WebAuthn opts JSON> }
 *   <browser ceremony>
 *   POST verifyUrl { credential }
 *     -> { verified: true, presence_attestation_id?: string,
 *          presence_session_id?: string, ... }  on success
 *     -> { error, error_description }             otherwise
 *
 * The handle field name varies by backend: app-native WebAuthn backends return
 * `presence_attestation_id`; the AgentAdmit hosted consent-session contract
 * returns `presence_session_id`. Both are surfaced on the result.
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export interface PresenceCeremonyConfig {
  /** App-backend endpoint returning ceremony options. */
  optionsUrl: string;
  /** App-backend endpoint verifying the ceremony response. */
  verifyUrl: string;
  /** Extra headers for both requests (e.g. the app's session auth). */
  requestHeaders?: Record<string, string>;
  /**
   * Optional purpose, sent in the options-request body. Lets a purpose-binding
   * backend tie the resulting attestation to one surface (e.g. 'consent_toggle'
   * vs 'token_mint') so a ceremony for one action can't be replayed for another.
   */
  purpose?: string;
}

export interface PresenceCeremonyResult {
  verified: boolean;
  /** Single-use handle from an app-native WebAuthn backend, if present. */
  presenceAttestationId?: string;
  /** Single-use handle from the AgentAdmit hosted contract, if present. */
  presenceSessionId?: string;
  /** The full verify response, for advanced callers. */
  raw: unknown;
}

/** Error thrown by the ceremony. `cancelled` marks a user dismissal/timeout so
 *  callers can roll back quietly instead of showing a failure. */
export class PresenceCeremonyError extends Error {
  cancelled: boolean;
  code?: string;
  constructor(message: string, opts?: { cancelled?: boolean; code?: string }) {
    super(message);
    this.name = 'PresenceCeremonyError';
    this.cancelled = opts?.cancelled ?? false;
    this.code = opts?.code;
  }
}

/** True when this browser can run a WebAuthn ceremony at all. */
export function browserSupportsPresence(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function runPresenceCeremony(
  config: PresenceCeremonyConfig,
): Promise<PresenceCeremonyResult> {
  const { optionsUrl, verifyUrl, requestHeaders, purpose } = config;

  if (!browserSupportsPresence()) {
    throw new PresenceCeremonyError(
      "This browser doesn't support passkeys or security keys. Use a current browser or your phone to confirm this change.",
      { code: 'unsupported' },
    );
  }

  const headers = { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) };

  const optRes = await fetch(optionsUrl, {
    method: 'POST',
    headers,
    body: purpose ? JSON.stringify({ purpose }) : undefined,
  });
  const optData = await optRes.json().catch(() => null);
  if (!optRes.ok || !optData?.options || !optData?.mode) {
    throw new PresenceCeremonyError(
      optData?.error_description || optData?.error || 'Could not start the presence check.',
      { code: optData?.error },
    );
  }

  let credential;
  try {
    credential =
      optData.mode === 'registration'
        ? await startRegistration({ optionsJSON: optData.options })
        : await startAuthentication({ optionsJSON: optData.options });
  } catch (err: any) {
    // NotAllowedError = dismissed/timed out; AbortError = ceremony aborted.
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
      throw new PresenceCeremonyError('The presence check was cancelled or timed out.', {
        cancelled: true,
      });
    }
    throw err instanceof Error ? err : new PresenceCeremonyError('Presence verification failed.');
  }

  const verifyRes = await fetch(verifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ credential }),
  });
  const verifyData = await verifyRes.json().catch(() => null);
  if (!verifyRes.ok || verifyData?.verified !== true) {
    throw new PresenceCeremonyError(
      verifyData?.error_description || verifyData?.error || 'Presence verification failed.',
      { code: verifyData?.error },
    );
  }

  return {
    verified: true,
    presenceAttestationId: verifyData.presence_attestation_id,
    presenceSessionId: verifyData.presence_session_id,
    raw: verifyData,
  };
}
