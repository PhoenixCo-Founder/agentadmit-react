/**
 * AlertsPanel — View alert history and configure alert thresholds.
 *
 * Usage:
 *   import { AlertsPanel } from '@agentadmit/react';
 *
 *   <AlertsPanel
 *     apiBase="/agentadmit"
 *     authToken={userJwt}
 *     appId="app_abc123"
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import { AapRootContext, useStandaloneRoot } from '../hooks/useStandaloneRoot';
import {
  useAlerts,
  ALERT_TYPES,
  ALERT_TYPE_LABELS,
  ALERT_TYPE_DESCRIPTIONS,
  AlertType,
  AlertConfig,
} from '../hooks/useAlerts';

export interface AlertsPanelProps {
  /** Base URL for AgentAdmit API calls (e.g. "/agentadmit") */
  apiBase: string;
  /** User authorization token */
  authToken: string;
  /** AgentAdmit application ID */
  appId: string;
  /** Optional: pre-filter to a specific connection */
  connectionId?: string;
  /** Theme: 'light' | 'dark' | 'system' */
  theme?: 'light' | 'dark' | 'system';
  /** CSS class name for the root container */
  className?: string;
}

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

function AlertTypeBadge({ type }: { type: string }) {
  return (
    <span
      className="aa-alert-type-badge"
      title={ALERT_TYPE_DESCRIPTIONS[type as AlertType] ?? type}
    >
      {ALERT_TYPE_LABELS[type as AlertType] ?? type}
    </span>
  );
}

function ConfigRow({
  alertType,
  currentConfig,
  onSave,
  saving,
}: {
  alertType: AlertType;
  currentConfig?: AlertConfig;
  onSave: (config: AlertConfig) => void;
  saving: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean>(currentConfig?.enabled ?? true);
  const [threshold, setThreshold] = useState<string>(
    currentConfig?.threshold_value?.toString() ?? '',
  );
  const [windowMin, setWindowMin] = useState<string>(
    currentConfig?.threshold_window_minutes?.toString() ?? '',
  );
  const [killSwitch, setKillSwitch] = useState<boolean>(
    currentConfig?.kill_switch_enabled ?? false,
  );
  const [expanded, setExpanded] = useState(false);
  const formId = `aa-alert-config-form-${alertType}`;

  function handleSave() {
    const config: AlertConfig = { enabled };
    if (threshold) config.threshold_value = parseFloat(threshold);
    if (windowMin) config.threshold_window_minutes = parseInt(windowMin, 10);
    if (killSwitch !== undefined) config.kill_switch_enabled = killSwitch;
    onSave(config);
  }

  return (
    <div className="aa-alert-config-row">
      <button
        onClick={() => setExpanded(!expanded)}
        className="aa-alert-config-header"
        aria-expanded={expanded}
        aria-controls={formId}
      >
        <span className="aa-alert-config-type">
          <AlertTypeBadge type={alertType} />
        </span>
        <span className="aa-alert-config-desc">
          {ALERT_TYPE_DESCRIPTIONS[alertType]}
        </span>
        <span className={`aa-alert-toggle ${enabled ? 'aa-enabled' : 'aa-disabled'}`}>
          {enabled ? '● On' : '○ Off'}
        </span>
        <span className="aa-chevron" aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div id={formId} className="aa-alert-config-form">
          <label className="aa-alert-form-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            {' '}Enabled
          </label>

          <div className="aa-alert-form-row">
            <label className="aa-alert-form-label">
              Threshold
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder="e.g. 100"
                className="aa-alert-input"
              />
            </label>
            <label className="aa-alert-form-label">
              Window (min)
              <input
                type="number"
                value={windowMin}
                onChange={e => setWindowMin(e.target.value)}
                placeholder="e.g. 5"
                className="aa-alert-input"
              />
            </label>
          </div>

          <label className="aa-alert-form-label">
            <input
              type="checkbox"
              checked={killSwitch}
              onChange={e => setKillSwitch(e.target.checked)}
            />
            {' '}Kill Switch (auto-revoke on breach)
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="aa-btn aa-btn-primary"
          >
            {saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      )}
    </div>
  );
}

