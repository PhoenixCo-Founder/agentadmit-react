/**
 * useConsentSession / ConnectAgentButton — starting the hosted consent page.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useConsentSession, isAcceptableSessionUrl } from '../hooks/useConsentSession';
import { ConnectAgentButton } from '../components/ConnectAgentButton';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;
let nextResponse: () => Response;

beforeEach(() => {
  nextResponse = () => jsonResponse({ session_url: 'https://agentadmit.com/connect/csess_abc' });
  fetchMock = vi.fn(async () => nextResponse());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useConsentSession', () => {
  it('POSTs to the app backend and opens the returned https session_url', async () => {
    const opened: string[] = [];
    const { result } = renderHook(() => useConsentSession({
      createUrl: '/api/agentadmit/consent-session',
      requestHeaders: { Authorization: 'Bearer sess' },
      body: { template_id: 'full_coach' },
      onSessionUrl: (u) => opened.push(u),
    }));
    let url: string | null = null;
    await act(async () => { url = await result.current.start(); });
    expect(url).toBe('https://agentadmit.com/connect/csess_abc');
    expect(opened).toEqual(['https://agentadmit.com/connect/csess_abc']);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe('/api/agentadmit/consent-session');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sess' });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ template_id: 'full_coach' });
    expect(result.current.error).toBeNull();
  });

  it('refuses a non-https session_url and surfaces backend errors', async () => {
    const opened: string[] = [];
    nextResponse = () => jsonResponse({ session_url: 'http://evil.example/connect' });
    const { result } = renderHook(() => useConsentSession({ createUrl: '/x', onSessionUrl: (u) => opened.push(u) }));
    await act(async () => { await result.current.start(); });
    expect(opened).toEqual([]);
    expect(result.current.error).toMatch(/https session_url/);

    nextResponse = () => jsonResponse({ error: 'account_suspended', error_description: 'Account suspended' }, 403);
    await act(async () => { await result.current.start(); });
    expect(result.current.error).toBe('Account suspended');
    expect(opened).toEqual([]);
  });

  it('isAcceptableSessionUrl only accepts https', () => {
    expect(isAcceptableSessionUrl('https://agentadmit.com/connect/x')).toBe(true);
    expect(isAcceptableSessionUrl('http://agentadmit.com/connect/x')).toBe(false);
    expect(isAcceptableSessionUrl('javascript:alert(1)')).toBe(false);
    expect(isAcceptableSessionUrl(undefined)).toBe(false);
  });
});

describe('ConnectAgentButton', () => {
  it('renders, shows the starting label, and opens the hosted page', async () => {
    const opened: string[] = [];
    render(<ConnectAgentButton createUrl="/api/agentadmit/consent-session" onSessionUrl={(u) => opened.push(u)} />);
    const btn = screen.getByRole('button', { name: 'Connect an AI agent' });
    fireEvent.click(btn);
    await waitFor(() => expect(opened).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the error and calls onError when the session cannot start', async () => {
    nextResponse = () => jsonResponse({ error: 'session_create_failed' }, 500);
    const onError = vi.fn();
    render(<ConnectAgentButton createUrl="/x" onError={onError} onSessionUrl={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
