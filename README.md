# AgentAdmit React SDK

Drop-in React components for AgentAdmit. Give your users a complete, ready-to-use agent connection experience.

> **Get started:** Sign up at [agentadmit.com](https://agentadmit.com) → Get your test keys → Install the SDK → Build.
> Test keys are available immediately after signup. Live keys become available when you subscribe an app.

## Quick Start

```bash
npm install @agentadmit/react
```

```jsx
import { AgentAdmitPanel } from '@agentadmit/react';
// Import the default stylesheet (recommended)
import '@agentadmit/react/styles';

function AgentAccessPage() {
  return (
    <AgentAdmitPanel
      apiBase="/agentadmit"
      authToken={userSessionToken}
      userRole={user.role}
      appName="Your App Name"
      scopeResources={yourScopes}
      templates={yourTemplates}
      editableFields={yourFields}
      exampleCategories={yourExamples}
      durationOptions={[
        { label: '1 hour', seconds: 3600 },
        { label: '7 days', seconds: 604800 },
        { label: 'Until I revoke', seconds: 315360000 },
      ]}
    />
  );
}
```

One component gives your users:
- Scope selection with presets
- Duration picker
- Token generation with security guidance
- Scope-filtered prompt templates with editable fields
- "Things You Can Ask" quick-copy prompts
- Connection management (view, revoke)

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiBase` | string | Yes | Base URL for AgentAdmit API (e.g., "/agentadmit") |
| `authToken` | string | Yes | Your app's user session token |
| `userRole` | string | No | User's role (filters templates/scopes by role) |
| `appName` | string | No | Your app's name (shown in UI) |
| `scopeResources` | array | Yes | Scope definitions organized by group |
| `templates` | array | No | Prompt templates (scope-filtered, role-aware) |
| `editableFields` | object | No | Editable field definitions for templates |
| `exampleCategories` | array | No | Quick-copy prompt examples by category |
| `durationOptions` | array | No | Connection duration choices |
| `theme` | string | No | 'light', 'dark', or 'system' |
| `className` | string | No | CSS class for root container |

## Where to Put It

Add an "AgentAdmit" page or tab in your app. Common placements:
- Sidebar navigation item (recommended)
- Tab within Settings or Account page
- Dedicated route like `/settings/agent-access`

## Styling & Customization

### Default Styles (Recommended)

The SDK ships a production-ready default stylesheet. Import it once at your app's entry point:

```js
// In your main entry file (e.g. main.tsx, _app.tsx, layout.tsx)
import '@agentadmit/react/styles';
// or equivalently:
import '@agentadmit/react/dist/styles/agent-admit-panel.css';
```

The stylesheet is fully scoped to `.agent-admit-panel` - it won't affect any other part of your app.

### CSS Custom Properties (Tokens)

Customize the look by overriding `--aap-*` tokens. Put this anywhere after the import:

```css
/* globals.css or a <style> tag */
.agent-admit-panel {
  /* Brand color */
  --aap-color-primary: #7c3aed;
  --aap-color-primary-hover: #6d28d9;
  --aap-color-primary-text: #ffffff;

  /* Shape */
  --aap-radius: 10px;
  --aap-radius-md: 14px;
  --aap-radius-lg: 18px;

  /* Typography */
  --aap-font-family: 'Inter', sans-serif;
}
```

**Available tokens:**

| Token | Default | Description |
|-------|---------|-------------|
| `--aap-color-primary` | `#2563eb` | Primary action color |
| `--aap-color-danger` | `#dc2626` | Destructive actions, errors |
| `--aap-color-bg` | `#ffffff` | Panel background |
| `--aap-color-surface` | `#f9fafb` | Card / section surfaces |
| `--aap-color-text` | `#111827` | Primary text |
| `--aap-color-text-secondary` | `#4b5563` | Secondary/description text |
| `--aap-color-border` | `#e5e7eb` | Dividers and card borders |
| `--aap-color-focus` | `#2563eb` | Focus ring color |
| `--aap-font-family` | `inherit` | Inherits from host app by default |
| `--aap-font-size-base` | `16px` | Input font size (min 16px - iOS zoom prevention) |
| `--aap-radius` | `6px` | Default border radius |
| `--aap-touch-target-min` | `44px` | Minimum touch target (Apple HIG, WCAG AAA) |

### Dark Mode

Dark mode is automatic via `prefers-color-scheme: dark`. To force it:

```tsx
<AgentAdmitPanel theme="dark" />    // Forces dark (adds .aa-dark)
<AgentAdmitPanel theme="light" />   // Forces light (adds .aa-light)
<AgentAdmitPanel theme="system" />  // Follows OS preference (default)
```

### Custom CSS Classes

Every component accepts `className`. All internal elements use `aa-*` classes you can override:

| Class | Element |
|-------|--------|
| `agent-admit-panel` | Root container (token scope + CSS reset) |
| `aa-panel` | Panel layout (padding, border, shadow) |
| `aa-btn-primary` | Primary action buttons |
| `aa-btn-secondary` | Secondary / cancel buttons |
| `aa-pill` | Scope permission pills |
| `aa-duration-option` | Duration picker buttons |
| `aa-token-display` | Token display area |
| `aa-template-card` | Prompt template cards |
| `aa-connection-card` | Connection list items |
| `aa-input`, `aa-field-input` | Text inputs |
| `aa-select` | Select dropdowns |
| `aa-tab` | Tab bar buttons |

### Responsive Behavior

The panel uses **CSS container queries** (`@container`), not viewport media queries. This means it responds to its own rendered width - not the browser window. The layout adapts correctly whether the panel is in a:
- Full-page route
- Modal dialog
- Sidebar or drawer
- Native mobile WebView

No configuration needed - just drop it in and it works at any width.

### Custom Labels

```tsx
<AgentAdmitPanel
  headerTitle="Connect Your AI Assistant"
  generateButtonLabel={(count) => `Create Token (${count} permissions)`}
/>
```

### Accessibility

The default stylesheet is built to meet WCAG 2.2 AA and Apple HIG standards out of the box:

- All interactive elements: `min-height: 44px` touch targets (Apple HIG, WCAG AAA)
- All inputs: `font-size: 16px` minimum - prevents iOS Safari auto-zoom in WebViews
- `:focus-visible` rings on all interactive elements - keyboard navigation
- `prefers-reduced-motion` respected - all transitions disabled for motion-sensitive users
- `forced-colors` media query - Windows High Contrast Mode supported
- Color contrast: ≥4.5:1 for body text, ≥3:1 for UI components (WCAG AA)
- ARIA attributes: `role`, `aria-expanded`, `aria-controls`, `aria-pressed`, `aria-checked`, `aria-live` on all components

Full compliance guide: [agentadmit.com/docs/compliance](https://agentadmit.com/docs/compliance)

## Individual Components

For custom layouts, import components separately:

```jsx
import {
  ScopeSelector,
  DurationPicker,
  TokenDisplay,
  PromptTemplates,
  ConnectionsList,
} from '@agentadmit/react';
```

## ConsentSettingsPanel (Caller-Identity Consent)

Independent per-user consent toggles for the three caller classes: people the user shares with, your in-app AI, and external AI agents. No toggle implies another; any combination is allowed. State lives in AgentAdmit's hosted Consent Ledger.

```tsx
import { ConsentSettingsPanel } from '@agentadmit/react';

<ConsentSettingsPanel
  apiBase="/agentadmit"
  authToken={userSessionToken}
  onConsentChange={(cls, granted) => console.log(cls, granted)}
/>
```

Backend proxy contract (your server injects the user's `app_user_id` and calls AgentAdmit with your `aa_` API key, which never ships to the browser):

- `GET {apiBase}/consent/settings` proxies AgentAdmit `GET /api/v1/consent/settings?app_user_id=<user>` and returns its JSON (`settings`, `effective`, `app_defaults`).
- `PUT {apiBase}/consent/settings` with `{ caller_class, granted }` proxies AgentAdmit `PUT /api/v1/consent/settings` with `app_user_id` injected and `updated_via: "user_page"`.

Props: `showHumanSession` (default false; most apps govern human sharing in their own UI), `copy` (override label/description per class), `theme`, `className`, `onConsentChange`. The `useConsentSettings` hook is exported for custom layouts.

## Admin Panel Component

The React SDK includes `<AgentAdmitAdminPanel>` for app owners and MCP server operators to embed in their admin dashboard:

```jsx
import { AgentAdmitAdminPanel } from '@agentadmit/react';

<AgentAdmitAdminPanel
  apiBase="/agentadmit"
  authToken={adminJwt}
  appId="app_yourappid"
/>
```

Four tabs: **Connections** (all users, search/filter, revoke), **Usage** (calls vs tier, overage tracking), **Alerts** (embedded AlertsPanel with thresholds + kill switch), **Activity** (full audit trail with expandable details).

App owners see everything and can respond to abuse without leaving their app. Auto-refreshes every 30 seconds by default.

Add `theme="light"` (or `"system"`) if your admin dashboard is not dark - the default is `"dark"`.

## Backend Proxy Contract (Admin Panel & Alerts)

`<AgentAdmitAdminPanel>` (via `useAdminData`) and `<AlertsPanel>` (via `useAlerts`) call **your backend** at `apiBase`, which proxies to AgentAdmit using your API key. Your backend must expose the endpoints below and return these exact JSON shapes - the hooks read these field names literally (e.g. `usage`, `events`, `occurred_at`). All requests carry `Authorization: Bearer <authToken>`; your backend must restrict every one of these endpoints to admin users.

**Error convention (all endpoints):** any non-2xx response with a JSON body containing `error_description` shows that message in the panel's error banner.

### GET `{apiBase}/admin/connections?app_id=...`

```jsonc
{
  "connections": [
    {
      "connection_id": "conn_abc123",        // required
      "status": "active",                    // "active" | "revoked" | "expired"
      "scopes": ["read:orders"],             // string[]
      "user_id": "u_123",
      "user_label": "jane@example.com",      // display name; falls back to user_id
      "agent_id": "agent_9",                 // optional
      "agent_label": "Claude",               // display name; falls back to agent_id
      "role": "user",                        // optional
      "created_at": "2026-06-12T19:00:00Z",  // ISO 8601
      "last_used": "2026-06-12T19:26:00Z",   // optional
      "expires_at": "2026-06-13T19:00:00Z"   // optional
    }
  ],
  "total": 14
}
```

### GET `{apiBase}/admin/usage?app_id=...`

The hook reads `response.usage` - if that key is missing the Usage tab shows "No usage data available."

```jsonc
{
  "usage": {
    "app_id": "app_yourappid",
    "tier": {
      "name": "standard",
      "call_limit": 10000,          // number | null (null renders as unlimited / ∞)
      "calls_used": 1234,
      "calls_remaining": 8766,      // number | null
      "period_start": "2026-06-01T00:00:00Z",  // optional
      "period_end": "2026-07-01T00:00:00Z",    // optional
      "overage_calls": 0,           // optional
      "overage_enabled": false      // optional
    },
    "active_connections": 2,
    "total_connections": 14,
    "breakdown": [                  // optional - per-agent/scope/endpoint bars
      { "label": "Claude", "calls": 900 }
    ]
  }
}
```

### GET `{apiBase}/admin/activity?app_id=...&limit=50&offset=0`

The hook reads `response.events` and `response.total`. Omit optional fields rather than sending `null`/empty strings.

```jsonc
{
  "events": [
    {
      "occurred_at": "2026-06-12T19:26:17Z", // required, ISO 8601
      "event_id": "evt_1",                   // optional (falls back to list index)
      "connection_id": "conn_abc123",
      "user_id": "u_123",
      "user_label": "jane@example.com",
      "agent_id": "agent_9",
      "agent_label": "Claude",
      "scope": "read:orders",                // scope that was used
      "action": "GET",                       // HTTP method or action name
      "endpoint": "/api/orders",             // resource path accessed
      "status_code": 200,
      "details": { "note": "..." }           // optional, shown as expandable JSON
    }
  ],
  "total": 10
}
```

### DELETE `{apiBase}/admin/connections/{connection_id}`

Revokes any user's connection (proxy to the hosted `/api/v1/revoke` - that call is what actually kills the agent's tokens). Return any 2xx on success; the panel optimistically removes the row and then re-fetches the list.

### Alerts endpoints (`useAlerts` / the Alerts tab)

> **ADMIN-ONLY. All three alerts endpoints (both GETs and the POST) must be restricted to admin users by your backend proxy.** The POST endpoint accepts `AlertConfig` payloads that include `kill_switch_enabled`, which controls the app-wide kill switch for all agent connections. Allowing a non-admin caller to reach this endpoint lets them disable the kill switch for your entire application. Do not route end-user tokens to these endpoints.

| Method | Path | Returns |
|---|---|---|
| GET | `{apiBase}/alerts/config?app_id=...[&connection_id=...]` | `{ "app_id", "app_level": { "<alert_type>": AlertConfig }, "connection_overrides": {}, "alert_types": string[] }` |
| GET | `{apiBase}/alerts?app_id=...&limit=50&offset=0[&alert_type=...]` | `{ "events": AlertEvent[], "total", "limit", "offset" }` |
| POST | `{apiBase}/alerts` | body `{ "app_id", "alert_type", ...AlertConfig }` → 2xx on success |

```jsonc
// AlertConfig (all fields optional)
{ "enabled": true, "threshold_value": 100, "threshold_window_minutes": 5,
  "threshold_rate_per_minute": 20, "stale_days": 30,
  "kill_switch_enabled": false, "kill_switch_threshold_value": 500,
  "kill_switch_threshold_window_minutes": 5 }

// AlertEvent
{ "id": "evt_1", "app_id": "app_yourappid", "connection_id": "conn_abc123",
  "alert_type": "volume_spike", "triggered_at": "2026-06-12T19:00:00Z",
  "details": { "message": "..." } }
```

These shapes match what the AgentAdmit hosted service returns from `/api/v1/alerts*`, so the alerts endpoints can be thin pass-through proxies; the `/admin/*` endpoints are assembled by your backend (connections + audit log + usage data), typically from the backend SDK's storage plus your own user table for `user_label`.

## Important

**Architecture:** AgentAdmit uses mandatory hosted introspection. All token validation goes through api.agentadmit.com on the backend. This React SDK handles the frontend UI only. Token validation is handled by the backend SDK (Python/Node/Java/PHP/Ruby).

**In-app AI scopes.** If your app has built-in AI features (analysis, plan generation, photo recognition), do not expose those as agent scopes. The user's AI agent can read the raw data and do the analysis itself. Exposing in-app AI endpoints to agents creates double cost for both you and your users. Define your scopes around raw data access, not in-app AI triggers.

## Rate Limiting

The AgentAdmit API enforces rate limits and may return HTTP 429. Because this is a **frontend React SDK**, the hook surfaces rate limit information as state rather than auto-retrying (server-side retry is handled automatically by the backend SDKs).

### Detecting rate limits

```tsx
const {
  generateToken,
  isRateLimited,    // true when last request was 429
  rateLimitInfo,    // { retryAfter, limit, remaining, reset }
  clearRateLimit,
} = useAgentAdmit({ apiBase, authToken });

// In your UI
if (isRateLimited && rateLimitInfo?.retryAfter) {
  return <p>Too many requests. Please try again in {Math.ceil(rateLimitInfo.retryAfter)} seconds.</p>;
}
```

### `RateLimitInfo` type

```typescript
interface RateLimitInfo {
  retryAfter: number | null;  // Retry-After header (seconds), or null
  limit:      number | null;  // X-RateLimit-Limit
  remaining:  number | null;  // X-RateLimit-Remaining
  reset:      number | null;  // X-RateLimit-Reset (Unix timestamp)
}
```

### Hook return values (new)

| Property | Type | Description |
|----------|------|-------------|
| `isRateLimited` | `boolean` | `true` if last request returned 429 |
| `rateLimitInfo` | `RateLimitInfo \| null` | Rate limit details, or `null` |
| `clearRateLimit` | `() => void` | Manually clear rate limit state |

Rate limit state auto-clears on the next successful request.

> **Note:** Automatic server-side retries with backoff are handled by the backend SDK (Python, Node.js, Go, etc.). The React hook intentionally surfaces the rate limit as UI state so your app can display feedback to the user.

## Documentation

Full integration guide: https://agentadmit.com/docs/app-owner-guide
Data structure examples: included in the integration guide (Step 4)


## Data Collection & Privacy

The AgentAdmit React SDK is designed for maximum privacy compliance.

### What the SDK transmits
- **Auth token** - Your user's JWT, provided by your app via the `authToken` prop. Sent as an `Authorization` header.
- **Scope selections** - The permissions the user selects in the UI. Sent to your API endpoint.
- **Duration preference** - The connection duration the user selects. Sent to your API endpoint.

### What the SDK does NOT collect
- No device identifiers (IDFA, GAID, or device fingerprinting)
- No location, contacts, photos, or media
- No analytics, telemetry, or crash reporting
- No advertising identifiers or tracking
- No cookies or persistent local storage
- No Apple Required Reason APIs

### Where data goes
ALL data is sent to the `apiBase` URL you configure - your own backend server. The SDK does not send data to AgentAdmit's servers or any third party. The SDK has zero hardcoded external domains.

### Apple App Store
This package includes a `PrivacyInfo.xcprivacy` privacy manifest for React Native / iOS distribution. When filling out Apple's Privacy Nutrition Labels, the AgentAdmit SDK's data collection is minimal - see our [compliance guide](https://agentadmit.com/docs/compliance) for copy-paste answers.

### Google Play
When filling out the Google Play Data Safety form, the AgentAdmit SDK does not independently collect or share user data with third parties. All data processing occurs between the user's device and your own server. See our [compliance guide](https://agentadmit.com/docs/compliance) for copy-paste Data Safety form answers.

## License

All rights reserved. Patent pending.

## AlertsPanel Component

> **ADMIN-ONLY SURFACE. Do not expose AlertsPanel to end users.**
>
> `AlertsPanel` (and `useAlerts`) calls the `/alerts/config` and `/alerts` endpoints, including POST requests that mutate app-level alert configuration. The `AlertConfig` payload includes `kill_switch_enabled`, which controls the app-wide kill switch for all agent connections. Exposing these endpoints or this component to end users lets any end user disable your app's kill switch. Your backend proxy MUST restrict every alerts endpoint to admin users only -- this requirement is stated in `docs/admin-proxy-contract.md`. Embed `AlertsPanel` only in your admin dashboard, behind your existing admin authentication.

Drop-in component for alert history and threshold configuration. Embed this in your **admin dashboard** behind admin authentication:

```tsx
import { AlertsPanel } from '@agentadmit/react';

// authToken MUST be an admin credential -- your backend proxy enforces admin-only access
// to all alerts endpoints (GET and POST), including kill_switch_enabled.
// Do NOT pass a regular user session token here.
<AlertsPanel apiBase="/agentadmit" authToken={adminSession.token} appId="app_abc123" />
```

### useAlerts Hook

```tsx
import { useAlerts } from '@agentadmit/react';

// authToken MUST be an admin credential -- configureAlert POSTs app-level alert config
// including kill_switch_enabled. Use this hook only in admin contexts.
const { alertEvents, configureAlert, fetchAlertEvents } = useAlerts({
  apiBase: '/agentadmit', authToken: adminSession.token, appId: 'app_abc123',
});
await configureAlert('volume_spike', { enabled: true, threshold_value: 100, threshold_window_minutes: 5 });
```


### Notifying Your Users

AgentAdmit detects anomalies, fires alerts, and (with kill switch) auto-revokes connections. **How you notify your own users is up to you.** AgentAdmit provides the data -- you deliver it through your own system (in-app notifications, email, push, etc.).

- **Poll alerts** -- Use the SDK methods above from your backend to check for new events, then notify users through your existing system.
- **Webhook delivery (coming soon)** -- Configure a webhook URL in your AgentAdmit dashboard. When an alert fires, AgentAdmit POSTs the payload to your server.
- **React SDK** -- Embed the `<AlertsPanel>` component in your admin dashboard so admins can monitor alert history and adjust thresholds.
