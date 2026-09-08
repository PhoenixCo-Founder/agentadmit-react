/**
 * @agentadmit/react — Drop-in React components for AgentAdmit.
 *
 * DEFAULT STYLES:
 * The SDK ships a default stylesheet. Import it once in your app:
 *
 *   import '@agentadmit/react/styles';
 *   // or
 *   import '@agentadmit/react/dist/styles/agent-admit-panel.css';
 *
 * All styling is driven by CSS custom properties (--aap-*) on .agent-admit-panel.
 * Override tokens after the import to customize colors, spacing, and shape:
 *
 *   .agent-admit-panel {
 *     --aap-color-primary: #7c3aed;
 *     --aap-border-radius: 12px;
 *   }
 *
 * ARCHITECTURE NOTE: AgentAdmit uses MANDATORY hosted introspection.
 * All token validation goes through api.agentadmit.com on the backend.
 * There is no self-hosted mode. No local JWT validation. No bypass.
 * This React SDK handles the frontend UI only. Token validation is
 * handled by the backend SDK (Python/Node/Java/PHP/Ruby) which
 * communicates with AgentAdmit's hosted service automatically.
 */

// DEPRECATED in-app consent flow. The consent step runs on the AgentAdmit hosted
// consent page opened on your app's behalf (POST /api/v1/apps/{app_id}/consent-sessions).
// These exports keep working for existing integrations and are removed in 2.0.
/** @deprecated Not a supported integration path. Use the hosted consent page (consent sessions). Removed in 2.0. */
export { AgentAdmitPanel } from './components/AgentAdmitPanel';

/** @deprecated Part of the in-app consent flow. Scope selection happens on the hosted consent page. Removed in 2.0. */
export { ScopeSelector } from './components/ScopeSelector';
/** @deprecated Part of the in-app consent flow. Duration selection happens on the hosted consent page. Removed in 2.0. */
export { DurationPicker } from './components/DurationPicker';
/** @deprecated Part of the in-app consent flow. The token is shown to the user on the hosted consent page. Removed in 2.0. */
export { TokenDisplay } from './components/TokenDisplay';
export { PresenceChallenge } from './components/PresenceChallenge';

// Companion components (supported): use these on your own pages around the hosted consent step.
export { PromptTemplates } from './components/PromptTemplates';
export { ConnectionsList } from './components/ConnectionsList';

// Hook
export { useAgentAdmit } from './hooks/useAgentAdmit';
export type { GenerateTokenOptions } from './hooks/useAgentAdmit';

// Types
export type {
  AgentAdmitPanelProps,
  ScopeSelectorProps,
  DurationPickerProps,
  TokenDisplayProps,
  PresenceChallengeProps,
  TemplatesProps,
  ConnectionsListProps,
  ScopeDefinition,
  DurationOption,
  ScopeResource,
  ScopePill,
  PresetGroup,
  TemplateQuickPick,
  PromptTemplate,
  EditableField,
  ExampleCategory,
  ConnectionInfo,
} from './types';

// Alerts
export { AlertsPanel } from './components/AlertsPanel';
export type { AlertsPanelProps } from './components/AlertsPanel';
export { useAlerts, ALERT_TYPES, ALERT_TYPE_LABELS, ALERT_TYPE_DESCRIPTIONS } from './hooks/useAlerts';
export type { AlertType, AlertConfig, AlertEvent, AlertsConfigResponse, AlertEventsResponse } from './hooks/useAlerts';

// Admin Panel (app owner dashboard)
export { AgentAdmitAdminPanel } from './components/AgentAdmitAdminPanel';
export { useAdminData } from './hooks/useAdminData';
export type { UseAdminDataOptions, UseAdminDataReturn } from './hooks/useAdminData';
export type {
  AgentAdmitAdminPanelProps,
  AdminTab,
  AdminConnection,
  AdminConnectionEvidence,
  AdminUsage,
  AdminUsageTier,
  AdminUsageBreakdown,
  AdminActivityEvent,
  AdminConnectionsResponse,
  AdminUsageResponse,
  AdminActivityResponse,
} from './types';

export { ConsentSettingsPanel } from './components/ConsentSettingsPanel';
export type { ConsentSettingsPanelProps, ConsentClassCopy } from './components/ConsentSettingsPanel';
export { useConsentSettings, CONSENT_CALLER_CLASSES } from './hooks/useConsentSettings';
export type {
  ConsentCallerClass,
  ConsentEffectiveEntry,
  ConsentEffectiveMap,
  ConsentPresenceConfig,
  UseConsentSettingsOptions,
  UseConsentSettingsReturn,
} from './hooks/useConsentSettings';

export { RelationshipConsentPanel } from './components/RelationshipConsentPanel';
export type { RelationshipConsentPanelProps } from './components/RelationshipConsentPanel';
export { useRelationshipConsentSettings } from './hooks/useRelationshipConsentSettings';
export type {
  UseRelationshipConsentSettingsOptions,
  UseRelationshipConsentSettingsReturn,
} from './hooks/useRelationshipConsentSettings';

// Presence ceremony helper (reused by PresenceChallenge + ConsentSettingsPanel;
// exported so apps can run the same ceremony for their own gated actions,
// e.g. token minting).
export {
  runPresenceCeremony,
  browserSupportsPresence,
  PresenceCeremonyError,
} from './lib/presenceCeremony';
export type {
  PresenceCeremonyConfig,
  PresenceCeremonyResult,
} from './lib/presenceCeremony';
