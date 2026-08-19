/**
 * RelationshipConsentPanel — a data subject independently decides how one
 * specific grantee may reach the subject's data: directly, through the app's
 * in-app AI, or through the grantee's external AI agent.
 */

import React, { useRef } from 'react';
import { AapRootContext, useStandaloneRoot } from '../hooks/useStandaloneRoot';
import type { ConsentClassCopy } from './ConsentSettingsPanel';
import type { ConsentCallerClass, ConsentPresenceConfig } from '../hooks/useConsentSettings';
import { useRelationshipConsentSettings } from '../hooks/useRelationshipConsentSettings';

export interface RelationshipConsentPanelProps {
  /** Base URL of YOUR authenticated backend proxy routes. */
  apiBase: string;
  /** Signed-in data subject's session token. */
  authToken: string;
  /** Stable app-side identifier of the trainer, doctor, accountant, etc. */
  granteeUserId: string;
  /** App-defined relationship label such as "trainer" or "doctor". */
  relationshipType: string;
  /** Human-readable relationship, e.g. "your trainer" or "Dr. Rivera". */
  granteeLabel: string;
  scopeGroup?: string;
  heading?: string;
  description?: string;
  copy?: Partial<Record<ConsentCallerClass, ConsentClassCopy>>;
  presence?: ConsentPresenceConfig;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  onConsentChange?: (callerClass: ConsentCallerClass, granted: boolean) => void;
}

function defaultCopy(granteeLabel: string): Record<ConsentCallerClass, ConsentClassCopy> {
  return {
    human_session: {
      label: 'Direct access',
      description: `Allow ${granteeLabel} to view your data directly to support you.`,
    },
    in_app_ai: {
      label: 'In-app AI access',
      description: `Allow ${granteeLabel} to use this app's in-app AI to review your data and support you.`,
    },
    external_agent: {
      label: 'External AI agent access',
      description: `Allow ${granteeLabel} to use their external AI agents to review your data and support you.`,
    },
  };
}

export function RelationshipConsentPanel({
  apiBase,
  authToken,
  granteeUserId,
  relationshipType,
  granteeLabel,
  scopeGroup,
  heading = `How ${granteeLabel} can use your data`,
  description = `Decide independently whether ${granteeLabel} can view your data directly, use in-app AI to review it, or use external AI agents to review it. Turning one on never turns on another.`,
  copy,
  presence,
  theme,
  className = '',
  onConsentChange,
}: RelationshipConsentPanelProps) {
  const rootClass = useStandaloneRoot(theme);
  const defaults = defaultCopy(granteeLabel);
  const { effective, loading, saving, verifying, error, setConsent } =
    useRelationshipConsentSettings({
      apiBase,
      authToken,
      granteeUserId,
      relationshipType,
      scopeGroup,
      presence,
    });
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const classes: ConsentCallerClass[] = ['human_session', 'in_app_ai', 'external_agent'];

  async function toggle(cls: ConsentCallerClass) {
    const current = effective[cls]?.granted ?? false;
    const ok = await setConsent(cls, !current);
    if (!ok) return;
    onConsentChange?.(cls, !current);
    if (liveRegionRef.current) {
      const label = (copy?.[cls] ?? defaults[cls]).label;
      liveRegionRef.current.textContent = `${label} ${!current ? 'enabled' : 'disabled'}`;
    }
  }

  return (
    <AapRootContext.Provider value={true}>
      <div className={`${rootClass} aa-consent-panel aa-relationship-consent-panel ${className}`.trim()}>
        <h3 className="aa-section-title">{heading}</h3>
        <p className="aa-section-desc">{description}</p>

        {error && <div className="aa-consent-error" role="alert">{error}</div>}

        <div className="aa-consent-rows">
          {classes.map(cls => {
            const meta = copy?.[cls] ?? defaults[cls];
            const granted = effective[cls]?.granted ?? false;
            const isSaving = saving === cls;
            const isVerifying = verifying === cls;
            return (
              <div key={cls} className="aa-consent-row">
                <div className="aa-consent-copy">
                  <span className="aa-consent-label">{meta.label}</span>
                  <span className="aa-consent-desc">{meta.description}</span>
                  {isVerifying && <span className="aa-consent-verifying" role="status">Confirm it’s you…</span>}
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
