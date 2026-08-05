/**
 * AgentAdmitAdminPanel (Connections tab) — declared purpose display + search.
 *
 * Declared purpose: the user-facing reason recorded on the grant at the
 * consent moment. Review-time record only, never an enforcement input.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AgentAdmitAdminPanel } from '../components/AgentAdmitAdminPanel';
import { AdminConnection } from '../types';

const connections: AdminConnection[] = [
  {
    connection_id: 'conn_purpose',
    agent_label: 'Claude',
    user_label: 'jane@example.com',
    scopes: ['read:orders'],
    status: 'active',
    purpose: 'Reconcile June invoices',
  },
  {
    connection_id: 'conn_plain',
    agent_label: 'OtherBot',
    user_label: 'bob@example.com',
    scopes: ['read:reports'],
    status: 'active',
  },
];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/admin/connections')) {
      return jsonResponse({ connections, total: connections.length });
    }
    if (url.includes('/admin/usage')) {
      return jsonResponse({
        usage: {
          app_id: 'app_test',
          tier: { name: 'Free', call_limit: 100, calls_used: 1, calls_remaining: 99 },
          active_connections: 2,
          total_connections: 2,
        },
      });
    }
    if (url.includes('/admin/activity')) {
      return jsonResponse({
        events: [
          {
            occurred_at: '2026-08-05T12:00:00Z',
            event_id: 'evt_1',
            agent_label: 'Claude',
            scope: 'read:invoices',
            action: 'GET',
            endpoint: '/api/invoices',
            status_code: 200,
            purpose: 'Reconcile June invoices',
          },
          {
            occurred_at: '2026-08-05T12:01:00Z',
            event_id: 'evt_2',
            agent_label: 'OtherBot',
            scope: 'read:orders',
            action: 'GET',
            endpoint: '/api/orders',
            status_code: 200,
          },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      });
    }
    if (url.includes('/admin/alerts')) {
      return jsonResponse({ alerts: [], events: [], total: 0 });
    }
    return jsonResponse({});
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  return render(
    <AgentAdmitAdminPanel
      apiBase="/agentadmit"
      authToken="admin-jwt"
      appId="app_test"
      refreshInterval={0}
    />,
  );
}

describe('AgentAdmitAdminPanel declared purpose', () => {
  it('renders the purpose under the agent label when present', async () => {
    const { container } = renderPanel();

    await screen.findByText('Reconcile June invoices');

    const purposeEls = container.querySelectorAll('.aa-admin-conn-purpose');
    expect(purposeEls.length).toBe(1);
    const title = purposeEls[0].closest('.aa-admin-conn-title');
    expect(title).not.toBeNull();
    expect(title!.querySelector('.aa-admin-conn-agent')!.textContent).toBe('Claude');
  });

  it('renders nothing for purpose on connections without one', async () => {
    const { container } = renderPanel();

    await screen.findByText('OtherBot');

    const plainCard = screen.getByText('OtherBot').closest('.aa-admin-conn-card');
    expect(plainCard).not.toBeNull();
    expect(plainCard!.querySelector('.aa-admin-conn-purpose')).toBeNull();
    // Exactly one purpose element across both cards
    expect(container.querySelectorAll('.aa-admin-conn-purpose').length).toBe(1);
  });

  it('search filter matches purpose text', async () => {
    renderPanel();

    await screen.findByText('Reconcile June invoices');

    const search = screen.getByLabelText('Search connections');
    fireEvent.change(search, { target: { value: 'june invoices' } });

    await waitFor(() => {
      expect(screen.queryByText('OtherBot')).toBeNull();
      expect(screen.getByText('Claude')).toBeDefined();
    });

    // A query matching nothing hides both
    fireEvent.change(search, { target: { value: 'no-such-purpose' } });
    await waitFor(() => {
      expect(screen.queryByText('Claude')).toBeNull();
      expect(screen.getByText('No connections match your filters.')).toBeDefined();
    });
  });
});

describe('AgentAdmitAdminPanel activity-tab declared purpose', () => {
  it('renders purpose on activity rows that carry one, omits it otherwise', async () => {
    const { container } = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
    await vi.waitFor(() => {
      const purposeEls = container.querySelectorAll('.aa-activity-purpose');
      expect(purposeEls.length).toBe(1);
      expect(purposeEls[0].textContent).toBe('Reconcile June invoices');
    });
  });
});
