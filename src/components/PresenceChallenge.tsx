/**
 * PresenceChallenge — WebAuthn human-presence step-up for the embedded flow.
 *
 * The "SDK component" embodiment: the app hosts the ceremony on its own
 * domain (the relying party is the app, not AgentAdmit), authenticating that
 * a human is present before the agent-connection step is allowed to proceed.
 * Wire it to a pair of app-backend endpoints that speak the standard
 * contract (the same shape the AgentAdmit hosted consent page uses):
 *
 *   POST optionsUrl            -> { mode: 'registration' | 'authentication',
 *                                   options: PublicKeyCredential*OptionsJSON }
 *   POST verifyUrl {credential} -> { verified: true } on success,
 *                                   { error, error_description } otherwise
 *
 * The app backend generates and verifies ceremonies with any WebAuthn server
 * library (challenge stored server-side, single use). On success, gate the
 * token-generation step server-side; the component's `verified` state is UI
 * convenience, never the security boundary.
 */

import React, { useCallback, useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { PresenceChallengeProps } from '../types';
import { useStandaloneRoot } from '../hooks/useStandaloneRoot';

type CeremonyState = 'idle' | 'running' | 'verified' | 'error' | 'unsupported';

export function PresenceChallenge({
  optionsUrl,
  verifyUrl,
  requestHeaders,
  onVerified,
  onError,
  buttonLabel = 'Verify it’s you',
  runningLabel = 'Follow your browser’s prompt…',
  verifiedLabel = 'Human presence verified',
  unsupportedLabel = 'This browser does not support passkeys or security keys.',
  theme,
  className = '',
}: PresenceChallengeProps) {
  const rootClass = useStandaloneRoot(theme);
  const [state, setState] = useState<CeremonyState>(
    typeof window !== 'undefined' && !window.PublicKeyCredential ? 'unsupported' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runCeremony = useCallback(async () => {
    setState('running');
    setErrorMessage(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) };

      const optRes = await fetch(optionsUrl, { method: 'POST', headers });
      const optData = await optRes.json().catch(() => null);
      if (!optRes.ok || !optData?.options || !optData?.mode) {
        throw new Error(optData?.error_description || optData?.error || 'Could not start the presence check.');
      }

      const credential =
        optData.mode === 'registration'
          ? await startRegistration({ optionsJSON: optData.options })
          : await startAuthentication({ optionsJSON: optData.options });

      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ credential }),
      });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || verifyData?.verified !== true) {
        throw new Error(verifyData?.error_description || verifyData?.error || 'Presence verification failed.');
      }

      setState('verified');
      onVerified?.();
    } catch (err: any) {
      // NotAllowedError is the cancel/timeout path every authenticator uses;
      // keep the message human instead of surfacing the DOMException name.
      const message =
        err?.name === 'NotAllowedError'
          ? 'The presence check was cancelled or timed out. Try again.'
          : err?.message || 'Presence verification failed.';
      setErrorMessage(message);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [optionsUrl, verifyUrl, requestHeaders, onVerified, onError]);

  if (state === 'unsupported') {
    return (
      <div className={`${rootClass} aap-presence aap-presence--unsupported ${className}`.trim()} role="status">
        {unsupportedLabel}
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className={`${rootClass} aap-presence aap-presence--verified ${className}`.trim()} role="status">
        <span aria-hidden="true">{'✓'} </span>
        {verifiedLabel}
      </div>
    );
  }

  return (
    <div className={`${rootClass} aap-presence ${className}`.trim()}>
      <button
        type="button"
        className="aap-presence-button"
        onClick={runCeremony}
        disabled={state === 'running'}
        aria-busy={state === 'running'}
      >
        {state === 'running' ? runningLabel : buttonLabel}
      </button>
      {state === 'error' && errorMessage && (
        <p className="aap-presence-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
