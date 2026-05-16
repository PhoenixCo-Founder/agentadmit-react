/**
 * ConnectionsList — Display and manage active agent connections.
 */

import React, { useState } from 'react';
import { ConnectionsListProps, ConnectionInfo } from '../types';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
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

function statusBadge(status: string): string {
  switch (status) {
    case 'active': return 'aa-status-active';
    case 'revoked': return 'aa-status-revoked';
    case 'expired': return 'aa-status-expired';
    default: return 'aa-status-unknown';
  }
}

function ConnectionCard({
  conn,
  onRevoke,
}: {
  conn: ConnectionInfo;
  onRevoke: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const detailsId = `aa-connection-details-${conn.connection_id}`;
  const agentLabel = conn.agent_label || 'Unknown Agent';

  return (
    <div
      className={`aa-connection-card ${statusBadge(conn.status)}`}
      role="listitem"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="aa-connection-header"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${agentLabel}, ${conn.status}, ${conn.scopes?.length || 0} scopes`}
      >
        <div className="aa-connection-info">
          <span className="aa-connection-agent">{agentLabel}</span>
          <span className={`aa-badge ${statusBadge(conn.status)}`}>{conn.status}</span>
        </div>
        <span className="aa-connection-meta">
          {conn.scopes?.length || 0} scope{(conn.scopes?.length || 0) !== 1 ? 's' : ''}
        </span>
        <span className="aa-chevron" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div id={detailsId} className="aa-connection-details">
          {/* Scopes */}
          <div className="aa-connection-scopes">
            <h4>Permissions</h4>
            <div className="aa-scope-tags" role="list" aria-label="Granted permissions">
              {(conn.scopes || []).map(s => (
                <span key={s} className="aa-scope-tag" role="listitem">{s}</span>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="aa-connection-meta-grid">
            <span>Connected: {formatDate(conn.created_at)}</span>
            {conn.last_used && <span>Last used: {formatDate(conn.last_used)}</span>}
            {conn.expires_at && <span>Expires: {formatDate(conn.expires_at)}</span>}
            <span className="aa-connection-id">ID: {conn.connection_id}</span>
          </div>

          {/* Revoke */}
          {conn.status === 'active' && (
            <div className="aa-connection-actions">
              {confirming ? (
                <div
                  className="aa-revoke-confirm"
                  role="alertdialog"
                  aria-live="assertive"
                  aria-label={`Confirm revoke access for ${agentLabel}`}
                >
                  <p>Revoke access? The agent will immediately lose access. Any in-progress tasks may fail.</p>
                  <div className="aa-revoke-buttons">
                    <button
                      onClick={() => { onRevoke(conn.connection_id); setConfirming(false); }}
                      className="aa-btn aa-btn-danger"
                      aria-label={`Confirm revoke access for ${agentLabel}`}
                    >
                      Revoke Access
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="aa-btn aa-btn-secondary"
                      aria-label="Cancel revoke"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="aa-btn aa-btn-danger-outline"
                  aria-label={`Revoke access for ${agentLabel}`}
                >
                  <span role="img" aria-label="Revoke">🗑</span> Revoke access
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConnectionsList({
  connections,
  loading = false,
  onRevoke,
  className = '',
}: ConnectionsListProps) {
  const [showAll, setShowAll] = useState(false);

  const activeConnections = connections.filter(c => c.status === 'active');
  const inactiveConnections = connections.filter(c => c.status !== 'active');
  const displayedInactive = showAll ? inactiveConnections : inactiveConnections.slice(0, 3);

  return (
    <div className={`aa-connections ${className}`}>
      <h3 className="aa-section-title">
        Active Connections ({activeConnections.length})
      </h3>

      {loading && <div className="aa-loading">Loading connections...</div>}

      {!loading && activeConnections.length === 0 && (
        <p className="aa-empty">No active agent connections. Generate a token above to connect your agent.</p>
      )}

      <div role="list" aria-label="Active connections">
        {activeConnections.map(conn => (
          <ConnectionCard key={conn.connection_id} conn={conn} onRevoke={onRevoke} />
        ))}
      </div>

      {inactiveConnections.length > 0 && (
        <div className="aa-inactive-section">
          <h4 className="aa-section-subtitle">Past Connections</h4>
          <div role="list" aria-label="Past connections">
            {displayedInactive.map(conn => (
              <ConnectionCard key={conn.connection_id} conn={conn} onRevoke={onRevoke} />
            ))}
          </div>
          {inactiveConnections.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="aa-btn aa-btn-text"
              aria-label={`Show ${inactiveConnections.length - 3} more past connections`}
            >
              Show {inactiveConnections.length - 3} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
