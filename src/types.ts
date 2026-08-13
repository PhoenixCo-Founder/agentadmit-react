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
  /**
   * Declared purpose: the user-facing reason recorded on the grant at the
   * consent moment. Review-time record only, never an enforcement input.
   */
  purpose?: string | null;
  /**
   * User-declared intent: the user's own words about what they want the
   * agent to do, recorded on the grant at the consent moment. Distinct from
   * `purpose` (the app's declared reason). Review-time record, never an
   * enforcement input.
   */
  user_intent?: string | null;
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
  /** Callback when a token is generated */
  /**
   * Show an optional declared-purpose text input in the token-generation
   * flow. Declared purpose: the user-facing reason recorded on the grant at
   * the consent moment. Review-time record only, never an enforcement input.
   * Pass `true` for default copy, or an object to customize it.
   */
  purposeInput?: boolean | { label?: string; placeholder?: string };
  /**
   * Show an optional user-declared-intent text input in the token-generation
   * flow. User-declared intent: the user's own words about what they want
   * the agent to do, recorded on the grant at the consent moment. Distinct
   * from `purposeInput` (the app's declared reason); both can be enabled.
   * Review-time record, never an enforcement input. Pass `true` for default
   * copy, or an object to customize it. Default: off.
   */
  intentInput?: boolean | { label?: string; placeholder?: string };
  /**
   * Show a blocking review step before the generation form when the user
   * already has active connections: each existing grant with its purpose,
   * user-declared intent, and scopes, plus per-grant revoke and a
   * "Keep existing and continue" action. Fails open to the normal flow if
   * the connections listing is unavailable. Default: true (set to `false`
   * to opt out).
   */
  existingGrantReview?: boolean;
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

// ── Admin Panel Types ───────────────────────────────────────────────────────

/** A single agent connection as seen by the app owner (includes user context). */
export interface AdminConnection {
  connection_id: string;
  /** User who authorized this connection (opaque identifier from your app). */
  user_id?: string;
  /** Display-friendly user identifier (email, username, etc.) if provided. */
  user_label?: string;
  agent_id?: string;
  agent_label?: string;
  /**
   * Declared purpose: the user-facing reason recorded on the grant at the
   * consent moment. Review-time record only, never an enforcement input.
   */
  purpose?: string | null;
  /**
   * User-declared intent: the user's own words about what they want the
   * agent to do, recorded on the grant at the consent moment. Distinct from
   * `purpose` (the app's declared reason). Review-time record, never an
   * enforcement input.
   */
  user_intent?: string | null;
  scopes: string[];
  role?: string;
  status: 'active' | 'revoked' | 'expired';
  created_at?: string;
  last_used?: string;
  expires_at?: string;
  duration_seconds?: number;
}

/**
 * Consent-evidence answer for one connection — the owner-implemented
 * contract behind GET {apiBase}/admin/connections/{connection_id}/evidence,
 * mirroring the user-facing evidence route: the hosted service's answer for
 * ceremonies it witnessed, merged with the app's own ceremony record.
 *
 * Claim ceilings (non-negotiable copy): evidence is a "verifiable record of
 * the authorization ceremony", never "proof the user saw" anything; an app
 * record or app-attested fact is real but NOT independently verifiable.
 * Evidence is a review-time record, never an enforcement input.
 */
export interface AdminConnectionEvidence {
  connection_id?: string;
  /**
   * Which evidence leads the display: 'hosted_vce' (independently
   * verifiable ceremony record), 'app_record' (the app's own ceremony
   * record), 'presence_fact' (hosted presence fact, including app-attested
   * forwarding), or 'none'. Unknown future tiers render with their honest
   * hosted claim text.
   */
  display_tier: 'hosted_vce' | 'app_record' | 'presence_fact' | 'none' | string;
  /** The hosted evidence endpoint's answer (null/absent when unavailable). */
  hosted?: {
    evidence_available?: boolean;
    tier?: string;
    reason?: string;
    claim?: string;
    ceremony?: {
      verified_at?: string | null;
      uv?: boolean | null;
      method?: string | null;
      /** 'hosted_witnessed' | 'app_attested' */
      provenance?: string;
    } | null;
    commitment?: { hash?: string; preimage_version?: number } | null;
    ledger?: { tamper_evident?: boolean; granted_event_present?: boolean } | null;
  } | null;
  /** The app's own ceremony record (absent/present:false when none exists). */
  app_record?: {
    present: boolean;
    uv?: boolean | null;
    verified_at?: string | null;
    claim?: string;
  } | null;
}

/** Tier usage snapshot for the app. */
export interface AdminUsageTier {
  name: string;
  /** Maximum API calls allowed per billing period (null = unlimited). */
  call_limit: number | null;
  /** API calls used in the current billing period. */
  calls_used: number;
  /** API calls remaining (null if unlimited). */
  calls_remaining: number | null;
  /** Billing period start (ISO 8601). */
  period_start?: string;
  /** Billing period end (ISO 8601). */
  period_end?: string;
  /** Overage calls beyond the tier limit. */
  overage_calls?: number;
  /** Whether overage billing is enabled. */
  overage_enabled?: boolean;
}

