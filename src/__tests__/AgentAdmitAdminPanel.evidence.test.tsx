/**
 * AgentAdmitAdminPanel — consent-evidence view (admin/audit surface, v1.10.0).
 *
 * Opt-in via the `evidence` prop: each expanded connection card offers
 * "Consent evidence", lazily fetched from
 * GET {apiBase}/admin/connections/{id}/evidence (owner-implemented, same
 * response shape as the user-facing evidence route: display_tier + hosted +
 * app_record). Off by default — backends without the endpoint see no change
 * and no requests.
 *
 * Claim ceilings under test: tier labels never overclaim — an app record or
 * app-attested fact renders as the app's attestation, never as independently
 * verifiable; `none` renders honestly; a fetch failure renders an honest
 * unavailable state, never a fabricated tier.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AgentAdmitAdminPanel } from '../components/AgentAdmitAdminPanel';
import { AdminConnection, AdminConnectionEvidence } from '../types';

const connections: AdminConnection[] = [
  {
    connection_id: 'conn_evidence',
    agent_label: 'Claude',
    user_label: 'jane@example.com',
    scopes: ['read:orders'],
    status: 'active',
  },
];

const APP_ATTESTED_EVIDENCE: AdminConnectionEvidence = {
  connection_id: 'conn_evidence',
  display_tier: 'app_record',
  hosted: {
    evidence_available: true,
    tier: 'presence_fact',
    reason: 'app_attested_ceremony',
    ceremony: {
      verified_at: '2026-08-13T17:00:00Z',
      uv: true,
      method: 'app:tt_webauthn',
      provenance: 'app_attested',
    },
    commitment: null,
    ledger: { tamper_evident: true, granted_event_present: true },
  },
  app_record: {
    present: true,
    uv: true,
    verified_at: '2026-08-13T17:00:00Z',
    claim:
      "Verified by the app's passkey ceremony at grant time (recorded in both trails; not independently verifiable).",
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

let evidenceResponse: () => Response;
let evidenceCalls: string[];

beforeEach(() => {
  evidenceCalls = [];
  evidenceResponse = () => jsonResponse(APP_ATTESTED_EVIDENCE);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (/\/admin\/connections\/[^/]+\/evidence/.test(url)) {
      evidenceCalls.push(url);
      return evidenceResponse();
    }
    if (url.includes('/admin/connections')) {
      return jsonResponse({ connections, total: connections.length });
    }
    if (url.includes('/admin/usage')) {
      return jsonResponse({
        usage: {
          app_id: 'app_test',
          tier: { name: 'Free', call_limit: 100, calls_used: 1, calls_remaining: 99 },
          active_connections: 1,
          total_connections: 1,
        },
      });
    }
    if (url.includes('/admin/activity')) {
      return jsonResponse({ events: [], total: 0 });
    }
    return jsonResponse({});
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel(props: Partial<React.ComponentProps<typeof AgentAdmitAdminPanel>> = {}) {
  return render(
    <AgentAdmitAdminPanel
      apiBase="/agentadmit"
      authToken="admin-jwt"
      appId="app_test"
      refreshInterval={0}
      {...props}
    />,
  );
}

async function expandCard() {
  await waitFor(() => expect(screen.getByText('Claude')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /Claude \(jane@example\.com\)/ }));
}

describe('AgentAdmitAdminPanel consent-evidence view', () => {
  it('is off by default: no toggle, no evidence requests', async () => {
    renderPanel();
    await expandCard();

    expect(screen.queryByRole('button', { name: /Consent evidence/ })).toBeNull();
    expect(evidenceCalls).toHaveLength(0);
  });

  it('fetches lazily on toggle and renders the app-attested record with its honest claim', async () => {
    renderPanel({ evidence: true });
    await expandCard();

    // Nothing fetched until the admin asks.
    expect(evidenceCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Consent evidence for Claude/ }));

    await waitFor(() =>
      expect(screen.getByText('App passkey ceremony (app record)')).toBeTruthy(),
    );
    expect(evidenceCalls).toHaveLength(1);
    expect(evidenceCalls[0]).toContain('/agentadmit/admin/connections/conn_evidence/evidence');
    // Claim ceiling copy comes through verbatim.
    expect(screen.getByText(/not independently verifiable/)).toBeTruthy();
    // Ceremony facts render.
    expect(screen.getByText('Verified (UV)')).toBeTruthy();
    expect(screen.getByText('Attested by the app')).toBeTruthy();
    expect(screen.getByText('app:tt_webauthn')).toBeTruthy();
    expect(screen.getByText('Tamper-evident chain ✓')).toBeTruthy();
  });

  it('does not refetch when toggled closed and open again', async () => {
    renderPanel({ evidence: true });
    await expandCard();

    const toggle = () =>
      fireEvent.click(screen.getByRole('button', { name: /Consent evidence for Claude/ }));

    toggle();
    await waitFor(() => expect(evidenceCalls).toHaveLength(1));
    toggle(); // close
    toggle(); // open again
    await waitFor(() =>
      expect(screen.getByText('App passkey ceremony (app record)')).toBeTruthy(),
    );
    expect(evidenceCalls).toHaveLength(1);
  });

  it('renders hosted_vce with the independently-verifiable label and commitment hash', async () => {
    evidenceResponse = () =>
      jsonResponse({
        connection_id: 'conn_evidence',
        display_tier: 'hosted_vce',
        hosted: {
          evidence_available: true,
          tier: 'hosted_vce',
          claim:
            'Independently verifiable that a user-verified ceremony signed a commitment to these recorded grant parameters.',
          ceremony: {
            verified_at: '2026-08-13T17:00:00Z',
            uv: true,
            method: 'webauthn',
            provenance: 'hosted_witnessed',
          },
          commitment: { hash: 'c0ffee42', preimage_version: 1 },
          ledger: { tamper_evident: true, granted_event_present: true },
        },
        app_record: { present: false },
      } satisfies AdminConnectionEvidence);

    renderPanel({ evidence: true });
    await expandCard();
    fireEvent.click(screen.getByRole('button', { name: /Consent evidence for Claude/ }));

    await waitFor(() =>
      expect(screen.getByText('Independently verifiable ceremony record')).toBeTruthy(),
    );
    expect(screen.getByText('c0ffee42')).toBeTruthy();
    expect(screen.getByText('Witnessed by AgentAdmit')).toBeTruthy();
  });

  it('renders the none tier honestly with the hosted reason', async () => {
    evidenceResponse = () =>
      jsonResponse({
        connection_id: 'conn_evidence',
        display_tier: 'none',
        hosted: { evidence_available: false, tier: 'none', reason: 'direct_api_mint' },
        app_record: { present: false },
      } satisfies AdminConnectionEvidence);

    renderPanel({ evidence: true });
    await expandCard();
    fireEvent.click(screen.getByRole('button', { name: /Consent evidence for Claude/ }));

    await waitFor(() => expect(screen.getByText('No ceremony evidence')).toBeTruthy());
    expect(screen.getByText('direct_api_mint')).toBeTruthy();
  });

  it('fails honestly on fetch errors — no fabricated tier', async () => {
    evidenceResponse = () => new Response('{}', { status: 500 });

    renderPanel({ evidence: true });
    await expandCard();
    fireEvent.click(screen.getByRole('button', { name: /Consent evidence for Claude/ }));

    await waitFor(() => expect(screen.getByText(/Evidence unavailable right now/)).toBeTruthy());
    expect(screen.queryByText(/ceremony record/)).toBeNull();
    expect(screen.queryByText('No ceremony evidence')).toBeNull();
  });
});
