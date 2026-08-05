/**
 * ConnectionsList — declared purpose display.
 *
 * Declared purpose: the user-facing reason recorded on the grant at the
 * consent moment. Review-time record only, never an enforcement input.
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

describe('ConnectionsList declared purpose', () => {
  it('renders the purpose under the agent label when present', () => {
    const conns: ConnectionInfo[] = [
      { ...baseConn, purpose: 'Reconcile June invoices' },
    ];
    const { container } = render(
      <ConnectionsList connections={conns} onRevoke={() => {}} />,
    );

    const purposeEl = container.querySelector('.aa-connection-purpose');
    expect(purposeEl).not.toBeNull();
    expect(purposeEl!.textContent).toBe('Reconcile June invoices');
    // Rendered inside the same title block as the agent label
    const title = purposeEl!.closest('.aa-connection-title');
    expect(title).not.toBeNull();
    expect(title!.querySelector('.aa-connection-agent')!.textContent).toBe('Claude');
  });

  it('renders nothing for purpose when absent (undefined, null, empty)', () => {
    const conns: ConnectionInfo[] = [
      { ...baseConn, connection_id: 'conn_a' },
      { ...baseConn, connection_id: 'conn_b', purpose: null },
      { ...baseConn, connection_id: 'conn_c', purpose: '' },
    ];
    const { container } = render(
      <ConnectionsList connections={conns} onRevoke={() => {}} />,
    );

    expect(container.querySelectorAll('.aa-connection-purpose').length).toBe(0);
  });

  it('only renders purpose for connections that carry one', () => {
    const conns: ConnectionInfo[] = [
      { ...baseConn, connection_id: 'conn_a', purpose: 'Draft weekly status email' },
      { ...baseConn, connection_id: 'conn_b' },
    ];
    const { container } = render(
      <ConnectionsList connections={conns} onRevoke={() => {}} />,
    );

    expect(container.querySelectorAll('.aa-connection-purpose').length).toBe(1);
    expect(screen.getByText('Draft weekly status email')).toBeDefined();
  });
});
