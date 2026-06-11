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

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Lifecycle + concurrency guards:
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

  // ── Connections ─────────────────────────────────────────────────────────────

  const refreshConnections = useCallback(async () => {
    if (mountedRef.current) setError(null);
    try {
      const params = new URLSearchParams({ app_id: appId });
      const res = await authedFetch(`/admin/connections?${params}`);
      if (!res) return; // aborted
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error_description ||
            `Failed to fetch connections: ${res.status}`,
        );
      }
      const data: AdminConnectionsResponse = await res.json();
      if (mountedRef.current) setConnections(data.connections || []);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [authedFetch, appId]);

  // ── Usage ────────────────────────────────────────────────────────────────────

  const refreshUsage = useCallback(async () => {
    if (mountedRef.current) setError(null);
    try {
      const params = new URLSearchParams({ app_id: appId });
      const res = await authedFetch(`/admin/usage?${params}`);
      if (!res) return; // aborted
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error_description ||
            `Failed to fetch usage: ${res.status}`,
        );
      }
      const data: AdminUsageResponse = await res.json();
      if (mountedRef.current) setUsage(data.usage || null);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [authedFetch, appId]);

  // ── Activity ─────────────────────────────────────────────────────────────────

  const refreshActivity = useCallback(
    async (limit = 50, offset = 0) => {
      if (mountedRef.current) setError(null);
      try {
        const params = new URLSearchParams({
          app_id: appId,
          limit: String(limit),
          offset: String(offset),
        });
        const res = await authedFetch(`/admin/activity?${params}`);
        if (!res) return; // aborted
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, string>).error_description ||
              `Failed to fetch activity: ${res.status}`,
          );
        }
        const data: AdminActivityResponse = await res.json();
        if (mountedRef.current) {
          setActivity(data.events || []);
          setTotalActivity(data.total || 0);
        }
      } catch (err: unknown) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [authedFetch, appId],
  );

  // ── Revoke ────────────────────────────────────────────────────────────────────

  const revokeConnection = useCallback(
    async (connectionId: string): Promise<boolean> => {
      if (mountedRef.current) setError(null);
      try {
        const res = await authedFetch(`/admin/connections/${connectionId}`, { method: 'DELETE' });
        if (!res) return false; // aborted (e.g. unmounted mid-revoke)
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, string>).error_description ||
              `Failed to revoke connection: ${res.status}`,
          );
        }
        // Optimistically remove from local state, then refresh
        if (mountedRef.current) {
          setConnections(prev => prev.filter(c => c.connection_id !== connectionId));
        }
        await refreshConnections();
        return true;
      } catch (err: unknown) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [authedFetch, refreshConnections],
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

  // Skip a tick if the previous one is still running, so slow responses don't
  // stack request after request. The unmount effect aborts anything in flight.
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (!refreshInterval) return;
    const timer = setInterval(async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        await Promise.all([refreshConnections(), refreshUsage()]);
      } finally {
        pollInFlightRef.current = false;
      }
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
