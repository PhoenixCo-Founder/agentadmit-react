/**
 * useAlerts — React hook for AgentAdmit security alerts.
 * Manages alert configuration and event history.
 */

import { useState, useCallback } from 'react';

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

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const fetchAlertsConfig = useCallback(
    async (connectionId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ app_id: appId });
        if (connectionId) params.set('connection_id', connectionId);
        const res = await fetch(`${apiBase}/alerts/config?${params}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch alert config: ${res.status}`);
        const data: AlertsConfigResponse = await res.json();
        setAlertsConfig(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authToken, appId],
  );

  const fetchAlertEvents = useCallback(
    async (alertType?: string, limit = 50, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ app_id: appId, limit: String(limit), offset: String(offset) });
        if (alertType) params.set('alert_type', alertType);
        const res = await fetch(`${apiBase}/alerts?${params}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch alert events: ${res.status}`);
        const data: AlertEventsResponse = await res.json();
        setAlertEvents(data.events || []);
        setTotalEvents(data.total || 0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authToken, appId],
  );

  const configureAlert = useCallback(
    async (alertType: AlertType, config: AlertConfig): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/alerts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ app_id: appId, alert_type: alertType, ...config }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as any).error_description || `Failed to configure alert: ${res.status}`);
        }
        // Refresh config after updating
        await fetchAlertsConfig();
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authToken, appId, fetchAlertsConfig],
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
