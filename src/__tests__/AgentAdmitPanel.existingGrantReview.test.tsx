/**
 * AgentAdmitPanel — existing-grant review step (on by default via
 * `existingGrantReview`).
 *
 * When the user already has active connections, the panel shows a blocking
 * review of each existing grant (agent label, declared purpose,
 * user-declared intent, scopes) with per-grant revoke and a
 * "Keep existing and continue" action before the generation form renders.
 * All displayed fields are review-time records, never enforcement inputs.
 * A connections-listing failure fails open to the normal flow.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AgentAdmitPanel } from '../components/AgentAdmitPanel';
import type { ConnectionInfo, ScopeResource } from '../types';

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

const GRANTS: ConnectionInfo[] = [
  {
    connection_id: 'conn_1',
    agent_label: 'Claude',
    status: 'active',
    scopes: ['read:workouts', 'read:meals'],
    purpose: 'Weekly summaries for my coach',
    user_intent: 'Keep my coach in the loop',
  },
  {
    connection_id: 'conn_2',
    agent_label: 'OtherBot',
    status: 'active',
    scopes: ['read:workouts'],
  },
  {
    connection_id: 'conn_3',
    agent_label: 'OldBot',
    status: 'revoked',
    scopes: ['read:workouts'],
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Fetch mock backed by a mutable connections array; DELETE revokes. */
function stubFetchWithConnections(initial: ConnectionInfo[]) {
  let conns = initial.map(c => ({ ...c }));
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/connections/generate-token') && init?.method === 'POST') {
      return jsonResponse({ token: 'tok_123' });
    }
    const revokeMatch = url.match(/\/connections\/([^/]+)$/);
    if (revokeMatch && init?.method === 'DELETE') {
      conns = conns.map(c =>
        c.connection_id === revokeMatch[1] ? { ...c, status: 'revoked' } : c,
      );
      return jsonResponse({ revoked: true });
    }
    if (url.endsWith('/connections')) {
      return jsonResponse({ connections: conns });
    }
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel(extraProps: Record<string, unknown> = {}) {
  return render(
    <AgentAdmitPanel
      apiBase="/api/aa"
      authToken="t"
      scopeResources={SCOPES}
      presetGroups={PRESETS}
      {...extraProps}
    />,
  );
}

function scopeGroupButton(): HTMLElement | undefined {
  return screen
    .queryAllByRole('button', { name: /Workouts/ })
    .find(b => b.hasAttribute('aria-expanded'));
}

describe('AgentAdmitPanel existing-grant review step', () => {
  it('blocks the generation form when active connections exist, showing each grant', async () => {
    stubFetchWithConnections(GRANTS);
    renderPanel();

    await screen.findByText('Review your existing agent access');

    // Generation form is hidden until the user chooses
    expect(scopeGroupButton()).toBeUndefined();
    expect(screen.queryByRole('button', { name: /generate token/i })).toBeNull();

    // Only ACTIVE grants are listed, with label, purpose, intent, and scopes
    const cards = document.querySelectorAll('.aa-review-grant-card');
    expect(cards.length).toBe(2);
    expect(screen.getByText('Claude')).toBeTruthy();
    expect(screen.getByText('OtherBot')).toBeTruthy();
    expect(screen.queryByText('OldBot')).toBeNull();
    expect(screen.getByText('Purpose: Weekly summaries for my coach')).toBeTruthy();
    expect(screen.getByText('Your intent: Keep my coach in the loop')).toBeTruthy();
    expect(screen.getAllByText('read:workouts').length).toBe(2);
    expect(screen.getByText('read:meals')).toBeTruthy();
  });

  it('revoke is two-step and removes the grant card on confirm', async () => {
    stubFetchWithConnections(GRANTS);
    renderPanel();

    await screen.findByText('Review your existing agent access');

    fireEvent.click(screen.getByRole('button', { name: 'Revoke access for Claude' }));
    // First click only opens the confirm dialog — nothing revoked yet
    expect(screen.getByRole('alertdialog', { name: 'Confirm revoke access for Claude' })).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm revoke access for Claude' }));
    await vi.waitFor(() => {
      expect(screen.queryByText('Claude')).toBeNull();
    });
    // The other grant is still under review; the form stays blocked
    expect(screen.getByText('OtherBot')).toBeTruthy();
    expect(scopeGroupButton()).toBeUndefined();
  });

  it('cancel closes the confirm dialog without revoking', async () => {
    const fetchMock = stubFetchWithConnections(GRANTS);
    renderPanel();

    await screen.findByText('Review your existing agent access');
    fireEvent.click(screen.getByRole('button', { name: 'Revoke access for Claude' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel revoke' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Claude')).toBeTruthy();
    const deletes = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
    );
    expect(deletes.length).toBe(0);
  });

  it('revoking every grant releases the block and renders the form', async () => {
    stubFetchWithConnections([GRANTS[0], GRANTS[2]]); // one active, one already revoked
    renderPanel();

    await screen.findByText('Review your existing agent access');
    fireEvent.click(screen.getByRole('button', { name: 'Revoke access for Claude' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm revoke access for Claude' }));

    await vi.waitFor(() => {
      expect(screen.queryByText('Review your existing agent access')).toBeNull();
      expect(scopeGroupButton()).toBeTruthy();
    });
  });

  it('"Keep existing and continue" dismisses the step and renders the generation form', async () => {
    stubFetchWithConnections(GRANTS);
    renderPanel();

    await screen.findByText('Review your existing agent access');
    fireEvent.click(screen.getByRole('button', { name: 'Keep existing and continue' }));

    expect(screen.queryByText('Review your existing agent access')).toBeNull();
    const groupBtn = scopeGroupButton();
    expect(groupBtn).toBeTruthy();
    // Full flow still works after continuing
    fireEvent.click(groupBtn!);
    fireEvent.click(screen.getByText('Read workouts'));
    expect(screen.getByRole('button', { name: /generate token/i })).toBeTruthy();
  });

  it('shows no review step when there are zero active connections', async () => {
    stubFetchWithConnections([GRANTS[2]]); // only a revoked one
    renderPanel();

    await vi.waitFor(() => {
      // Header reflects the settled fetch
      expect(screen.getByRole('button', { name: 'No active connections' })).toBeTruthy();
    });
    expect(screen.queryByText('Review your existing agent access')).toBeNull();
    expect(scopeGroupButton()).toBeTruthy();
  });

  it('fails open to the normal flow when the connections listing errors', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/connections/generate-token') && init?.method === 'POST') {
        return jsonResponse({ token: 'tok_123' });
      }
      if (url.endsWith('/connections')) {
        throw new Error('network down');
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPanel();

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    // Listing failure never blocks generation
    expect(screen.queryByText('Review your existing agent access')).toBeNull();
    const groupBtn = scopeGroupButton();
    expect(groupBtn).toBeTruthy();
    fireEvent.click(groupBtn!);
    fireEvent.click(screen.getByText('Read workouts'));
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await vi.waitFor(() => {
      const mint = fetchMock.mock.calls.find(
        ([u, init]) =>
          String(u).endsWith('/connections/generate-token') &&
          (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(mint).toBeTruthy();
    });
    consoleSpy.mockRestore();
  });

  it('existingGrantReview={false} opts out even when active connections exist', async () => {
    stubFetchWithConnections(GRANTS);
    renderPanel({ existingGrantReview: false });

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: '2 active connections' })).toBeTruthy();
    });
    expect(screen.queryByText('Review your existing agent access')).toBeNull();
    expect(scopeGroupButton()).toBeTruthy();
  });
});
