/** Display-only permission checks through the integrating app's user-owned proxy. */
import React, { useEffect, useId, useState } from 'react';
import { useStandaloneRoot } from '../hooks/useStandaloneRoot';

export interface ConnectionActivityEvent {
  id: string;
  timestamp: string;
  scope: string | null;
  label: string;
  decision: 'allowed' | 'denied' | 'confirmation_required' | 'limit_reached' | 'unavailable' | 'unknown';
}
export interface ConnectionActivityProps {
  /** App backend base, e.g. /api/agentadmit. Never the hosted export endpoint. */
  apiBase: string;
  /** Signed-in app user token. NEVER an AgentAdmit app API key. */
  authToken: string;
  connectionId: string;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
}
const decisions: Record<ConnectionActivityEvent['decision'], string> = {
  allowed: 'Permission check passed', denied: 'Permission denied',
  confirmation_required: 'Human confirmation needed', limit_reached: 'Call limit reached',
  unavailable: 'Could not check permission', unknown: 'Decision unavailable',
};

// Keyed boundary clears both cached data and in-flight reads on user/connection
// changes, including the render BEFORE an effect cleanup has had time to run.
export function ConnectionActivity(props: ConnectionActivityProps) {
  return <Activity key={JSON.stringify([props.apiBase, props.authToken, props.connectionId])} {...props} />;
}
function Activity({ apiBase, authToken, connectionId, theme, className = '' }: ConnectionActivityProps) {
  const root = useStandaloneRoot(theme);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [events, setEvents] = useState<ConnectionActivityEvent[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(false); setEvents([]); setNext(null);
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    void (async () => {
      try {
        if (!authToken || !connectionId) throw new Error('missing session');
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/connections/${encodeURIComponent(connectionId)}/activity?${params}`, {
          headers: { Authorization: `Bearer ${authToken}` }, cache: 'no-store', signal: controller.signal,
        });
        if (!res.ok) throw new Error('unavailable');
        const data = await res.json();
        if (data.connection_id !== connectionId || data.window_days !== 30 || !Array.isArray(data.events)
          || data.events.length > 20 || !(data.next_cursor === null || typeof data.next_cursor === 'string')
          || data.events.some((e: ConnectionActivityEvent) => !e || typeof e.id !== 'string'
            || typeof e.label !== 'string' || typeof e.timestamp !== 'string' || !Number.isFinite(Date.parse(e.timestamp))
            || !Object.prototype.hasOwnProperty.call(decisions, e.decision))) throw new Error('invalid activity');
        if (!controller.signal.aborted) { setEvents(data.events); setNext(data.next_cursor); }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [open, cursor, refresh, apiBase, authToken, connectionId]);
  return <section className={`${root} aa-activity ${className}`.trim()}>
    <button type="button" className="aa-btn aa-btn-text" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(!open)}>{open ? 'Hide activity' : 'Activity'}</button>
    {open && <div id={id} aria-busy={loading}>
      <p className="aa-activity-explanation">Recorded permission checks from the past 30 days, oldest first. A passed check does not prove an action completed. Some attempts may not be recorded; older records may no longer be retained.</p>
      {loading && <p role="status">Loading activity...</p>}
      {error && <p role="alert">Activity could not be loaded. Please try again.</p>}
      {!loading && !error && (events.length ? <ol className="aa-activity-list">
        {events.map(e => <li key={e.id}>
          <span className="aa-activity-label">{e.label}</span>
          <span>{decisions[e.decision]}</span>
          <time dateTime={e.timestamp}>{new Date(e.timestamp).toLocaleString()}</time>
        </li>)}
      </ol> : <p>No recorded checks in this period. This does not necessarily mean the agent was inactive.</p>)}
      <div className="aa-activity-actions">
        <button type="button" className="aa-btn aa-btn-secondary" disabled={loading} onClick={() => { setCursor(null); setRefresh(n => n + 1); }}>Refresh activity</button>
        {error && <button type="button" className="aa-btn aa-btn-secondary" onClick={() => setRefresh(n => n + 1)}>Retry</button>}
        {!error && next && <button type="button" className="aa-btn aa-btn-secondary" disabled={loading} onClick={() => setCursor(next)}>Next page</button>}
      </div>
    </div>}
  </section>;
}
