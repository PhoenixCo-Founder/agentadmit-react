/**
 * useConsentSettings — per-user caller-identity consent switches, backed by
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

export const CONSENT_CALLER_CLASSES = ['human_session', 'in_app_ai', 'external_agent'] as const;
export type ConsentCallerClass = (typeof CONSENT_CALLER_CLASSES)[number];

export interface ConsentEffectiveEntry {
  granted: boolean;
  /** Which layer resolved it: setting, scope_setting, app_default, platform_default. */
  source: string;
}

export type ConsentEffectiveMap = Partial<Record<ConsentCallerClass, ConsentEffectiveEntry>>;

export interface UseConsentSettingsOptions {
  apiBase: string;
  authToken: string;
}

export interface UseConsentSettingsReturn {
  /** Effective verdict per caller class (explicit switch or default). */
  effective: ConsentEffectiveMap;
  loading: boolean;
  /** The caller class currently being saved, or null. */
  saving: ConsentCallerClass | null;
  error: string | null;
  /** Flip one class's switch. Resolves true on success. */
  setConsent: (callerClass: ConsentCallerClass, granted: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useConsentSettings({ apiBase, authToken }: UseConsentSettingsOptions): UseConsentSettingsReturn {
  const [effective, setEffective] = useState<ConsentEffectiveMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentCallerClass | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
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
      try {
        const res = await fetch(`${apiBase}/consent/settings`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ caller_class: callerClass, granted }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({} as any));
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
    [apiBase, authToken],
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

  return { effective, loading, saving, error, setConsent, refresh, clearError };
}
