# AgentAdmit React SDK

Drop-in React components for AgentAdmit. Give your users a complete, ready-to-use agent connection experience.

## Quick Start

```bash
npm install @agentadmit/react
```

```jsx
import { AgentAdmitPanel } from '@agentadmit/react';
import '@agentadmit/react/styles.css';

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
- "How It Works" 3-step guide
- Scope selection with presets
- Duration picker
- Token generation with security guidance
- "Next Step" bridge guiding users to templates
- Scope-filtered prompt templates with editable fields
- "Things You Can Ask" quick-copy prompts
- Saved templates (personalize and reuse)
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
| `showGuide` | boolean | No | Show "How It Works" guide (default: true) |
| `theme` | string | No | 'light', 'dark', or 'system' |
| `className` | string | No | CSS class for root container |

## Where to Put It

Add an "AgentAdmit" page or tab in your app. Common placements:
- Sidebar navigation item (recommended)
- Tab within Settings or Account page
- Dedicated route like `/settings/agent-access`

## Styling

Built-in CSS works in light and dark modes. All classes prefixed with `aa-` (won't conflict with your styles). Import `@agentadmit/react/styles.css` for defaults, or override any class.

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

## Admin Panel Component

The React SDK also includes `<AgentAdmitAdminPanel>` for app owners and MCP server operators to embed in their admin section:

```jsx
import { AgentAdmitAdminPanel } from '@agentadmit/react';

<AgentAdmitAdminPanel
  apiBase="/agentadmit"
  authToken={adminSessionToken}
  appId="app_yourappid"
/>
```

Shows: all active agent connections, API usage vs tier, recent agent activity, billing status, and a revoke button per connection. App owners see everything and can respond to abuse without leaving their app. Their own AI agent can also monitor through admin scopes.

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

## License

All rights reserved. Patent pending.
