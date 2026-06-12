/**
 * useAlerts — React hook for AgentAdmit security alerts.
 * Manages alert configuration and event history.
 *
 * Concurrency-hardened like useAdminData: every request runs through an
 * AbortController that is aborted on unmount (no setState-after-unmount),
 * loading is ref-counted so a fast request can't flip it off while a slow
 * one is still running, and aborted requests are swallowed silently.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AlertConfig {
  enabled?: boolean;
  threshold_value?: number;
  threshold_window_minutes?: number;
  threshold_rate_per_minute?: number;
  stale_days?: number;
  kill_switch_enabled?: boolean;
  kill_switch_threshold_value?: number;
  kill_switch_threshold_window_minutes?: number;
}

export interface AlertEvent {
  id?: string;
  app_id: string;
  connection_id?: string;
  alert_type: string;
  triggered_at: string;
  details?: Record<string, unknown>;
}

export interface AlertsConfigResponse {
  app_id: string;
  app_level: Record<string, AlertConfig>;
  connection_overrides: Record<string, Record<string, AlertConfig>>;
  alert_types: string[];
}

export interface AlertEventsResponse {
  events: AlertEvent[];
  total: number;
  limit: number;
  offset: number;
}

export const ALERT_TYPES = [
  'volume_spike',
  'failed_scope_attempts',
  'burst_pattern',
  'stale_reactivation',
  'new_scope_usage',
  'revoked_connection_attempt',
] as const;

export type AlertType = typeof ALERT_TYPES[number];

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  volume_spike: 'Volume Spike',
  failed_scope_attempts: 'Failed Scope Attempts',
  burst_pattern: 'Burst Pattern',
  stale_reactivation: 'Stale Reactivation',
  new_scope_usage: 'New Scope Usage',
  revoked_connection_attempt: 'Revoked Connection Attempt',
};

export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
  volume_spike: 'Unusual surge in request volume',
  failed_scope_attempts: 'Repeated attempts to access unauthorized scopes',
  burst_pattern: 'Rapid burst of requests in a short window',
  stale_reactivation: 'Dormant connection suddenly becomes active',
  new_scope_usage: 'Agent using a scope for the first time',
  revoked_connection_attempt: 'A revoked connection attempting to authenticate',
};

interface UseAlertsOptions {
  apiBase: string;
  authToken: string;
  appId: string;
}

interface UseAlertsReturn {
  alertsConfig: AlertsConfigResponse | null;
  alertEvents: AlertEvent[];
  totalEvents: number;
  loading: boolean;
  error: string | null;
  fetchAlertsConfig: (connectionId?: string) => Promise<void>;
  fetchAlertEvents: (alertType?: string, limit?: number, offset?: number) => Promise<void>;
  configureAlert: (alertType: AlertType, config: AlertConfig) => Promise<boolean>;
  clearError: () => void;
}

export function useAlerts({ apiBase, authToken, appId }: UseAlertsOptions): UseAlertsReturn {
  const [alertsConfig, setAlertsConfig] = useState<AlertsConfigResponse | null>(null);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lifecycle + concurrency guards (same pattern as useAdminData):
  //  - mountedRef: don't setState after unmount.
  //  - controllersRef: abort every in-flight request on unmount.
  //  - loadingCountRef: ref-count concurrent requests so a fast one doesn't
  //    flip `loading` off while a slow one is still running.
  const mountedRef = useRef(true);
  const controllersRef = useRef<Set<AbortController>>(new Set());
  const loadingCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const controllers = controllersRef.current;
    return () => {
      mountedRef.current = false;
      controllers.forEach(c => c.abort());
      controllers.clear();
    };
  }, []);

  const syncLoading = useCallback(() => {
    if (mountedRef.current) setLoading(loadingCountRef.current > 0);
  }, []);

  // Single fetch path: tracks an AbortController, ref-counts loading, and is
  // cancelled on unmount. Returns null if the request was aborted.
  const authedFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response | null> => {
      const controller = new AbortController();
      controllersRef.current.add(controller);
      loadingCountRef.current += 1;
      syncLoading();
      try {
        return await fetch(`${apiBase}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            ...(init?.headers ?? {}),
          },
          signal: controller.signal,
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return null;
        throw err;
      } finally {
        controllersRef.current.delete(controller);
        loadingCountRef.current -= 1;
        syncLoading();
      }
    },
    [apiBase, authToken, syncLoading],
  );

  const fetchAlertsConfig = useCallback(
    async (connectionId?: string) => {
      if (mountedRef.current) setError(null);
      try {
        const params = new URLSearchParams({ app_id: appId });
        if (connectionId) params.set('connection_id', connectionId);
        const res = await authedFetch(`/alerts/config?${params}`);
        if (!res) return; // aborted
        if (!res.ok) throw new Error(`Failed to fetch alert config: ${res.status}`);
        const data: AlertsConfigResponse = await res.json();
        if (mountedRef.current) setAlertsConfig(data);
      } catch (err: unknown) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [authedFetch, appId],
  );

  const fetchAlertEvents = useCallback(
    async (alertType?: string, limit = 50, offset = 0) => {
      if (mountedRef.current) setError(null);
      try {
        const params = new URLSearchParams({ app_id: appId, limit: String(limit), offset: String(offset) });
        if (alertType) params.set('alert_type', alertType);
        const res = await authedFetch(`/alerts?${params}`);
        if (!res) return; // aborted
        if (!res.ok) throw new Error(`Failed to fetch alert events: ${res.status}`);
        const data: AlertEventsResponse = await res.json();
        if (mountedRef.current) {
          setAlertEvents(data.events || []);
          setTotalEvents(data.total || 0);
        }
      } catch (err: unknown) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [authedFetch, appId],
  );

  const configureAlert = useCallback(
    async (alertType: AlertType, config: AlertConfig): Promise<boolean> => {
      if (mountedRef.current) setError(null);
      try {
        const res = await authedFetch(`/alerts`, {
          method: 'POST',
          body: JSON.stringify({ app_id: appId, alert_type: alertType, ...config }),
        });
        if (!res) return false; // aborted (e.g. unmounted mid-save)
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, string>).error_description ||
              `Failed to configure alert: ${res.status}`,
          );
        }
        // Refresh config after updating
        await fetchAlertsConfig();
        return true;
      } catch (err: unknown) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [authedFetch, appId, fetchAlertsConfig],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    alertsConfig,
    alertEvents,
    totalEvents,
    loading,
    error,
    fetchAlertsConfig,
    fetchAlertEvents,
    configureAlert,
    clearError,
  };
}
