/**
 * @agentadmit/react — Companion React components for apps that integrate AgentAdmit.
 *
 * WHERE THE CONSENT STEP RUNS: on the AgentAdmit hosted consent page, opened on
 * your app's behalf. Your backend creates a consent session
 * (POST /api/v1/apps/{app_id}/consent-sessions) and this package's
 * ConnectAgentButton / useConsentSession send the signed-in user there. Scope
 * selection, duration, intent, existing-grant review, the presence ceremony,
 * and the one-time token all happen on the hosted page. This package ships no
 * consent UI and no WebAuthn ceremony for the grant.
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
 * This React SDK handles companion frontend UI only. Token validation is
 * handled by the backend SDK (Python/Node/Java/PHP/Ruby/Go) which
 * communicates with AgentAdmit's hosted service automatically.
 */

// Starting the hosted consent page
export { ConnectAgentButton } from './components/ConnectAgentButton';
export type { ConnectAgentButtonProps } from './components/ConnectAgentButton';
export { useConsentSession, isAcceptableSessionUrl } from './hooks/useConsentSession';
export type { UseConsentSessionOptions, UseConsentSessionReturn } from './hooks/useConsentSession';

// Companion components: the pages around the hosted consent step
export { ConnectionsList } from './components/ConnectionsList';
export { PromptTemplates } from './components/PromptTemplates';

// Hook: list + revoke the signed-in user's connections through your proxy
export { useAgentAdmit } from './hooks/useAgentAdmit';

// Types
export type {
  TemplatesProps,
  ConnectionsListProps,
  PromptTemplate,
  EditableField,
  ExampleCategory,
  ConnectionInfo,
  RateLimitInfo,
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

// Presence step-up error type (thrown to consumers of the consent settings
// hooks when the user cancels or the authenticator fails). The ceremony
// runner itself is internal: the agent grant's ceremony runs on the hosted page.
export { PresenceCeremonyError } from './lib/presenceCeremony';
