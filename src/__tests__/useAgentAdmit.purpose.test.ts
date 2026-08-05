/**
 * useAgentAdmit.generateToken — declared purpose pass-through.
 *
 * Declared purpose: the user-facing reason recorded on the grant at the
 * consent moment. Review-time record only, never an enforcement input.
 * The hook passes `purpose` through unchanged; the backend validates 1–300.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAgentAdmit } from '../hooks/useAgentAdmit';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/connections/generate-token') && init?.method === 'POST') {
      return jsonResponse({ token: 'tok_123' });
    }
    if (url.endsWith('/connections')) {
      return jsonResponse({ connections: [] });
    }
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function generateTokenBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(
    ([input]) => String(input).endsWith('/connections/generate-token'),
  );
  expect(call).toBeDefined();
  return JSON.parse((call![1] as RequestInit).body as string);
}

describe('useAgentAdmit generateToken purpose option', () => {
  it('forwards purpose in the POST body when provided', async () => {
    const { result } = renderHook(() =>
      useAgentAdmit({ apiBase: '/agentadmit', authToken: 'jwt' }),
    );

    let token: string | null = null;
    await act(async () => {
      token = await result.current.generateToken(['read:orders'], 3600, {
        purpose: 'Reconcile June invoices',
      });
    });

    expect(token).toBe('tok_123');
    const body = generateTokenBody();
    expect(body.purpose).toBe('Reconcile June invoices');
    expect(body.scopes).toEqual(['read:orders']);
    expect(body.duration_seconds).toBe(3600);
  });

  it('omits purpose from the POST body when not provided', async () => {
    const { result } = renderHook(() =>
      useAgentAdmit({ apiBase: '/agentadmit', authToken: 'jwt' }),
    );

    await act(async () => {
      await result.current.generateToken(['read:orders'], null);
    });

    const body = generateTokenBody();
    expect('purpose' in body).toBe(false);
  });
});
