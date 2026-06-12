# Backend Proxy Contract — Admin Panel & Alerts

> Source for the **App Owner Guide** section of the same name on agentadmit.com/docs.
> Keep in sync with README.md (section "Backend Proxy Contract") and src/types.ts.

## Backend Proxy Contract (Admin Panel & Alerts)

`<AgentAdmitAdminPanel>` (via `useAdminData`) and `<AlertsPanel>` (via `useAlerts`) call **your backend** at `apiBase`, which proxies to AgentAdmit using your API key. Your backend must expose the endpoints below and return these exact JSON shapes — the hooks read these field names literally (e.g. `usage`, `events`, `occurred_at`). All requests carry `Authorization: Bearer <authToken>`; your backend must restrict every one of these endpoints to admin users.

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

The hook reads `response.usage` — if that key is missing the Usage tab shows "No usage data available."

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
    "breakdown": [                  // optional — per-agent/scope/endpoint bars
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

Revokes any user's connection (proxy to the hosted `/api/v1/revoke` — that call is what actually kills the agent's tokens). Return any 2xx on success; the panel optimistically removes the row and then re-fetches the list.

### Alerts endpoints (`useAlerts` / the Alerts tab)

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
