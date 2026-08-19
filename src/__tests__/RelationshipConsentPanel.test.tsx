import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RelationshipConsentPanel } from '../components/RelationshipConsentPanel';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') return response({ granted: true });
    return response({
      effective: {
        human_session: { granted: false, source: 'platform_default' },
        in_app_ai: { granted: false, source: 'platform_default' },
        external_agent: { granted: false, source: 'platform_default' },
      },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RelationshipConsentPanel', () => {
  it('names the grantee and keeps all three access paths explicit', async () => {
    render(
      <RelationshipConsentPanel
        apiBase="/agentadmit"
        authToken="session"
        granteeUserId="trainer_4"
        relationshipType="trainer"
        granteeLabel="your trainer"
      />,
    );

    expect(screen.getByText('How your trainer can use your data')).toBeTruthy();
    expect(screen.getByText(/view your data directly to support you/)).toBeTruthy();
    expect(screen.getByText(/use this app's in-app AI to review your data/)).toBeTruthy();
    expect(screen.getByText(/use their external AI agents to review your data/)).toBeTruthy();
    await vi.waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(3));
  });

  it('sends only grantee coordinates; the backend must inject the signed-in subject', async () => {
    render(
      <RelationshipConsentPanel
        apiBase="/agentadmit"
        authToken="session"
        granteeUserId="trainer_4"
        relationshipType="trainer"
        granteeLabel="your trainer"
      />,
    );

    const direct = await screen.findByRole('switch', { name: 'Direct access' });
    await vi.waitFor(() => expect((direct as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(direct);

    await vi.waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
      expect(put).toBeTruthy();
      const body = JSON.parse(String((put![1] as RequestInit).body));
      expect(body).toEqual({
        grantee_user_id: 'trainer_4',
        relationship_type: 'trainer',
        caller_class: 'human_session',
        granted: true,
      });
      expect(body.subject_user_id).toBeUndefined();
    });
  });

  it('encodes relationship coordinates in the GET request', async () => {
    render(
      <RelationshipConsentPanel
        apiBase="/agentadmit"
        authToken="session"
        granteeUserId="doctor/a b"
        relationshipType="care-team"
        granteeLabel="Dr. Rivera"
      />,
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      '/agentadmit/consent/relationship/settings?grantee_user_id=doctor%2Fa+b&relationship_type=care-team',
    );
  });
});
