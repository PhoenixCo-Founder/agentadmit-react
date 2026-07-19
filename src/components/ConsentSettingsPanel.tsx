/**
 * ConsentSettingsPanel — the data owner's independent consent toggles for
 * the three caller classes (FIG. 3 model): a person viewing their data,
 * the app's own in-app AI, and external AI agents. No toggle implies or
 * cascades to another; any combination is allowed.
 */

import React, { useRef } from 'react';
import { AapRootContext, useStandaloneRoot } from '../hooks/useStandaloneRoot';
import {
  useConsentSettings,
  ConsentCallerClass,
  ConsentPresenceConfig,
} from '../hooks/useConsentSettings';

export interface ConsentClassCopy {
  label: string;
  description: string;
}

export interface ConsentSettingsPanelProps {
  /** Base URL of YOUR backend's AgentAdmit proxy routes (e.g. "/agentadmit"). */
  apiBase: string;
  /** The signed-in user's session token, sent as the Authorization header. */
  authToken: string;
  /** Hide the human-session row when your app's own sharing UI governs it. */
  showHumanSession?: boolean;
  /**
   * Panel heading. Override to say WHOSE data/agents these switches govern —
   * this panel controls the SIGNED-IN USER'S OWN data and agents (not, e.g.,
   * a third party's access). Default: "Data Access Consent".
   */
  heading?: string;
  /** Sub-description under the heading. Default states independence without a
   *  hard-coded switch count (correct whether two or three rows show). */
  description?: string;
  /** Override the label/description copy per caller class. */
  copy?: Partial<Record<ConsentCallerClass, ConsentClassCopy>>;
  /**
   * Presence step-up. When your proxy answers a consent PUT with 403
   * `presence_attestation_required`, the panel runs a WebAuthn ceremony
   * against these endpoints and retries once — so a computer-use agent riding
   * the user's session cannot flip these switches. Omit if not required.
   */
  presence?: ConsentPresenceConfig;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Called after a switch is successfully saved. */
  onConsentChange?: (callerClass: ConsentCallerClass, granted: boolean) => void;
}

const DEFAULT_COPY: Record<ConsentCallerClass, ConsentClassCopy> = {
  human_session: {
    label: 'People I share with',
    description: 'Let people I have shared with view my data in the app.',
  },
  in_app_ai: {
    label: 'In-app AI analysis',
    description: "Let this app's AI analyze my data. It stays inside the app.",
  },
  external_agent: {
    label: 'External AI agent access',
    description:
      'Let my connected AI agents access my data. Agents only get the scopes I approve, and I can disconnect them anytime.',
  },
};

export function ConsentSettingsPanel({
  apiBase,
  authToken,
  showHumanSession = false,
  heading = 'Data Access Consent',
  description = 'These switches control access to your own data. They are independent — turning one on never turns on another.',
  copy,
  presence,
  theme,
  className = '',
  onConsentChange,
}: ConsentSettingsPanelProps) {
  const rootClass = useStandaloneRoot(theme);
  const { effective, loading, saving, verifying, error, setConsent } = useConsentSettings({
    apiBase,
    authToken,
    presence,
  });
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const classes: ConsentCallerClass[] = showHumanSession
    ? ['human_session', 'in_app_ai', 'external_agent']
    : ['in_app_ai', 'external_agent'];

  async function toggle(cls: ConsentCallerClass) {
    const current = effective[cls]?.granted ?? false;
    const ok = await setConsent(cls, !current);
    if (ok) {
      onConsentChange?.(cls, !current);
      if (liveRegionRef.current) {
        const label = (copy?.[cls] ?? DEFAULT_COPY[cls]).label;
        liveRegionRef.current.textContent = `${label} ${!current ? 'enabled' : 'disabled'}`;
      }
    }
  }

  return (
    <AapRootContext.Provider value={true}>
      <div className={`${rootClass} aa-consent-panel ${className}`.trim()}>
        <h3 className="aa-section-title">{heading}</h3>
        <p className="aa-section-desc">{description}</p>

        {error && (
          <div className="aa-consent-error" role="alert">
            {error}
          </div>
        )}

        <div className="aa-consent-rows">
          {classes.map(cls => {
            const meta = copy?.[cls] ?? DEFAULT_COPY[cls];
            const entry = effective[cls];
            const granted = entry?.granted ?? false;
            const isSaving = saving === cls;
            const isVerifying = verifying === cls;
            return (
              <div key={cls} className="aa-consent-row">
                <div className="aa-consent-copy">
                  <span className="aa-consent-label">{meta.label}</span>
                  <span className="aa-consent-desc">{meta.description}</span>
                  {isVerifying && (
                    <span className="aa-consent-verifying" role="status">
                      Confirm it’s you…
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={granted}
                  aria-label={meta.label}
                  disabled={loading || isSaving}
                  onClick={() => toggle(cls)}
                  className={`aa-consent-switch ${granted ? 'aa-consent-on' : ''} ${isSaving ? 'aa-consent-saving' : ''}`.trim()}
                >
                  <span className="aa-consent-thumb" />
                </button>
              </div>
            );
          })}
        </div>

        <div ref={liveRegionRef} className="aa-visually-hidden" aria-live="polite" />
      </div>
    </AapRootContext.Provider>
  );
}
