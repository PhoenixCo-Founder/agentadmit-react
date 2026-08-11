/**
 * AgentAdmitPanel — user-declared-intent input (opt-in via `intentInput`).
 *
 * User-declared intent: the user's own words about what they want the agent
 * to do, recorded on the grant at the consent moment. Distinct from the
 * declared purpose (the app's declared reason). Review-time record, never an
 * enforcement input.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AgentAdmitPanel } from '../components/AgentAdmitPanel';
import type { ScopeResource } from '../types';

const PRESETS = [
  { id: 'Workouts', label: 'Workouts', icon: '💪', description: 'Workout data' },
];

const SCOPES: ScopeResource[] = [
  {
    group: 'Workouts',
    resource: 'workouts',
    pills: [{ label: 'Read workouts', scope: 'read:workouts' }],
  },
];

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

function selectFirstScope() {
  const groupBtn = screen
    .getAllByRole('button', { name: /Workouts/ })
    .find((b) => b.hasAttribute('aria-expanded'));
  if (!groupBtn) throw new Error('group header button not found');
  fireEvent.click(groupBtn); // expand the collapsed group
  fireEvent.click(screen.getByText('Read workouts'));
}

function generateTokenBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(
    ([u, init]) =>
      String(u).endsWith('/connections/generate-token') &&
      (init as RequestInit | undefined)?.method === 'POST',
  );
  expect(call).toBeTruthy();
  return JSON.parse(String((call![1] as RequestInit).body));
}

describe('AgentAdmitPanel intentInput', () => {
  it('renders no intent input by default (prop absent)', () => {
    render(
      <AgentAdmitPanel apiBase="/api/aa" authToken="t" scopeResources={SCOPES} presetGroups={PRESETS} />,
    );
    selectFirstScope();
    expect(document.getElementById('aa-intent-input')).toBeNull();
  });

  it('shows the input once a scope is selected, and forwards the trimmed intent as user_intent', async () => {
    render(
      <AgentAdmitPanel
        apiBase="/api/aa"
        authToken="t"
        scopeResources={SCOPES}
        presetGroups={PRESETS}
        intentInput
      />,
    );
    expect(document.getElementById('aa-intent-input')).toBeNull();
    selectFirstScope();
    const input = document.getElementById('aa-intent-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.maxLength).toBe(300);
    expect(
      screen.getByText('What do you want this agent to do? (optional)'),
    ).toBeTruthy();
    fireEvent.change(input, { target: { value: '  Keep my training log up to date  ' } });
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const body = generateTokenBody();
      expect(body.user_intent).toBe('Keep my training log up to date');
      expect('purpose' in body).toBe(false);
    });
  });

  it('omits user_intent from the mint body when the input is left empty', async () => {
    render(
      <AgentAdmitPanel
        apiBase="/api/aa"
        authToken="t"
        scopeResources={SCOPES}
        presetGroups={PRESETS}
        intentInput={{ label: 'Your goal?', placeholder: 'goal' }}
      />,
    );
    selectFirstScope();
    expect(screen.getByText('Your goal?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const body = generateTokenBody();
      expect('user_intent' in body).toBe(false);
    });
  });

  it('coexists with purposeInput: two distinct inputs, both values flow to the mint', async () => {
    render(
      <AgentAdmitPanel
        apiBase="/api/aa"
        authToken="t"
        scopeResources={SCOPES}
        presetGroups={PRESETS}
        purposeInput
        intentInput
      />,
    );
    selectFirstScope();
    const purposeEl = document.getElementById('aa-purpose-input') as HTMLInputElement;
    const intentEl = document.getElementById('aa-intent-input') as HTMLInputElement;
    expect(purposeEl).not.toBeNull();
    expect(intentEl).not.toBeNull();
    // Distinct default labels for the two different fields
    expect(screen.getByText('What will this agent do? (optional)')).toBeTruthy();
    expect(screen.getByText('What do you want this agent to do? (optional)')).toBeTruthy();

    fireEvent.change(purposeEl, { target: { value: 'Weekly summaries for my coach' } });
    fireEvent.change(intentEl, { target: { value: 'Track workouts and nudge me' } });
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const body = generateTokenBody();
      expect(body.purpose).toBe('Weekly summaries for my coach');
      expect(body.user_intent).toBe('Track workouts and nudge me');
    });
  });
});
