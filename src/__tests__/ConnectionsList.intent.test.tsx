/**
 * ConnectionsList — user-declared-intent display.
 *
 * User-declared intent: the user's own words about what they want the agent
 * to do, recorded on the grant at the consent moment. Distinct from the
 * declared purpose (the app's declared reason). Review-time record, never an
 * enforcement input. Shown to the user as "Your intent".
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ConnectionsList } from '../components/ConnectionsList';
import { ConnectionInfo } from '../types';

afterEach(cleanup);

const baseConn: ConnectionInfo = {
  connection_id: 'conn_1',
  scopes: ['read:orders'],
  status: 'active',
  agent_label: 'Claude',
};

describe('ConnectionsList user-declared intent', () => {
  it('renders the intent beside the purpose with the "Your intent" label', () => {
    const conns: ConnectionInfo[] = [
      {
        ...baseConn,
        purpose: 'Reconcile June invoices',
        user_intent: 'Make sure nothing is overdue',
      },
    ];
    const { container } = render(
      <ConnectionsList connections={conns} onRevoke={() => {}} />,
    );

    const intentEl = container.querySelector('.aa-connection-intent');
    expect(intentEl).not.toBeNull();
    expect(intentEl!.textContent).toBe('Your intent: Make sure nothing is overdue');
    // Same title block as the agent label and the purpose
    const title = intentEl!.closest('.aa-connection-title');
    expect(title).not.toBeNull();
    expect(title!.querySelector('.aa-connection-purpose')!.textContent).toBe('Reconcile June invoices');
    expect(title!.querySelector('.aa-connection-agent')!.textContent).toBe('Claude');
  });

  it('renders intent without purpose, and nothing when absent (undefined, null, empty)', () => {
    const conns: ConnectionInfo[] = [
      { ...baseConn, connection_id: 'conn_a', user_intent: 'Watch my order status' },
      { ...baseConn, connection_id: 'conn_b' },
      { ...baseConn, connection_id: 'conn_c', user_intent: null },
      { ...baseConn, connection_id: 'conn_d', user_intent: '' },
    ];
    const { container } = render(
      <ConnectionsList connections={conns} onRevoke={() => {}} />,
    );

    expect(container.querySelectorAll('.aa-connection-intent').length).toBe(1);
    expect(screen.getByText('Your intent: Watch my order status')).toBeDefined();
  });
});
