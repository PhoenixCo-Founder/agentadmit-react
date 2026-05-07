/**
 * AgentAdmitPanel — The complete AgentAdmit page.
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
  showGuide = true,
  onTokenGenerated,
  onConnectionRevoked,
}: AgentAdmitPanelProps) {
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(3600); // 1 hour default
  const [showConnections, setShowConnections] = useState(false);

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

  return (
    <div className={`aa-panel ${theme === 'dark' ? 'aa-dark' : theme === 'light' ? 'aa-light' : ''} ${className}`}>
      {/* Header */}
      <div className="aa-panel-header">
        <div>
          <h2 className="aa-panel-title">🛡️ AgentAdmit</h2>
          <p className="aa-panel-subtitle">
            Connect your personal AI agent to {appName || 'this app'} with scoped, secure access.
          </p>
        </div>
        <button
          onClick={() => setShowConnections(!showConnections)}
          className="aa-connections-toggle"
        >
          {activeCount > 0 ? `🟢 ${activeCount} active` : '⭕ No connections'}
        </button>
      </div>

      {/* How It Works guide */}
      {showGuide && (
        <div className="aa-guide">
          <h3 className="aa-guide-title">How It Works</h3>
          <div className="aa-guide-steps">
            <div className="aa-guide-step">
              <span className="aa-guide-step-number aa-step-1">1</span>
              <div>
                <p className="aa-guide-step-title">Select & generate</p>
                <p className="aa-guide-step-desc">Pick what your agent can do, then generate a one-time token.</p>
              </div>
            </div>
            <div className="aa-guide-step">
              <span className="aa-guide-step-number aa-step-2">2</span>
              <div>
                <p className="aa-guide-step-title">Personalize a template</p>
                <p className="aa-guide-step-desc">Choose a template that matches your permissions. Personalize it with what you want your agent to do.</p>
              </div>
            </div>
            <div className="aa-guide-step">
              <span className="aa-guide-step-number aa-step-3">3</span>
              <div>
                <p className="aa-guide-step-title">Send token + template together</p>
                <p className="aa-guide-step-desc">Copy the template and your token, and send them to your AI agent in one message. Your agent connects and gets to work.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="aa-error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Connections panel (toggleable) */}
      {showConnections && (
        <ConnectionsList
          connections={connections}
          loading={loading}
          onRevoke={handleRevoke}
        />
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
          >
            {loading ? 'Generating...' : `🔑 Generate Token (${selectedScopes.length} permissions)`}
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
  );
}
