/**
 * @agentadmit/react — Drop-in React components for AgentAdmit.
 *
 * ARCHITECTURE NOTE: AgentAdmit uses MANDATORY hosted introspection.
 * All token validation goes through api.agentadmit.com on the backend.
 * There is no self-hosted mode. No local JWT validation. No bypass.
 * This React SDK handles the frontend UI only. Token validation is
 * handled by the backend SDK (Python/Node/Java/PHP/Ruby) which
 * communicates with AgentAdmit's hosted service automatically.
 */

// Main panel (the full page)
export { AgentAdmitPanel } from './components/AgentAdmitPanel';

// Individual components (for custom layouts)
export { ScopeSelector } from './components/ScopeSelector';
export { DurationPicker } from './components/DurationPicker';
export { TokenDisplay } from './components/TokenDisplay';
export { PromptTemplates } from './components/PromptTemplates';
export { ConnectionsList } from './components/ConnectionsList';

// Hook
export { useAgentAdmit } from './hooks/useAgentAdmit';

// Types
export type {
  AgentAdmitPanelProps,
  ScopeSelectorProps,
  DurationPickerProps,
  TokenDisplayProps,
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
  AdminUsage,
  AdminUsageTier,
  AdminUsageBreakdown,
  AdminActivityEvent,
  AdminConnectionsResponse,
  AdminUsageResponse,
  AdminActivityResponse,
} from './types';
