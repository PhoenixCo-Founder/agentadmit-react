/**
 * @agentadmit/react — Type definitions
 */

/**
 * Rate limit information returned when a request receives HTTP 429.
 * Surfaced via the `rateLimitInfo` state in useAgentAdmit.
 */
export interface RateLimitInfo {
  /** Seconds to wait before retrying (from Retry-After header), or null. */
  retryAfter: number | null;
  /** Total request limit for the window (X-RateLimit-Limit), or null. */
  limit: number | null;
  /** Requests remaining in the current window (X-RateLimit-Remaining), or null. */
  remaining: number | null;
  /** Unix timestamp when the rate limit window resets (X-RateLimit-Reset), or null. */
  reset: number | null;
}

export interface ScopeDefinition {
  name: string;
  description: string;
  category?: string;
  role?: string;
}

export interface DurationOption {
  label: string;
  seconds: number | null;
}

export interface ScopeResource {
  group: string;
  resource: string;
  pills: ScopePill[];
}

export interface ScopePill {
  label: string;
  scope: string;
  kind: 'read' | 'write' | 'create' | 'manage';
}

export interface PresetGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
  color?: string;
  visibleTo?: string[];
}

export interface TemplateQuickPick {
  id: string;
  icon: string;
  label: string;
  scopes: string[];
  visibleTo?: string[];
}

export interface PromptTemplate {
  id: string;
  title: string;
  subtitle?: string;
  requiredScopes: string[];
  editableFields?: string[];
  role?: string;
  isHero?: boolean;
  template: string;
}

export interface EditableField {
  key: string;
  label: string;
  default: string;
  placeholder?: string;
}

export interface ExampleCategory {
  id: string;
  title: string;
  scopes: string[];
  examples: string[];
}

export interface ConnectionInfo {
  connection_id: string;
  scopes: string[];
  role?: string;
  agent_label?: string;
  agent_id?: string;
  status: string;
  created_at?: string;
  last_used?: string;
  expires_at?: string;
  duration_seconds?: number;
}

export interface AgentAdmitPanelProps {
  /** Base URL for AgentAdmit API calls (e.g., "/agentadmit" or "https://api.agentadmit.com/v1/apps/app_123") */
  apiBase: string;
  /** Authorization token for authenticated requests (user's JWT) */
  authToken: string;
  /** User's role in the app (determines which scopes/templates are visible) */
  userRole?: string;
  /** Scope resources organized by group with read/write pills */
  scopeResources: ScopeResource[];
  /** Preset groups for one-click scope selection */
  presetGroups?: PresetGroup[];
  /** Template quick-picks for auto-selecting scopes by use case */
  templateQuickPicks?: TemplateQuickPick[];
  /** Prompt templates (scope-filtered, role-aware, with editable fields) */
  templates?: PromptTemplate[];
  /** Editable field definitions for templates */
  editableFields?: Record<string, EditableField>;
  /** Example prompts organized by category (scope-filtered) */
  exampleCategories?: ExampleCategory[];
  /** Duration options (defaults provided if not specified) */
  durationOptions?: DurationOption[];
  /** App name for display */
  appName?: string;
  /** Theme: 'light' | 'dark' | 'system' */
  theme?: 'light' | 'dark' | 'system';
  /** CSS class name for the root container */
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
  /** Show the "How It Works" guide at the top (default: true) */
  showGuide?: boolean;
  /** Callback when a token is generated */
  onTokenGenerated?: (token: string, scopes: string[]) => void;
  /** Callback when a connection is revoked */
  onConnectionRevoked?: (connectionId: string) => void;
}

export interface ScopeSelectorProps {
  scopeResources: ScopeResource[];
  presetGroups?: PresetGroup[];
  templateQuickPicks?: TemplateQuickPick[];
  userRole?: string;
  selectedScopes: string[];
  onScopesChange: (scopes: string[]) => void;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
}

export interface DurationPickerProps {
  options?: DurationOption[];
  selectedSeconds: number | null;
  onDurationChange: (seconds: number | null) => void;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
}

export interface TokenDisplayProps {
  token: string | null;
  loading?: boolean;
  onCopy?: () => void;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
}

export interface TemplatesProps {
  templates: PromptTemplate[];
  editableFields?: Record<string, EditableField>;
  exampleCategories?: ExampleCategory[];
  selectedScopes: string[];
  userRole?: string;
  token?: string;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
}

export interface ConnectionsListProps {
  connections: ConnectionInfo[];
  loading?: boolean;
  onRevoke: (connectionId: string) => void;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  /** Override the panel header title (default: "🛡️ AI Agent Access") */
  headerTitle?: string;
  /** Override the generate-token button label (receives the selected scope count) */
  generateButtonLabel?: (scopeCount: number) => string;
}
