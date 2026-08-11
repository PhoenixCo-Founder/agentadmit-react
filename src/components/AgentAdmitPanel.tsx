/**
 * AgentAdmitPanel — The complete AI Agent Access page.
 *
 * Drop this single component into your app to get the full experience:
 * scope selection, duration picker, token generation, templates, and connection management.
 *
 * Usage:
 *   <AgentAdmitPanel
 *     apiBase="/agentadmit"
 *     authToken={userJwt}
 *     userRole="user"
 *     scopeResources={myScopeResources}
 *     templates={myTemplates}
 *     editableFields={myFields}
 *   />
 */

import React, { useState, useCallback } from 'react';
import { AgentAdmitPanelProps, ConnectionInfo } from '../types';
import { useAgentAdmit, GenerateTokenOptions } from '../hooks/useAgentAdmit';
import { useThemeClass } from '../hooks/useThemeClass';
import { AapRootContext } from '../hooks/useStandaloneRoot';
import { ScopeSelector } from './ScopeSelector';
import { DurationPicker } from './DurationPicker';
import { TokenDisplay } from './TokenDisplay';
import { PromptTemplates } from './PromptTemplates';
import { ConnectionsList } from './ConnectionsList';

/**
 * One existing grant inside the review step: agent label, declared purpose,
 * user-declared intent, scope tags, and a two-step revoke. All fields are
 * review-time records, never enforcement inputs.
 */
function ReviewGrantCard({
  conn,
  onRevoke,
}: {
  conn: ConnectionInfo;
  onRevoke: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const agentLabel = conn.agent_label || 'Unknown Agent';

  return (
    <div className="aa-review-grant-card" role="listitem">
      <div className="aa-review-grant-info">
        <span className="aa-connection-agent">{agentLabel}</span>
        {conn.purpose && (
          <span className="aa-connection-purpose">Purpose: {conn.purpose}</span>
        )}
        {conn.user_intent && (
          <span className="aa-connection-intent">Your intent: {conn.user_intent}</span>
        )}
        <div
          className="aa-scope-tags"
          role="list"
          aria-label={`Permissions for ${agentLabel}`}
        >
          {(conn.scopes || []).map(s => (
            <span key={s} className="aa-scope-tag" role="listitem">{s}</span>
          ))}
        </div>
      </div>
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
          Revoke
        </button>
      )}
    </div>
  );
}

