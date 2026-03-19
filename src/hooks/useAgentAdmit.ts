/**
 * useAgentAdmit — React hook for AgentAdmit API interactions.
 * Handles token generation, connection management, and state.
 */

import { useState, useEffect, useCallback } from 'react';
import { ConnectionInfo } from '../types';

interface UseAgentAdmitOptions {
  apiBase: string;
  authToken: string;
}

interface UseAgentAdmitReturn {
  connections: ConnectionInfo[];
  connectionToken: string | null;
  loading: boolean;
  error: string | null;
  generateToken: (scopes: string[], durationSeconds: number | null) => Promise<string | null>;
  revokeConnection: (connectionId: string) => Promise<boolean>;
  refreshConnections: () => Promise<void>;
  clearToken: () => void;
  clearError: () => void;
}

export function useAgentAdmit({ apiBase, authToken }: UseAgentAdmitOptions): UseAgentAdmitReturn {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [connectionToken, setConnectionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error_description || errData.error || 'Token generation failed');
      }

      const data = await res.json();
      setConnectionToken(data.connection_token);
      return data.connection_token;
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
    try {
      const res = await fetch(`${apiBase}/connections/${connectionId}`, {
        method: 'DELETE',
        headers,
      });

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
    generateToken,
    revokeConnection,
    refreshConnections,
    clearToken,
    clearError,
  };
}
