/**
 * useAgentAdmit — lists and revokes the signed-in user's agent connections
 * through your backend proxy.
 *
 * The consent step (scope selection, duration, intent, existing-grant review,
 * presence ceremony, token display) runs on the AgentAdmit hosted consent page,
 * opened on your app's behalf. Use `useConsentSession` / `ConnectAgentButton`
 * to start it. This hook only reads and revokes connections afterwards.
 */

import { useState, useEffect, useCallback } from 'react';
import { ConnectionInfo, RateLimitInfo } from '../types';
import { readAgentAdmitError } from '../lib/normalizeError';

interface UseAgentAdmitOptions {
  apiBase: string;
  authToken: string;
}

interface UseAgentAdmitReturn {
  connections: ConnectionInfo[];
  /**
   * True once the initial GET /connections attempt has settled (success or
   * failure). Lets consumers distinguish "not fetched yet" from "no
   * connections"; on failure `connections` stays empty.
   */
  connectionsLoaded: boolean;
  loading: boolean;
  error: string | null;
  /** Rate limit info if the last request was rejected with HTTP 429, otherwise null. */
  rateLimitInfo: RateLimitInfo | null;
  /** True if the last request was rate-limited (HTTP 429). */
  isRateLimited: boolean;
  revokeConnection: (connectionId: string) => Promise<boolean>;
  refreshConnections: () => Promise<void>;
  clearError: () => void;
  /** Clear rate limit state manually (auto-clears on next successful request). */
  clearRateLimit: () => void;
}

/** Parse a numeric HTTP response header. Returns null if absent or non-numeric. */
function parseNumericHeader(res: Response, name: string): number | null {
  const val = res.headers.get(name);
  if (val === null) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

/** Extract RateLimitInfo from a 429 response. */
function extractRateLimitInfo(res: Response): RateLimitInfo {
  return {
    retryAfter: parseNumericHeader(res, 'Retry-After'),
    limit:      parseNumericHeader(res, 'X-RateLimit-Limit'),
    remaining:  parseNumericHeader(res, 'X-RateLimit-Remaining'),
    reset:      parseNumericHeader(res, 'X-RateLimit-Reset'),
  };
}

export function useAgentAdmit({ apiBase, authToken }: UseAgentAdmitOptions): UseAgentAdmitReturn {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const refreshConnections = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/connections`, { headers });
      if (!res.ok) throw new Error('Failed to fetch connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (err: any) {
      console.error('[AgentAdmit] Failed to fetch connections:', err);
    } finally {
      setConnectionsLoaded(true);
    }
  }, [apiBase, authToken]);

  const revokeConnection = useCallback(async (connectionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setRateLimitInfo(null);
    try {
      const res = await fetch(`${apiBase}/connections/${connectionId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.status === 429) {
        const rlInfo = extractRateLimitInfo(res);
        setRateLimitInfo(rlInfo);
        const retryMsg = rlInfo.retryAfter !== null
          ? ` Please retry in ${Math.ceil(rlInfo.retryAfter)} seconds.`
          : '';
        throw new Error(`Rate limit exceeded.${retryMsg}`);
      }

      if (!res.ok) {
        const errData = readAgentAdmitError(await res.json().catch(() => ({})));
        throw new Error(errData.error_description || 'Revocation failed');
      }

      // Refresh connections after revoke
      await refreshConnections();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiBase, authToken, refreshConnections]);

  const clearError = useCallback(() => setError(null), []);
  const clearRateLimit = useCallback(() => setRateLimitInfo(null), []);

  // Fetch connections on mount
  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  // Auto-clear error after 6 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  return {
    connections,
    connectionsLoaded,
    loading,
    error,
    rateLimitInfo,
    isRateLimited: rateLimitInfo !== null,
    revokeConnection,
    refreshConnections,
    clearError,
    clearRateLimit,
  };
}