/** App-level usage statistics returned by the admin usage endpoint. */
export interface AdminUsage {
  app_id: string;
  tier: AdminUsageTier;
  /** Total active connections right now. */
  active_connections: number;
  /** Total connections ever created. */
  total_connections: number;
  /** Optional per-scope or per-endpoint breakdown. */
  breakdown?: AdminUsageBreakdown[];
}

export interface AdminUsageBreakdown {
  label: string;
  calls: number;
  percentage?: number;
}

/** A single entry in the agent activity / audit log. */
export interface AdminActivityEvent {
  event_id?: string;
  connection_id?: string;
  user_id?: string;
  user_label?: string;
  agent_id?: string;
  agent_label?: string;
  /** Scope or resource that was accessed (e.g. "calendar:read"). */
  scope?: string;
  /**
   * Declared purpose recorded on the grant this event belongs to. The
   * user-facing reason recorded at the consent moment. Review-time record
   * only, never an enforcement input.
   */
  purpose?: string | null;
  /**
   * User-declared intent recorded on the grant this event belongs to: the
   * user's own words about what they want the agent to do. Distinct from
   * `purpose` (the app's declared reason). Review-time record, never an
   * enforcement input.
   */
  user_intent?: string | null;
  /** HTTP method or action (e.g. "GET", "POST", "REVOKE"). */
  action?: string;
  /** Endpoint or resource path accessed. */
  endpoint?: string;
  /** HTTP status code returned. */
  status_code?: number;
  /** When the action occurred (ISO 8601). */
  occurred_at: string;
  /** Extra structured details. */
  details?: Record<string, unknown>;
}

// API response wrappers
export interface AdminConnectionsResponse {
  connections: AdminConnection[];
  total: number;
}

export interface AdminUsageResponse {
  usage: AdminUsage;
}

export interface AdminActivityResponse {
  events: AdminActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

export type AdminTab = 'connections' | 'usage' | 'alerts' | 'activity';

export interface AgentAdmitAdminPanelProps {
  /** Base URL for admin API calls (e.g., "/agentadmit" or "https://yourdomain.com/agentadmit"). */
  apiBase: string;
  /** App owner's admin auth token. */
  authToken: string;
  /** AgentAdmit application ID (app_…). */
  appId: string;
  /** Optional CSS class name for the root container. */
  className?: string;
  /** Which tab to show initially. Default: 'connections'. */
  defaultTab?: AdminTab;
  /** Callback fired after a connection is successfully revoked. */
  onRevoke?: (connectionId: string) => void;
  /** Auto-refresh interval in ms. Default: 30000. Set to 0 to disable. */
  refreshInterval?: number;
  /**
   * Theme: 'light' | 'dark' | 'system'. Default: 'dark' — versions ≤1.1.0
   * always rendered dark, so the default preserves existing appearance.
   */
  theme?: 'light' | 'dark' | 'system';
  /**
   * Opt-in consent-evidence view on connection cards. When enabled, each
   * expanded card offers "Consent evidence", lazily fetched from
   * GET {apiBase}/admin/connections/{connection_id}/evidence — an
   * owner-implemented endpoint returning AdminConnectionEvidence (same
   * response shape as the user-facing evidence route). Off by default
   * (zero-surprise; existing backends without the endpoint see no change).
   */
  evidence?: boolean;
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

/**
 * Props for PresenceChallenge, the WebAuthn human-presence step-up for the
 * embedded flow. The app hosts the ceremony endpoints on its own domain (the
 * relying party is the app); the component drives the browser ceremony and
 * reports the outcome. The server-side gate is the security boundary.
 */
export interface PresenceChallengeProps {
  /** App-backend endpoint returning ceremony options:
   *  POST -> { mode: 'registration' | 'authentication', options } */
  optionsUrl: string;
  /** App-backend endpoint verifying the ceremony response:
   *  POST { credential } -> { verified: true } */
  verifyUrl: string;
  /** Extra headers for both requests (e.g. the app's session auth). */
  requestHeaders?: Record<string, string>;
  /** Fired once the ceremony verifies. Receives the single-use presence
   *  handle the backend minted (attestation id or hosted session id), when
   *  the backend returns one, plus the full result for advanced callers. */
  onVerified?: (
    presenceHandle?: string,
    result?: import('./lib/presenceCeremony').PresenceCeremonyResult,
  ) => void;
  /** Fired on any ceremony or endpoint failure. */
  onError?: (error: Error) => void;
  /** Idle button label. */
  buttonLabel?: string;
  /** Label while the browser prompt is open. */
  runningLabel?: string;
  /** Label shown after successful verification. */
  verifiedLabel?: string;
  /** Message when the browser has no WebAuthn support. */
  unsupportedLabel?: string;
  theme?: 'light' | 'dark' | 'system';
  className?: string;
}