export function AlertsPanel({
  apiBase,
  authToken,
  appId,
  connectionId,
  theme = 'system',
  className = '',
}: AlertsPanelProps) {
  const {
    alertsConfig,
    alertEvents,
    totalEvents,
    loading,
    error,
    fetchAlertsConfig,
    fetchAlertEvents,
    configureAlert,
    clearError,
  } = useAlerts({ apiBase, authToken, appId });

  const [activeTab, setActiveTab] = useState<'config' | 'events'>('events');
  const [selectedType, setSelectedType] = useState<string>('');
  const [savingType, setSavingType] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const TABS = ['events', 'config'] as const;

  // Tabs keyboard pattern: arrow keys move focus + selection, roving tabindex
  function handleTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setActiveTab(TABS[next]);
      tabRefs.current[next]?.focus();
    }
  }

  useEffect(() => {
    fetchAlertsConfig(connectionId);
    fetchAlertEvents(selectedType || undefined);
  }, [appId, connectionId]);

  async function handleSaveConfig(alertType: AlertType, config: AlertConfig) {
    setSavingType(alertType);
    await configureAlert(alertType, config);
    setSavingType(null);
  }

  async function handleFilterChange(type: string) {
    setSelectedType(type);
    await fetchAlertEvents(type || undefined);
  }

  // Standalone: styled root with theme class. Nested (e.g. inside
  // AgentAdmitAdminPanel): no repeated root class — tokens inherit.
  const rootClass = useStandaloneRoot(theme);

  return (
    <AapRootContext.Provider value={true}>
    <div className={`${rootClass} aa-alerts-panel ${className}`.trim()}>
      <div className="aa-alerts-header">
        <h2 className="aa-alerts-title">🔔 Security Alerts</h2>
        <p className="aa-alerts-subtitle">
          Monitor suspicious agent activity and configure automatic responses.
        </p>
      </div>

      {error && (
        <div className="aa-alert-error" role="alert">
          {error}
          <button onClick={clearError} className="aa-error-close" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="aa-alerts-tabs" role="tablist" aria-label="Alerts sections">
        <button
          ref={el => { tabRefs.current[0] = el; }}
          role="tab"
          id="aa-alerts-tab-events"
          aria-selected={activeTab === 'events'}
          aria-controls="aa-alerts-tabpanel-events"
          tabIndex={activeTab === 'events' ? 0 : -1}
          onKeyDown={e => handleTabKeyDown(e, 0)}
          className={`aa-tab ${activeTab === 'events' ? 'aa-tab-active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Alert History {totalEvents > 0 && <span className="aa-badge-count">{totalEvents}</span>}
        </button>
        <button
          ref={el => { tabRefs.current[1] = el; }}
          role="tab"
          id="aa-alerts-tab-config"
          aria-selected={activeTab === 'config'}
          aria-controls="aa-alerts-tabpanel-config"
          tabIndex={activeTab === 'config' ? 0 : -1}
          onKeyDown={e => handleTabKeyDown(e, 1)}
          className={`aa-tab ${activeTab === 'config' ? 'aa-tab-active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div
          id="aa-alerts-tabpanel-events"
          role="tabpanel"
          aria-labelledby="aa-alerts-tab-events"
          className="aa-alerts-events"
        >
          <div className="aa-events-filter">
            <select
              value={selectedType}
              onChange={e => handleFilterChange(e.target.value)}
              className="aa-select"
            >
              <option value="">All alert types</option>
              {ALERT_TYPES.map(t => (
                <option key={t} value={t}>{ALERT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <button
              onClick={() => fetchAlertEvents(selectedType || undefined)}
              className="aa-btn aa-btn-secondary"
              disabled={loading}
            >
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>

          {loading && <div className="aa-loading">Loading alerts…</div>}

          {!loading && alertEvents.length === 0 && (
            <p className="aa-empty">No alert events found. 🎉</p>
          )}

          <div className="aa-events-list">
            {alertEvents.map((event, i) => (
              <div key={event.id ?? i} className="aa-event-card">
                <div className="aa-event-header">
                  <AlertTypeBadge type={event.alert_type} />
                  <span className="aa-event-time">{formatDate(event.triggered_at)}</span>
                </div>
                {event.connection_id && (
                  <div className="aa-event-conn">Connection: {event.connection_id}</div>
                )}
                {event.details && Object.keys(event.details).length > 0 && (
                  <details className="aa-event-details">
                    <summary>Details</summary>
                    <pre className="aa-event-json">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {totalEvents > alertEvents.length && (
            <p className="aa-events-more">
              Showing {alertEvents.length} of {totalEvents} events.
            </p>
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div
          id="aa-alerts-tabpanel-config"
          role="tabpanel"
          aria-labelledby="aa-alerts-tab-config"
          className="aa-alerts-config"
        >
          <p className="aa-config-hint">
            Configure thresholds for each alert type. Enable Kill Switch to automatically
            revoke the connection when a threshold is breached.
          </p>
          {ALERT_TYPES.map(alertType => (
            <ConfigRow
              key={alertType}
              alertType={alertType}
              currentConfig={alertsConfig?.app_level?.[alertType] as AlertConfig | undefined}
              onSave={config => handleSaveConfig(alertType, config)}
              saving={savingType === alertType}
            />
          ))}
        </div>
      )}
    </div>
    </AapRootContext.Provider>
  );
}
