/**
 * AgentAdmitAdminPanel — Embeddable admin dashboard for app owners.
 *
 * Drop this into your own app's admin dashboard to get full visibility
 * and control over all AgentAdmit agent connections across all your users.
 *
 * Usage:
 *   import { AgentAdmitAdminPanel } from '@agentadmit/react';
 *
 *   <AgentAdmitAdminPanel
 *     apiBase="/agentadmit"
 *     authToken={adminJwt}
 *     appId="app_abc123"
 *   />
 *
 * ARCHITECTURE NOTE: All token validation happens server-side through
 * AgentAdmit's hosted service at api.agentadmit.com. This component
 * calls YOUR backend (apiBase), which proxies to AgentAdmit using
 * your API key. Nothing sensitive is exposed in the browser.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  AgentAdmitAdminPanelProps,
  AdminTab,
  AdminConnection,
  AdminUsage,
  AdminActivityEvent,
} from '../types';
import { useAdminData } from '../hooks/useAdminData';
import { AapRootContext } from '../hooks/useStandaloneRoot';
import { useThemeClass } from '../hooks/useThemeClass';
import { AlertsPanel } from './AlertsPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr ?? '—';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'active': return 'aa-status-active';
    case 'revoked': return 'aa-status-revoked';
    case 'expired': return 'aa-status-expired';
    default: return 'aa-status-unknown';
  }
}

// ─── AdminConnectionCard ───────────────────────────────────────────────────────

interface AdminConnectionCardProps {
  conn: AdminConnection;
  onRevoke: (id: string) => void;
}

function AdminConnectionCard({ conn, onRevoke }: AdminConnectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const agentLabel = conn.agent_label || conn.agent_id || 'Unknown Agent';
  const userLabel = conn.user_label || conn.user_id || '—';
  const detailsId = `aa-admin-conn-${conn.connection_id}`;

  return (
    <div
      className={`aa-admin-conn-card ${statusClass(conn.status)}`}
      role="listitem"
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="aa-admin-conn-header"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${agentLabel} (${userLabel}), ${conn.status}`}
      >
        <div className="aa-admin-conn-primary">
          <span className="aa-admin-conn-agent">{agentLabel}</span>
          <span className={`aa-badge ${statusClass(conn.status)}`}>{conn.status}</span>
        </div>
        <div className="aa-admin-conn-secondary">
          <span className="aa-admin-conn-user" title="User">👤 {userLabel}</span>
          <span className="aa-admin-conn-scopes">
            {conn.scopes?.length || 0} scope{(conn.scopes?.length || 0) !== 1 ? 's' : ''}
          </span>
          {conn.last_used && (
            <span className="aa-admin-conn-last" title={conn.last_used}>
              {relativeTime(conn.last_used)}
            </span>
          )}
        </div>
        <span className="aa-chevron" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      </button>

      {/* Expandable details */}
      {expanded && (
        <div id={detailsId} className="aa-admin-conn-details">
          {/* Scopes */}
          <div className="aa-connection-scopes">
            <h4 className="aa-admin-detail-label">Granted Scopes</h4>
            <div className="aa-scope-tags" role="list" aria-label="Granted scopes">
              {(conn.scopes || []).map(s => (
                <span key={s} className="aa-scope-tag" role="listitem">{s}</span>
              ))}
              {conn.scopes?.length === 0 && <span className="aa-empty-inline">No scopes</span>}
            </div>
          </div>

          {/* Metadata grid */}
          <div className="aa-admin-conn-meta-grid">
            <div className="aa-admin-meta-item">
              <span className="aa-admin-meta-key">Connection ID</span>
              <span className="aa-admin-meta-val aa-mono">{conn.connection_id}</span>
            </div>
            {conn.agent_id && (
              <div className="aa-admin-meta-item">
                <span className="aa-admin-meta-key">Agent ID</span>
                <span className="aa-admin-meta-val aa-mono">{conn.agent_id}</span>
              </div>
            )}
            {conn.role && (
              <div className="aa-admin-meta-item">
                <span className="aa-admin-meta-key">Role</span>
                <span className="aa-admin-meta-val">{conn.role}</span>
              </div>
            )}
            <div className="aa-admin-meta-item">
              <span className="aa-admin-meta-key">Connected</span>
              <span className="aa-admin-meta-val">{formatDate(conn.created_at)}</span>
            </div>
            {conn.last_used && (
              <div className="aa-admin-meta-item">
                <span className="aa-admin-meta-key">Last Used</span>
                <span className="aa-admin-meta-val">{formatDate(conn.last_used)}</span>
              </div>
            )}
            {conn.expires_at && (
              <div className="aa-admin-meta-item">
                <span className="aa-admin-meta-key">Expires</span>
                <span className="aa-admin-meta-val">{formatDate(conn.expires_at)}</span>
              </div>
            )}
          </div>

          {/* Revoke action */}
          {conn.status === 'active' && (
            <div className="aa-connection-actions">
              {confirming ? (
                <div
                  className="aa-revoke-confirm"
                  role="alertdialog"
                  aria-live="assertive"
                  aria-label={`Confirm revoke for ${agentLabel}`}
                >
                  <p>
                    Revoke <strong>{agentLabel}</strong> for user <strong>{userLabel}</strong>?
                    The agent will immediately lose access.
                  </p>
                  <div className="aa-revoke-buttons">
                    <button
                      onClick={() => { onRevoke(conn.connection_id); setConfirming(false); }}
                      className="aa-btn aa-btn-danger"
                      aria-label={`Confirm revoke ${agentLabel}`}
                    >
                      Revoke Access
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="aa-btn aa-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="aa-btn aa-btn-danger-outline"
                  aria-label={`Revoke ${agentLabel}`}
                >
                  🗑 Revoke Access
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ConnectionsTab ────────────────────────────────────────────────────────────

interface ConnectionsTabProps {
  connections: AdminConnection[];
  loading: boolean;
  onRevoke: (id: string) => void;
  onRefresh: () => void;
}

function ConnectionsTab({ connections, loading, onRevoke, onRefresh }: ConnectionsTabProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');
  const [search, setSearch] = useState('');

  const filtered = connections.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (c.agent_label || '').toLowerCase().includes(q) ||
        (c.user_label || '').toLowerCase().includes(q) ||
        (c.user_id || '').toLowerCase().includes(q) ||
        c.connection_id.toLowerCase().includes(q) ||
        (c.scopes || []).some(s => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = connections.filter(c => c.status === 'active').length;

  return (
    <div className="aa-admin-tab-content">
      {/* Summary bar */}
      <div className="aa-admin-summary-bar">
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">{activeCount}</span>
          <span className="aa-admin-stat-label">Active</span>
        </div>
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">{connections.length}</span>
          <span className="aa-admin-stat-label">Total</span>
        </div>
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">
            {connections.filter(c => c.status === 'revoked').length}
          </span>
          <span className="aa-admin-stat-label">Revoked</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="aa-admin-toolbar">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent, user, scope, ID…"
          className="aa-admin-search"
          aria-label="Search connections"
        />
        <div className="aa-admin-filter-pills" role="group" aria-label="Filter by status">
          {(['all', 'active', 'revoked', 'expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`aa-filter-pill ${filter === f ? 'aa-filter-pill-active' : ''}`}
              aria-pressed={filter === f}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="aa-btn aa-btn-secondary aa-btn-sm"
          aria-label="Refresh connections"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {/* List */}
      {loading && filtered.length === 0 && (
        <div className="aa-loading">Loading connections…</div>
      )}
      {!loading && filtered.length === 0 && (
        <p className="aa-empty">
          {search || filter !== 'all'
            ? 'No connections match your filters.'
            : 'No connections found.'}
        </p>
      )}
      <div role="list" aria-label="Agent connections">
        {filtered.map(conn => (
          <AdminConnectionCard key={conn.connection_id} conn={conn} onRevoke={onRevoke} />
        ))}
      </div>
    </div>
  );
}

// ─── UsageBar ──────────────────────────────────────────────────────────────────

interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
}

function UsageBar({ label, used, limit }: UsageBarProps) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const isUnlimited = limit === null;
  const isOver = !isUnlimited && used > limit;

  return (
    <div className="aa-usage-bar-row">
      <div className="aa-usage-bar-header">
        <span className="aa-usage-bar-label">{label}</span>
        <span className="aa-usage-bar-count">
          {used.toLocaleString()}
          {!isUnlimited && (
            <> / {limit!.toLocaleString()} {isOver && <span className="aa-overage-tag">OVER</span>}</>
          )}
          {isUnlimited && <span className="aa-unlimited-tag"> (unlimited)</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div
          className="aa-usage-track"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit!}
          aria-label={label}
        >
          <div
            className={`aa-usage-fill ${isOver ? 'aa-usage-fill-over' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── UsageTab ─────────────────────────────────────────────────────────────────

interface UsageTabProps {
  usage: AdminUsage | null;
  loading: boolean;
  onRefresh: () => void;
}

function UsageTab({ usage, loading, onRefresh }: UsageTabProps) {
  if (loading && !usage) {
    return <div className="aa-loading">Loading usage data…</div>;
  }
  if (!usage) {
    return <p className="aa-empty">No usage data available.</p>;
  }

  const { tier, active_connections, total_connections, breakdown } = usage;

  return (
    <div className="aa-admin-tab-content">
      <div className="aa-admin-usage-header">
        <div>
          <h3 className="aa-admin-usage-tier">
            {tier.name} Tier
          </h3>
          {tier.period_start && tier.period_end && (
            <p className="aa-admin-usage-period">
              Billing period: {formatDate(tier.period_start)} → {formatDate(tier.period_end)}
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="aa-btn aa-btn-secondary aa-btn-sm"
          aria-label="Refresh usage"
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Key metrics */}
      <div className="aa-admin-summary-bar">
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">{active_connections}</span>
          <span className="aa-admin-stat-label">Active Connections</span>
        </div>
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">{total_connections}</span>
          <span className="aa-admin-stat-label">Total Connections</span>
        </div>
        <div className="aa-admin-stat">
          <span className="aa-admin-stat-value">
            {tier.calls_remaining !== null
              ? tier.calls_remaining.toLocaleString()
              : '∞'}
          </span>
          <span className="aa-admin-stat-label">Calls Remaining</span>
        </div>
        {(tier.overage_calls ?? 0) > 0 && (
          <div className="aa-admin-stat aa-stat-danger">
            <span className="aa-admin-stat-value">{tier.overage_calls!.toLocaleString()}</span>
            <span className="aa-admin-stat-label">Overage Calls</span>
          </div>
        )}
      </div>

      {/* API calls progress */}
      <div className="aa-admin-usage-section">
        <h4 className="aa-admin-section-label">API Calls This Period</h4>
        <UsageBar
          label="Total Calls"
          used={tier.calls_used}
          limit={tier.call_limit}
        />
      </div>

      {/* Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="aa-admin-usage-section">
          <h4 className="aa-admin-section-label">Breakdown</h4>
          {breakdown.map((item, i) => (
            <UsageBar
              key={i}
              label={item.label}
              used={item.calls}
              limit={tier.call_limit}
            />
          ))}
        </div>
      )}

      {/* Overage notice */}
      {tier.overage_enabled && (
        <p className="aa-admin-usage-note">
          ⚡ Overage billing is enabled. Calls beyond your tier limit are billed per-call.
        </p>
      )}
      {!tier.overage_enabled && tier.call_limit !== null && tier.calls_used >= tier.call_limit && (
        <p className="aa-admin-usage-warn">
          ⚠️ You have reached your plan limit. Upgrade to continue accepting agent connections.
        </p>
      )}
    </div>
  );
}

// ─── ActivityTab ───────────────────────────────────────────────────────────────

interface ActivityTabProps {
  events: AdminActivityEvent[];
  total: number;
  loading: boolean;
  onRefresh: (limit?: number, offset?: number) => void;
}

function ActivityTab({ events, total, loading, onRefresh }: ActivityTabProps) {
  const [search, setSearch] = useState('');

  const filtered = events.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.agent_label || '').toLowerCase().includes(q) ||
      (e.user_label || '').toLowerCase().includes(q) ||
      (e.scope || '').toLowerCase().includes(q) ||
      (e.action || '').toLowerCase().includes(q) ||
      (e.endpoint || '').toLowerCase().includes(q) ||
      (e.connection_id || '').toLowerCase().includes(q)
    );
  });

  function statusCodeClass(code?: number): string {
    if (!code) return '';
    if (code < 300) return 'aa-activity-ok';
    if (code < 400) return 'aa-activity-redirect';
    if (code < 500) return 'aa-activity-client-err';
    return 'aa-activity-server-err';
  }

  return (
    <div className="aa-admin-tab-content">
      {/* Toolbar */}
      <div className="aa-admin-toolbar">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent, user, scope, endpoint…"
          className="aa-admin-search"
          aria-label="Search activity"
        />
        <button
          onClick={() => onRefresh()}
          disabled={loading}
          className="aa-btn aa-btn-secondary aa-btn-sm"
          aria-label="Refresh activity"
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <p className="aa-admin-activity-count">
        {filtered.length < total
          ? `Showing ${filtered.length} of ${total} events`
          : `${total} events`}
      </p>

      {loading && events.length === 0 && (
        <div className="aa-loading">Loading activity…</div>
      )}
      {!loading && events.length === 0 && (
        <p className="aa-empty">No activity recorded yet.</p>
      )}

      <div className="aa-activity-list" role="list">
        {filtered.map((event, i) => (
          <div
            key={event.event_id ?? i}
            className="aa-activity-row"
            role="listitem"
          >
            {/* Left: time + status */}
            <div className="aa-activity-time-col">
              <span className="aa-activity-time" title={event.occurred_at}>
                {relativeTime(event.occurred_at)}
              </span>
              {event.status_code !== undefined && (
                <span className={`aa-activity-status-code ${statusCodeClass(event.status_code)}`}>
                  {event.status_code}
                </span>
              )}
            </div>

            {/* Center: who + what */}
            <div className="aa-activity-body">
              <div className="aa-activity-who">
                {event.agent_label || event.agent_id
                  ? <span className="aa-activity-agent">🤖 {event.agent_label || event.agent_id}</span>
                  : null}
                {event.user_label || event.user_id
                  ? <span className="aa-activity-user">👤 {event.user_label || event.user_id}</span>
                  : null}
              </div>
              <div className="aa-activity-what">
                {event.action && <span className="aa-activity-action">{event.action}</span>}
                {event.endpoint && (
                  <span className="aa-activity-endpoint aa-mono">{event.endpoint}</span>
                )}
                {event.scope && (
                  <span className="aa-scope-tag aa-scope-tag-sm">{event.scope}</span>
                )}
              </div>
              {event.connection_id && (
                <span className="aa-activity-conn-id aa-mono">{event.connection_id}</span>
              )}
            </div>

            {/* Right: details toggle */}
            {event.details && Object.keys(event.details).length > 0 && (
              <details className="aa-activity-details">
                <summary className="aa-activity-details-toggle">Details</summary>
                <pre className="aa-event-json">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {total > events.length && (
        <button
          onClick={() => onRefresh(50, events.length)}
          disabled={loading}
          className="aa-btn aa-btn-text"
        >
          Load more ({total - events.length} remaining)
        </button>
      )}
    </div>
  );
}

// ─── AgentAdmitAdminPanel (main) ──────────────────────────────────────────────

export function AgentAdmitAdminPanel({
  apiBase,
  authToken,
  appId,
  className = '',
  defaultTab = 'connections',
  onRevoke,
  refreshInterval = 30_000,
  theme = 'dark', // ≤1.1.0 always rendered dark; keep that default
}: AgentAdmitAdminPanelProps) {
  const themeClass = useThemeClass(theme);
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const {
    connections,
    usage,
    activity,
    totalActivity,
    loading,
    error,
    refreshConnections,
    refreshUsage,
    refreshActivity,
    revokeConnection,
    clearError,
  } = useAdminData({ apiBase, authToken, appId, refreshInterval });

  const handleRevoke = useCallback(
    async (connectionId: string) => {
      const ok = await revokeConnection(connectionId);
      if (ok) onRevoke?.(connectionId);
    },
    [revokeConnection, onRevoke],
  );

  const activeCount = connections.filter(c => c.status === 'active').length;

  const tabs: { id: AdminTab; label: string; badge?: number }[] = [
    { id: 'connections', label: '🔗 Connections', badge: activeCount },
    { id: 'usage', label: '📊 Usage' },
    { id: 'alerts', label: '🔔 Alerts' },
    { id: 'activity', label: '📋 Activity', badge: totalActivity > 0 ? totalActivity : undefined },
  ];

  // Tabs keyboard pattern: arrow keys move focus + selection, roving tabindex
  function handleTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setActiveTab(tabs[next].id);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <AapRootContext.Provider value={true}>
    <div className={`agent-admit-panel aa-admin-panel ${themeClass} ${className}`.trim()}>
      {/* Header */}
      <div className="aa-admin-panel-header">
        <div className="aa-admin-header-title-row">
          <h1 className="aa-admin-panel-title">🛡️ AgentAdmit Admin</h1>
          <span className="aa-admin-app-id aa-mono">{appId}</span>
        </div>
        <p className="aa-admin-panel-subtitle">
          Full visibility and control over all agent connections in your app.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="aa-alert-error" role="alert">
          {error}
          <button onClick={clearError} className="aa-error-close" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="aa-admin-tabs" role="tablist" aria-label="Admin sections">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[i] = el; }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`aa-admin-tabpanel-${tab.id}`}
            id={`aa-admin-tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onKeyDown={e => handleTabKeyDown(e, i)}
            onClick={() => setActiveTab(tab.id)}
            className={`aa-tab ${activeTab === tab.id ? 'aa-tab-active' : ''}`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="aa-badge-count" aria-label={`${tab.badge} items`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id={`aa-admin-tabpanel-connections`}
        role="tabpanel"
        aria-labelledby="aa-admin-tab-connections"
        hidden={activeTab !== 'connections'}
      >
        {activeTab === 'connections' && (
          <ConnectionsTab
            connections={connections}
            loading={loading}
            onRevoke={handleRevoke}
            onRefresh={refreshConnections}
          />
        )}
      </div>

      <div
        id={`aa-admin-tabpanel-usage`}
        role="tabpanel"
        aria-labelledby="aa-admin-tab-usage"
        hidden={activeTab !== 'usage'}
      >
        {activeTab === 'usage' && (
          <UsageTab
            usage={usage}
            loading={loading}
            onRefresh={refreshUsage}
          />
        )}
      </div>

      <div
        id={`aa-admin-tabpanel-alerts`}
        role="tabpanel"
        aria-labelledby="aa-admin-tab-alerts"
        hidden={activeTab !== 'alerts'}
      >
        {activeTab === 'alerts' && (
          <AlertsPanel
            apiBase={apiBase}
            authToken={authToken}
            appId={appId}
            theme={theme}
          />
        )}
      </div>

      <div
        id={`aa-admin-tabpanel-activity`}
        role="tabpanel"
        aria-labelledby="aa-admin-tab-activity"
        hidden={activeTab !== 'activity'}
      >
        {activeTab === 'activity' && (
          <ActivityTab
            events={activity}
            total={totalActivity}
            loading={loading}
            onRefresh={refreshActivity}
          />
        )}
      </div>
    </div>
    </AapRootContext.Provider>
  );
}