export function AgentAdmitPanel({
  apiBase,
  authToken,
  userRole = 'user',
  scopeResources,
  presetGroups = [],
  templateQuickPicks = [],
  templates = [],
  editableFields = {},
  exampleCategories = [],
  durationOptions,
  purposeInput,
  intentInput,
  existingGrantReview = true,
  appName,
  theme = 'system',
  className = '',
  headerTitle,
  generateButtonLabel,
  onTokenGenerated,
  onConnectionRevoked,
}: AgentAdmitPanelProps) {
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(3600); // 1 hour default
  const [purposeText, setPurposeText] = useState('');
  const [intentText, setIntentText] = useState('');
  const [showConnections, setShowConnections] = useState(false);
  // Whether the user has resolved the existing-grant review step (chose to
  // keep their existing grants and continue).
  const [reviewResolved, setReviewResolved] = useState(false);
  const themeClass = useThemeClass(theme);

  const {
    connections,
    connectionsLoaded,
    connectionToken,
    loading,
    error,
    generateToken,
    revokeConnection,
    refreshConnections,
    clearToken,
  } = useAgentAdmit({ apiBase, authToken });

  const handleGenerateToken = useCallback(async () => {
    if (selectedScopes.length === 0) return;
    const trimmedPurpose = purposeText.trim();
    const trimmedIntent = intentText.trim();
    const options: GenerateTokenOptions = {};
    if (trimmedPurpose) options.purpose = trimmedPurpose;
    if (trimmedIntent) options.user_intent = trimmedIntent;
    const token = await generateToken(
      selectedScopes,
      selectedDuration,
      Object.keys(options).length > 0 ? options : undefined,
    );
    if (token) {
      onTokenGenerated?.(token, selectedScopes);
    }
  }, [selectedScopes, selectedDuration, purposeText, intentText, generateToken, onTokenGenerated]);

  const handleRevoke = useCallback(async (connectionId: string) => {
    const success = await revokeConnection(connectionId);
    if (success) {
      onConnectionRevoked?.(connectionId);
    }
  }, [revokeConnection, onConnectionRevoked]);

  const activeConnections = connections.filter(c => c.status === 'active');
  const activeCount = activeConnections.length;

  // Existing-grant review step: blocks the generation form while the user
  // has active connections they have not yet reviewed. If the connections
  // listing fails, the hook leaves `connections` empty and this fails open
  // to the normal flow (a listing failure never blocks generation).
  const needsReview =
    existingGrantReview &&
    connectionsLoaded &&
    activeCount > 0 &&
    !reviewResolved &&
    !connectionToken;

  const resolvedHeaderTitle = headerTitle ?? '🛡️ AI Agent Access';
  const resolvedGenerateLabel = generateButtonLabel
    ? generateButtonLabel(selectedScopes.length)
    : `🔑 Generate Token (${selectedScopes.length} permissions)`;

  return (
    <AapRootContext.Provider value={true}>
    <div
      role="region"
      aria-label="AI Agent Access"
      className={`agent-admit-panel aa-panel ${themeClass} ${className}`.trim()}
    >
      {/* Header */}
      <div className="aa-panel-header">
        <div>
          <h2 className="aa-panel-title">{resolvedHeaderTitle}</h2>
          <p className="aa-panel-subtitle">
            Connect your personal AI agent to {appName || 'this app'} with scoped, secure access.
          </p>
        </div>
        <button
          onClick={() => setShowConnections(!showConnections)}
          className="aa-connections-toggle"
          aria-expanded={showConnections}
          aria-controls="aa-connections-panel"
          aria-label={activeCount > 0 ? `${activeCount} active connections` : 'No active connections'}
        >
          {activeCount > 0 ? `🟢 ${activeCount} active` : '⭕ No connections'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="aa-error-banner"
          role="alert"
          aria-live="polite"
        >
          <span role="img" aria-label="warning">⚠️</span> {error}
        </div>
      )}

      {/* Connections panel (toggleable) */}
      {showConnections && (
        <div id="aa-connections-panel">
          <ConnectionsList
            connections={connections}
            loading={loading}
            onRevoke={handleRevoke}
          />
        </div>
      )}

      {/* Step 0: Existing-grant review — shown before the generation form
          when the user already has active connections. The user either
          revokes grants they no longer want or keeps them and continues. */}
      {needsReview && (
        <div
          className="aa-review-step"
          role="region"
          aria-label="Review existing agent access"
        >
          <h3 className="aa-section-title">Review your existing agent access</h3>
          <p className="aa-review-intro">
            You already have {activeCount} active agent connection{activeCount !== 1 ? 's' : ''}.
            Review {activeCount !== 1 ? 'them' : 'it'} before creating a new token:
            revoke any you no longer want, or keep everything and continue.
          </p>
          <div role="list" aria-label="Existing grants">
            {activeConnections.map(conn => (
              <ReviewGrantCard
                key={conn.connection_id}
                conn={conn}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
          <div className="aa-review-actions">
            <button
              onClick={() => setReviewResolved(true)}
              className="aa-btn aa-btn-primary aa-btn-large"
            >
              Keep existing and continue
            </button>
          </div>
        </div>
      )}

      {/* Generation form — hidden while the review step is pending */}
      {!needsReview && (
        <>
      {/* Step 1: Select Scopes */}
      <ScopeSelector
        scopeResources={scopeResources}
        presetGroups={presetGroups}
        templateQuickPicks={templateQuickPicks}
        userRole={userRole}
        selectedScopes={selectedScopes}
        onScopesChange={setSelectedScopes}
      />

      {/* Step 2: Choose Duration */}
      {selectedScopes.length > 0 && (
        <DurationPicker
          options={durationOptions}
          selectedSeconds={selectedDuration}
          onDurationChange={setSelectedDuration}
        />
      )}

      {/* Step 2b: Declared purpose (optional input, off by default) */}
      {purposeInput && selectedScopes.length > 0 && (
        <div className="aa-purpose-section">
          <label className="aa-purpose-label" htmlFor="aa-purpose-input">
            {(typeof purposeInput === 'object' && purposeInput.label) ||
              'What will this agent do? (optional)'}
          </label>
          <input
            id="aa-purpose-input"
            className="aa-input"
            type="text"
            maxLength={300}
            value={purposeText}
            onChange={(e) => setPurposeText(e.target.value)}
            placeholder={
              (typeof purposeInput === 'object' && purposeInput.placeholder) ||
              'e.g. Weekly workout summaries for my coach'
            }
          />
        </div>
      )}

      {/* Step 2c: User-declared intent (optional input, off by default).
          Distinct from declared purpose: purpose is the app's declared
          reason, user intent is the user's own words. Review-time record,
          never an enforcement input. */}
      {intentInput && selectedScopes.length > 0 && (
        <div className="aa-intent-section">
          <label className="aa-intent-label" htmlFor="aa-intent-input">
            {(typeof intentInput === 'object' && intentInput.label) ||
              'What do you want this agent to do? (optional)'}
          </label>
          <input
            id="aa-intent-input"
            className="aa-input"
            type="text"
            maxLength={300}
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            placeholder={
              (typeof intentInput === 'object' && intentInput.placeholder) ||
              'In your own words, e.g. Keep my training log up to date'
            }
          />
        </div>
      )}

      {/* Step 3: Generate Token */}
      {selectedScopes.length > 0 && !connectionToken && (
        <div className="aa-generate-section">
          <button
            onClick={handleGenerateToken}
            disabled={loading || selectedScopes.length === 0}
            className="aa-btn aa-btn-primary aa-btn-large"
            aria-label={loading ? 'Generating token' : `Generate token with ${selectedScopes.length} permissions`}
          >
            {loading ? 'Generating...' : resolvedGenerateLabel}
          </button>
        </div>
      )}
        </>
      )}

      {/* Step 4: Show Token + Templates */}
      {connectionToken && (
        <>
          <TokenDisplay
            token={connectionToken}
            loading={loading}
          />

          <PromptTemplates
            templates={templates}
            editableFields={editableFields}
            exampleCategories={exampleCategories}
            selectedScopes={selectedScopes}
            userRole={userRole}
            token={connectionToken}
          />

          <div className="aa-new-token-section">
            <button
              onClick={() => {
                clearToken();
                setSelectedScopes([]);
              }}
              className="aa-btn aa-btn-secondary"
            >
              Generate New Token
            </button>
          </div>
        </>
      )}
    </div>
    </AapRootContext.Provider>
  );
}
