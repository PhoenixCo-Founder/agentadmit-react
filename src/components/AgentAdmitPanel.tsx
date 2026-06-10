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
import { AgentAdmitPanelProps } from '../types';
import { useAgentAdmit } from '../hooks/useAgentAdmit';
import { useThemeClass } from '../hooks/useThemeClass';
import { AapRootContext } from '../hooks/useStandaloneRoot';
import { ScopeSelector } from './ScopeSelector';
import { DurationPicker } from './DurationPicker';
import { TokenDisplay } from './TokenDisplay';
import { PromptTemplates } from './PromptTemplates';
import { ConnectionsList } from './ConnectionsList';

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
  const [showConnections, setShowConnections] = useState(false);
  const themeClass = useThemeClass(theme);

  const {
    connections,
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
    const token = await generateToken(selectedScopes, selectedDuration);
    if (token) {
      onTokenGenerated?.(token, selectedScopes);
    }
  }, [selectedScopes, selectedDuration, generateToken, onTokenGenerated]);

  const handleRevoke = useCallback(async (connectionId: string) => {
    const success = await revokeConnection(connectionId);
    if (success) {
      onConnectionRevoked?.(connectionId);
    }
  }, [revokeConnection, onConnectionRevoked]);

  const activeCount = connections.filter(c => c.status === 'active').length;

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
