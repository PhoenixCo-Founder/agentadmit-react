# AgentAdmit React SDK

Drop-in React components for AI Agent Access. Give your users a complete, ready-to-use agent connection experience.

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

Add an "AI Agent Access" page or tab in your app. Common placements:
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

## Important

**Architecture:** AgentAdmit uses mandatory hosted introspection. All token validation goes through api.agentadmit.com on the backend. This React SDK handles the frontend UI only. Token validation is handled by the backend SDK (Python/Node/Java/PHP/Ruby).

**In-app AI scopes.** If your app has built-in AI features (analysis, plan generation, photo recognition), do not expose those as agent scopes. The user's AI agent can read the raw data and do the analysis itself. Exposing in-app AI endpoints to agents creates double cost for both you and your users. Define your scopes around raw data access, not in-app AI triggers.

## Documentation

Full integration guide: https://docs.agentadmit.com/getting-started
Data structure examples: included in the integration guide (Step 4)

## License

All rights reserved. Patent pending.
