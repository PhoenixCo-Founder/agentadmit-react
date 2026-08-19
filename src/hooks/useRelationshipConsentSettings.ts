/**
 * Subject-facing, per-grantee caller-identity consent backed by AgentAdmit's
 * hosted relationship-consent ledger through the host app's backend proxy.
 *
 * Security boundary: the browser supplies the grantee and relationship being
 * displayed; the host backend MUST derive subject_user_id from the signed-in
 * user's session and MUST verify that the relationship is real before proxying
 * to AgentAdmit. The AgentAdmit API key never reaches the browser.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  runPresenceCeremony,
  PresenceCeremonyError,
} from '../lib/presenceCeremony';
import { readAgentAdmitError } from '../lib/normalizeError';
import type {
  ConsentCallerClass,
  ConsentEffectiveMap,
  ConsentPresenceConfig,
} from './useConsentSettings';

const PRESENCE_CHALLENGE_CODES = ['presence_attestation_required', 'presence_attestation_invalid'];

export interface UseRelationshipConsentSettingsOptions {
  apiBase: string;
  authToken: string;
  /** Stable app-side identifier for the trainer, doctor, accountant, etc. */
  granteeUserId: string;
  /** App-defined relationship label, for example "trainer" or "doctor". */
  relationshipType: string;
  /** Optional narrower consent group within a caller class. */
  scopeGroup?: string;
  presence?: ConsentPresenceConfig;
  resolvePresence?: (ctx: {
    callerClass: ConsentCallerClass;
    granted: boolean;
    granteeUserId: string;
    relationshipType: string;
    scopeGroup?: string;
  }) => Promise<Record<string, unknown>>;
}

export interface UseRelationshipConsentSettingsReturn {
  effective: ConsentEffectiveMap;
  loading: boolean;
  saving: ConsentCallerClass | null;
  verifying: ConsentCallerClass | null;
  error: string | null;
  setConsent: (callerClass: ConsentCallerClass, granted: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useRelationshipConsentSettings({
  apiBase,
  authToken,
  granteeUserId,
  relationshipType,
  scopeGroup,
  presence,
  resolvePresence,
}: UseRelationshipConsentSettingsOptions): UseRelationshipConsentSettingsReturn {
  const [effective, setEffective] = useState<ConsentEffectiveMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentCallerClass | null>(null);
  const [verifying, setVerifying] = useState<ConsentCallerClass | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useCallback(() => {
    const params = new URLSearchParams({
      grantee_user_id: granteeUserId,
      relationship_type: relationshipType,
    });
    if (scopeGroup) params.set('scope_group', scopeGroup);
    return `${apiBase}/consent/relationship/settings?${params.toString()}`;
  }, [apiBase, granteeUserId, relationshipType, scopeGroup]);

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    }),
    [authToken],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint(), { headers: headers() });
      if (!res.ok) {
        const err = readAgentAdmitError(await res.json().catch(() => ({})));
        throw new Error(err.error_description || err.error || 'Failed to fetch relationship consent');
      }
      const data = await res.json();
      setEffective(data.effective || {});
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch relationship consent');
    } finally {
      setLoading(false);
    }
  }, [endpoint, headers]);

  const setConsent = useCallback(
    async (callerClass: ConsentCallerClass, granted: boolean): Promise<boolean> => {
      setSaving(callerClass);
      setError(null);

      const put = async (extra?: Record<string, unknown>) =>
        fetch(`${apiBase}/consent/relationship/settings`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({
            grantee_user_id: granteeUserId,
            relationship_type: relationshipType,
            caller_class: callerClass,
            granted,
            ...(scopeGroup ? { scope_group: scopeGroup } : {}),
            ...(extra ?? {}),
          }),
        });

      const readErr = async (res: Response) =>
        readAgentAdmitError(await res.json().catch(() => ({})));

      try {
        let res = await put();
        let firstErr: { error?: string; error_description?: string } | null = null;

        if (res.status === 403 && (presence || resolvePresence)) {
          firstErr = await readErr(res);
          if (firstErr.error && PRESENCE_CHALLENGE_CODES.includes(firstErr.error)) {
            setVerifying(callerClass);
            let extra: Record<string, unknown>;
            try {
              if (resolvePresence) {
                extra = await resolvePresence({
                  callerClass,
                  granted,
                  granteeUserId,
                  relationshipType,
                  scopeGroup,
                });
              } else {
                const result = await runPresenceCeremony({
                  ...(presence as ConsentPresenceConfig),
                  purpose: presence?.purpose ?? 'relationship_consent_toggle',
                });
                const handle = result.presenceAttestationId ?? result.presenceSessionId;
                extra = { [presence?.attestationField ?? 'presence_attestation_id']: handle };
              }
            } catch (ceremonyErr: any) {
              if (ceremonyErr instanceof PresenceCeremonyError && ceremonyErr.cancelled) return false;
              setError(ceremonyErr?.message || 'Could not confirm it was you.');
              return false;
            } finally {
              setVerifying(null);
            }
            res = await put(extra);
            firstErr = null;
          }
        }

        if (!res.ok) {
          const errData = firstErr ?? (await readErr(res));
          throw new Error(errData.error_description || errData.error || 'Failed to update relationship consent');
        }
        setEffective(prev => ({ ...prev, [callerClass]: { granted, source: 'setting' } }));
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to update relationship consent');
        return false;
      } finally {
        setSaving(null);
      }
    },
    [apiBase, granteeUserId, relationshipType, scopeGroup, presence, resolvePresence, headers],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  return { effective, loading, saving, verifying, error, setConsent, refresh, clearError };
}
