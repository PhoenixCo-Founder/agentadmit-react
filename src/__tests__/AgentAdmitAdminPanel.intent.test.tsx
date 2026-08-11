/**
 * AgentAdmitAdminPanel — user-declared-intent display + search.
 *
 * User-declared intent: the user's own words about what they want the agent
 * to do, recorded on the grant at the consent moment. Distinct from the
 * declared purpose (the app's declared reason). Review-time record, never an
 * enforcement input. Shown on the admin surfaces as "User intent".
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AgentAdmitAdminPanel } from '../components/AgentAdmitAdminPanel';
import { AdminConnection } from '../types';

const connections: AdminConnection[] = [
  {
    connection_id: 'conn_intent',
    agent_label: 'Claude',
    user_label: 'jane@example.com',
    scopes: ['read:orders'],
    status: 'active',
    purpose: 'Reconcile June invoices',
    user_intent: 'Make sure nothing is overdue',
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
            user_intent: 'Make sure nothing is overdue',
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

describe('AgentAdmitAdminPanel user-declared intent (Connections tab)', () => {
  it('shows "User intent" in the expanded card when present, omits it otherwise', async () => {
    const { container } = renderPanel();

    await screen.findByText('Claude');

    // Expand the card that carries an intent
    fireEvent.click(screen.getByRole('button', { name: 'Claude (jane@example.com), active' }));
    expect(screen.getByText('User intent')).toBeDefined();
    expect(container.querySelector('.aa-admin-conn-intent')!.textContent).toBe(
      'Make sure nothing is overdue',
    );

    // Expanding the card without one shows no intent row
    fireEvent.click(screen.getByRole('button', { name: 'OtherBot (bob@example.com), active' }));
    const plainCard = screen.getByText('OtherBot').closest('.aa-admin-conn-card');
    expect(plainCard!.querySelector('.aa-admin-conn-intent')).toBeNull();
  });

  it('search filter matches user_intent text', async () => {
    renderPanel();

    await screen.findByText('Claude');

    const search = screen.getByLabelText('Search connections');
    fireEvent.change(search, { target: { value: 'nothing is overdue' } });

    await waitFor(() => {
      expect(screen.queryByText('OtherBot')).toBeNull();
      expect(screen.getByText('Claude')).toBeDefined();
    });
  });
});

describe('AgentAdmitAdminPanel user-declared intent (Activity tab)', () => {
  it('renders labeled intent beside the purpose on rows that carry one', async () => {
    const { container } = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
    await vi.waitFor(() => {
      const intentEls = container.querySelectorAll('.aa-activity-intent');
      expect(intentEls.length).toBe(1);
      expect(intentEls[0].textContent).toBe('User intent: Make sure nothing is overdue');
      // Beside the declared purpose in the same row body
      const body = intentEls[0].closest('.aa-activity-body');
      expect(body!.querySelector('.aa-activity-purpose')!.textContent).toBe(
        'Reconcile June invoices',
      );
    });
  });

  it('activity search matches user_intent like it matches purpose', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: /activity/i }));
    await screen.findByText('User intent: Make sure nothing is overdue');

    const search = screen.getByLabelText('Search activity');
    fireEvent.change(search, { target: { value: 'nothing is overdue' } });
    await waitFor(() => {
      expect(screen.queryByText('/api/orders')).toBeNull();
      expect(screen.getByText('/api/invoices')).toBeDefined();
    });
  });
});
