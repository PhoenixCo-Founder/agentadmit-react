/**
 * useConsentSettings: per-user caller-identity consent switches, backed by
 * the AgentAdmit Consent Ledger through the HOST APP's backend proxy.
 *
 * Proxy contract (your backend, authenticated with the user's own session;
 * your server derives the app_user_id and calls AgentAdmit with the aa_ API
 * key — the key never ships to the browser):
 *
 *   GET {apiBase}/consent/settings
 *     → proxy of AgentAdmit GET /api/v1/consent/settings?app_user_id=<user>
 *     → { settings: [...], effective: { human_session: {granted, source}, ... }, app_defaults: {...} }
 *
 *   PUT {apiBase}/consent/settings   body: { caller_class, granted }
 *     → proxy of AgentAdmit PUT /api/v1/consent/settings with app_user_id
 *       injected server-side and updated_via: "user_page"
 */

import { useState, useEffect, useCallback } from 'react';
import {
  runPresenceCeremony,
  PresenceCeremonyConfig,
  PresenceCeremonyError,
} from '../lib/presenceCeremony';

export const CONSENT_CALLER_CLASSES = ['human_session', 'in_app_ai', 'external_agent'] as const;
export type ConsentCallerClass = (typeof CONSENT_CALLER_CLASSES)[number];

/** Backend error codes that mean "run a presence ceremony, then retry". */
const PRESENCE_CHALLENGE_CODES = ['presence_attestation_required', 'presence_attestation_invalid'];

export interface ConsentPresenceConfig extends PresenceCeremonyConfig {
  /**
   * The PUT body field that carries the ceremony's single-use handle on the
   * retry. Default 'presence_attestation_id' (app-native WebAuthn backends).
   * Use 'presence_session_id' for the AgentAdmit hosted-session contract.
   */
  attestationField?: string;
}

export interface ConsentEffectiveEntry {
  granted: boolean;
  /** Which layer resolved it: setting, scope_setting, app_default, platform_default. */
  source: string;
}

export type ConsentEffectiveMap = Partial<Record<ConsentCallerClass, ConsentEffectiveEntry>>;

export interface UseConsentSettingsOptions {
  apiBase: string;
  authToken: string;
  /**
   * Presence step-up. When the proxy answers a PUT with 403
   * `presence_attestation_required` / `presence_attestation_invalid`, the hook
   * runs a WebAuthn ceremony against these app-backend endpoints and retries
   * the PUT once with the returned handle attached. Omit if your proxy does
   * not require presence.
   */
  presence?: ConsentPresenceConfig;
  /**
   * Fully custom presence resolver. Given the pending change, return the extra
   * body fields to merge into the retried PUT (e.g. { presence_session_id }).
   * Overrides `presence` when provided.
   */
  resolvePresence?: (ctx: {
    callerClass: ConsentCallerClass;
    granted: boolean;
  }) => Promise<Record<string, unknown>>;
}

export interface UseConsentSettingsReturn {
  /** Effective verdict per caller class (explicit switch or default). */
  effective: ConsentEffectiveMap;
  loading: boolean;
  /** The caller class currently being saved, or null. */
  saving: ConsentCallerClass | null;
  /** The caller class currently awaiting a presence ceremony, or null. */
  verifying: ConsentCallerClass | null;
  error: string | null;
  /** Flip one class's switch. Resolves true on success. */
  setConsent: (callerClass: ConsentCallerClass, granted: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useConsentSettings({
  apiBase,
  authToken,
  presence,
  resolvePresence,
}: UseConsentSettingsOptions): UseConsentSettingsReturn {
  const [effective, setEffective] = useState<ConsentEffectiveMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentCallerClass | null>(null);
  const [verifying, setVerifying] = useState<ConsentCallerClass | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };
      const res = await fetch(`${apiBase}/consent/settings`, { headers });
      if (!res.ok) throw new Error('Failed to fetch consent settings');
      const data = await res.json();
      setEffective(data.effective || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, authToken]);

  const setConsent = useCallback(
    async (callerClass: ConsentCallerClass, granted: boolean): Promise<boolean> => {
      setSaving(callerClass);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      const put = async (extra?: Record<string, unknown>) =>
        fetch(`${apiBase}/consent/settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ caller_class: callerClass, granted, ...(extra ?? {}) }),
        });

      const readErr = async (res: Response) =>
        (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };

      try {
        let res = await put();
        // Preserve the FIRST response's parsed error: its body can only be
        // read once, so a non-presence 403 that falls through would otherwise
        // lose its real message on the re-read below.
        let firstErr: { error?: string; error_description?: string } | null = null;

        // Presence step-up: on the challenge code, run a ceremony and retry once.
        if (res.status === 403 && (presence || resolvePresence)) {
          firstErr = await readErr(res);
          if (firstErr.error && PRESENCE_CHALLENGE_CODES.includes(firstErr.error)) {
            setVerifying(callerClass);
            let extra: Record<string, unknown>;
            try {
              if (resolvePresence) {
                extra = await resolvePresence({ callerClass, granted });
              } else {
                const result = await runPresenceCeremony({
                  ...(presence as ConsentPresenceConfig),
                  purpose: presence?.purpose ?? 'consent_toggle',
                });
                const handle = result.presenceAttestationId ?? result.presenceSessionId;
                extra = { [presence?.attestationField ?? 'presence_attestation_id']: handle };
              }
            } catch (ceremonyErr: any) {
              // A user cancel/timeout rolls back quietly (no error banner);
              // a real failure surfaces its message.
              if (ceremonyErr instanceof PresenceCeremonyError && ceremonyErr.cancelled) {
                return false;
              }
              setError(ceremonyErr?.message || 'Could not confirm it was you.');
              return false;
            } finally {
              setVerifying(null);
            }
            res = await put(extra);
            firstErr = null; // retry produced a fresh response; use it below
          }
        }

        if (!res.ok) {
          // Reuse the already-parsed error if we consumed the body above.
          const errData = firstErr ?? (await readErr(res));
          throw new Error(errData.error_description || errData.error || 'Failed to update consent');
        }
        setEffective(prev => ({ ...prev, [callerClass]: { granted, source: 'setting' } }));
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setSaving(null);
      }
    },
    [apiBase, authToken, presence, resolvePresence],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-clear error after 6 seconds (matches useAgentAdmit behavior).
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  return { effective, loading, saving, verifying, error, setConsent, refresh, clearError };
}
