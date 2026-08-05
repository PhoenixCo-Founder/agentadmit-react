/**
 * AgentAdmitPanel — declared-purpose input (opt-in via `purposeInput`).
 *
 * Declared purpose: the user-facing reason recorded on the grant at the
 * consent moment. Review-time record only, never an enforcement input.
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

describe('AgentAdmitPanel purposeInput', () => {
  it('renders no purpose input by default (prop absent)', () => {
    render(
      <AgentAdmitPanel apiBase="/api/aa" authToken="t" scopeResources={SCOPES} presetGroups={PRESETS} />,
    );
    selectFirstScope();
    expect(document.getElementById('aa-purpose-input')).toBeNull();
  });

  it('shows the input once a scope is selected, and forwards the typed purpose', async () => {
    render(
      <AgentAdmitPanel
        apiBase="/api/aa"
        authToken="t"
        scopeResources={SCOPES}
        presetGroups={PRESETS}
        purposeInput
      />,
    );
    expect(document.getElementById('aa-purpose-input')).toBeNull();
    selectFirstScope();
    const input = document.getElementById('aa-purpose-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.maxLength).toBe(300);
    fireEvent.change(input, { target: { value: '  Weekly summaries for my coach  ' } });
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([u, init]) =>
          String(u).endsWith('/connections/generate-token') &&
          (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(call).toBeTruthy();
      const body = JSON.parse(String((call![1] as RequestInit).body));
      expect(body.purpose).toBe('Weekly summaries for my coach');
    });
  });

  it('omits purpose from the mint body when the input is left empty', async () => {
    render(
      <AgentAdmitPanel
        apiBase="/api/aa"
        authToken="t"
        scopeResources={SCOPES}
        presetGroups={PRESETS}
        purposeInput={{ label: 'Why?', placeholder: 'reason' }}
      />,
    );
    selectFirstScope();
    expect(screen.getByText('Why?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([u, init]) =>
          String(u).endsWith('/connections/generate-token') &&
          (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(call).toBeTruthy();
      const body = JSON.parse(String((call![1] as RequestInit).body));
      expect('purpose' in body).toBe(false);
    });
  });
});
