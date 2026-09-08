/**
 * ConnectAgentButton — the one button your app needs for the agent grant.
 *
 * Clicking it asks your backend to create an AgentAdmit consent session and
 * sends the signed-in user to the hosted consent page. Everything about the
 * grant (scopes, duration, intent, existing-grant review, presence ceremony,
 * the one-time token) happens there, on AgentAdmit's page, on your app's behalf.
 */

import React from 'react';
import { useConsentSession, UseConsentSessionOptions } from '../hooks/useConsentSession';

export interface ConnectAgentButtonProps extends UseConsentSessionOptions {
  /** Button label. Default "Connect an AI agent". */
  label?: string;
  /** Label while the session is being created. Default "Opening AgentAdmit…". */
  startingLabel?: string;
  /** Extra class names for the button. */
  className?: string;
  disabled?: boolean;
  /** Called with the error message when the session could not be started. */
  onError?: (message: string) => void;
  /** Render the error under the button. Default true. */
  showError?: boolean;
}

export function ConnectAgentButton({
  label = 'Connect an AI agent',
  startingLabel = 'Opening AgentAdmit…',
  className,
  disabled,
  onError,
  showError = true,
  ...sessionOptions
}: ConnectAgentButtonProps) {
  const { start, starting, error } = useConsentSession(sessionOptions);

  const onClick = async () => {
    const url = await start();
    if (url === null && onError) onError('Could not start the consent session');
  };

  return (
    <div className="aa-connect-agent">
      <button
        type="button"
        className={['aa-btn', 'aa-btn-primary', className].filter(Boolean).join(' ')}
        onClick={onClick}
        disabled={disabled || starting}
        aria-busy={starting || undefined}
      >
        {starting ? startingLabel : label}
      </button>
      {showError && error && (
        <p className="aa-error-banner" role="alert">{error}</p>
      )}
    </div>
  );
}
