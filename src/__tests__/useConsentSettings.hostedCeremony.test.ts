/**
 * useConsentSettings — hosted ceremony hand-off (AgentAdmit 058). When the
 * proxy answers the PUT with { ceremony_required, ceremony_url }, nothing is
 * written yet: the hook must not mark the switch as set and must hand the
 * user to the hosted page.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useConsentSettings } from '../hooks/useConsentSettings';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let putBody: () => Response;

beforeEach(() => {
  putBody = () => jsonResponse({ ceremony_required: true, ceremony_url: 'https://agentadmit.com/consent-change/scsess_x' });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/consent/settings') && init?.method === 'PUT') return putBody();
    if (url.endsWith('/consent/settings')) {
      return jsonResponse({ settings: [], effective: { human_session: { granted: true, source: 'default' }, in_app_ai: { granted: false, source: 'default' }, external_agent: { granted: true, source: 'default' } }, app_defaults: {} });
    }
    return jsonResponse({});
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useConsentSettings hosted ceremony hand-off', () => {
  it('hands the user to the hosted page and does not mark the switch as set', async () => {
    const opened: Array<{ url: string; callerClass: string; granted: boolean }> = [];
    const { result } = renderHook(() => useConsentSettings({
      apiBase: '/agentadmit', authToken: 'sess',
      onHostedCeremony: (url, ctx) => { opened.push({ url, ...ctx }); },
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.setConsent('in_app_ai', true); });
    expect(ok).toBe(false);
    expect(opened).toEqual([{ url: 'https://agentadmit.com/consent-change/scsess_x', callerClass: 'in_app_ai', granted: true }]);
    expect(result.current.effective.in_app_ai).toMatchObject({ granted: false });
    expect(result.current.error).toBeNull();
  });

  it('refuses a non-https ceremony URL', async () => {
    putBody = () => jsonResponse({ ceremony_required: true, ceremony_url: 'http://evil.example/x' });
    const opened: string[] = [];
    const { result } = renderHook(() => useConsentSettings({ apiBase: '/agentadmit', authToken: 'sess', onHostedCeremony: (u) => { opened.push(u); } }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.setConsent('in_app_ai', true); });
    expect(opened).toEqual([]);
    expect(result.current.error).toMatch(/https/);
  });

  it('a plain 200 without ceremony fields still applies the switch', async () => {
    putBody = () => jsonResponse({ caller_class: 'in_app_ai', granted: true, changed: true });
    const { result } = renderHook(() => useConsentSettings({ apiBase: '/agentadmit', authToken: 'sess' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.setConsent('in_app_ai', true); });
    expect(ok).toBe(true);
    expect(result.current.effective.in_app_ai).toMatchObject({ granted: true, source: 'setting' });
  });
});
