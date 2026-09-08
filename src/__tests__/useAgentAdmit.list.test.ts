/**
 * useAgentAdmit — list + revoke only (2.0). The hook no longer mints tokens:
 * the consent step runs on the hosted consent page.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useAgentAdmit } from '../hooks/useAgentAdmit';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let connections = [{ connection_id: 'conn_1', scopes: ['read:profile'], status: 'active' }];

beforeEach(() => {
  connections = [{ connection_id: 'conn_1', scopes: ['read:profile'], status: 'active' }];
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/connections') && (!init?.method || init.method === 'GET')) {
      return jsonResponse({ connections });
    }
    if (url.endsWith('/connections/conn_1') && init?.method === 'DELETE') {
      connections = [];
      return jsonResponse({ revoked: true });
    }
    return jsonResponse({ error: 'not_found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useAgentAdmit (2.0: list + revoke)', () => {
  it('lists connections on mount and revokes through the proxy', async () => {
    const { result } = renderHook(() => useAgentAdmit({ apiBase: '/agentadmit', authToken: 'sess' }));
    await waitFor(() => expect(result.current.connectionsLoaded).toBe(true));
    expect(result.current.connections).toHaveLength(1);

    let ok = false;
    await act(async () => { ok = await result.current.revokeConnection('conn_1'); });
    expect(ok).toBe(true);
    const del = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'DELETE');
    expect(String(del![0])).toBe('/agentadmit/connections/conn_1');
    expect((del![1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sess' });
    await waitFor(() => expect(result.current.connections).toHaveLength(0));
  });

  it('exposes no token-minting surface', () => {
    const { result } = renderHook(() => useAgentAdmit({ apiBase: '/agentadmit', authToken: 'sess' }));
    expect((result.current as any).generateToken).toBeUndefined();
    expect((result.current as any).connectionToken).toBeUndefined();
    const posted = fetchMock.mock.calls.some(([url, init]) => String(url).includes('generate-token') || (init as RequestInit)?.method === 'POST');
    expect(posted).toBe(false);
  });
});
