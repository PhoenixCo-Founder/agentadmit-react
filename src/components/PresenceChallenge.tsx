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
import { PresenceChallengeProps } from '../types';
import { useStandaloneRoot } from '../hooks/useStandaloneRoot';
import {
  runPresenceCeremony,
  browserSupportsPresence,
  PresenceCeremonyError,
} from '../lib/presenceCeremony';

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
    !browserSupportsPresence() ? 'unsupported' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runCeremony = useCallback(async () => {
    setState('running');
    setErrorMessage(null);
    try {
      const result = await runPresenceCeremony({ optionsUrl, verifyUrl, requestHeaders });
      setState('verified');
      // Pass the single-use handle back so callers can attach it to the
      // action they were gating (attestation id or hosted session id).
      onVerified?.(result.presenceAttestationId ?? result.presenceSessionId, result);
    } catch (err: any) {
      const message =
        err instanceof PresenceCeremonyError && err.cancelled
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
