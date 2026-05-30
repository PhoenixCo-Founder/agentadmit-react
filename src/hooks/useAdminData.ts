/**
 * useAdminData — React hook for AgentAdmit admin-level data.
 *
 * Fetches all connections across all users, usage/tier data, and
 * the activity audit log. Calls the app owner's backend (apiBase),
 * which proxies to AgentAdmit's hosted API using the app's API key.
 *
 * Usage:
 *   const { connections, usage, activity, loading, error, refreshAll } = useAdminData({
 *     apiBase: '/agentadmit',
 *     authToken: adminJwt,
 *     appId: 'app_abc123',
 *   });
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AdminConnection,
  AdminUsage,
  AdminActivityEvent,
  AdminConnectionsResponse,
  AdminUsageResponse,
  AdminActivityResponse,
} from '../types';

export interface UseAdminDataOptions {
  apiBase: string;
  authToken: string;
  appId: string;
  /** Auto-refresh interval in ms. Set to 0 to disable. Default: 30000 */
  refreshInterval?: number;
}

export interface UseAdminDataReturn {
  connections: AdminConnection[];
  usage: AdminUsage | null;
  activity: AdminActivityEvent[];
  totalActivity: number;
  loading: boolean;
  error: string | null;
  refreshConnections: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  refreshActivity: (limit?: number, offset?: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  revokeConnection: (connectionId: string) => Promise<boolean>;
  clearError: () => void;
}

export function useAdminData({
  apiBase,
  authToken,
  appId,
  refreshInterval = 30_000,
}: UseAdminDataOptions): UseAdminDataReturn {
  const [connections, setConnections] = useState<AdminConnection[]>([]);
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [activity, setActivity] = useState<AdminActivityEvent[]>([]);
  const [totalActivity, setTotalActivity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  // ── Connections ─────────────────────────────────────────────────────────────

  const refreshConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ app_id: appId });
      const res = await fetch(`${apiBase}/admin/connections?${params}`, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error_description ||
            `Failed to fetch connections: ${res.status}`,
        );
      }
      const data: AdminConnectionsResponse = await res.json();
      setConnections(data.connections || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authToken, appId]);

  // ── Usage ────────────────────────────────────────────────────────────────────

  const refreshUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ app_id: appId });
      const res = await fetch(`${apiBase}/admin/usage?${params}`, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error_description ||
            `Failed to fetch usage: ${res.status}`,
        );
      }
      const data: AdminUsageResponse = await res.json();
      setUsage(data.usage || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authToken, appId]);

  // ── Activity ─────────────────────────────────────────────────────────────────

  const refreshActivity = useCallback(
    async (limit = 50, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          app_id: appId,
          limit: String(limit),
          offset: String(offset),
        });
        const res = await fetch(`${apiBase}/admin/activity?${params}`, { headers });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, string>).error_description ||
              `Failed to fetch activity: ${res.status}`,
          );
        }
        const data: AdminActivityResponse = await res.json();
        setActivity(data.events || []);
        setTotalActivity(data.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authToken, appId],
  );

  // ── Revoke ────────────────────────────────────────────────────────────────────

  const revokeConnection = useCallback(
    async (connectionId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/admin/connections/${connectionId}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, string>).error_description ||
              `Failed to revoke connection: ${res.status}`,
          );
        }
        // Optimistically remove from local state, then refresh
        setConnections(prev => prev.filter(c => c.connection_id !== connectionId));
        await refreshConnections();
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authToken, appId, refreshConnections],
  );

  // ── Refresh all ───────────────────────────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshConnections(), refreshUsage(), refreshActivity()]);
  }, [refreshConnections, refreshUsage, refreshActivity]);

  const clearError = useCallback(() => setError(null), []);

  // ── Initial load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Auto-refresh ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(() => {
      refreshConnections();
      refreshUsage();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, refreshConnections, refreshUsage]);

  // ── Auto-clear errors ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  return {
    connections,
    usage,
    activity,
    totalActivity,
    loading,
    error,
    refreshConnections,
    refreshUsage,
    refreshActivity,
    refreshAll,
    revokeConnection,
    clearError,
  };
}
