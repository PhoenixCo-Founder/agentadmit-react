/**
 * useAgentAdmit — React hook for AgentAdmit API interactions.
 * Handles token generation, connection management, and state.
 */

import { useState, useEffect, useCallback } from 'react';
import { ConnectionInfo, RateLimitInfo } from '../types';

interface UseAgentAdmitOptions {
  apiBase: string;
  authToken: string;
}

interface UseAgentAdmitReturn {
  connections: ConnectionInfo[];
  connectionToken: string | null;
  loading: boolean;
  error: string | null;
  /** Rate limit info if the last request was rejected with HTTP 429, otherwise null. */
  rateLimitInfo: RateLimitInfo | null;
  /** True if the last request was rate-limited (HTTP 429). */
  isRateLimited: boolean;
  generateToken: (scopes: string[], durationSeconds: number | null) => Promise<string | null>;
  revokeConnection: (connectionId: string) => Promise<boolean>;
  refreshConnections: () => Promise<void>;
  clearToken: () => void;
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
  const [connectionToken, setConnectionToken] = useState<string | null>(null);
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
    }
  }, [apiBase, authToken]);

  const generateToken = useCallback(async (scopes: string[], durationSeconds: number | null): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setRateLimitInfo(null);
    try {
      const body: any = { scopes };
      if (durationSeconds !== null) {
        body.duration_seconds = durationSeconds;
      }

      const res = await fetch(`${apiBase}/connections/generate-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        // Surface rate limit state — do NOT retry automatically in the browser
        const rlInfo = extractRateLimitInfo(res);
        setRateLimitInfo(rlInfo);
        const retryMsg = rlInfo.retryAfter !== null
          ? ` Please retry in ${Math.ceil(rlInfo.retryAfter)} seconds.`
          : '';
        throw new Error(`Rate limit exceeded.${retryMsg}`);
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error_description || errData.error || 'Token generation failed');
      }

      const data = await res.json();
      // The host-app proxy contract for this field isn't pinned: the native
      // AgentAdmit backend returns `token`, but a proxy may rename it to
      // `connection_token`. Accept either so the SDK works with both.
      const token: string | null = data.connection_token ?? data.token ?? null;
      setConnectionToken(token);
      return token;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
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
        const errData = await res.json();
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

  const clearToken = useCallback(() => setConnectionToken(null), []);
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
    connectionToken,
    loading,
    error,
    rateLimitInfo,
    isRateLimited: rateLimitInfo !== null,
    generateToken,
    revokeConnection,
    refreshConnections,
    clearToken,
    clearError,
    clearRateLimit,
  };
}
