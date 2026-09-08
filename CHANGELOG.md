# Changelog

## 2.1.0 (2026-09-08)

- **Hosted ceremony hand-off for consent switches.** `useConsentSettings` and `ConsentSettingsPanel`
  understand a proxy `PUT` that answers `200 { ceremony_required: true, ceremony_url }`: the switch is
  not written yet, the hook does not mark it as set, and the user is sent to AgentAdmit's hosted
  consent-change page (`window.location.assign` by default; pass `onHostedCeremony(url, ctx)` to open
  it your own way, e.g. a mobile sheet). Non-`https:` URLs are refused. Your backend mints the session
  with `POST /api/v1/consent/sessions` (AgentAdmit 058); the `return_url` brings the user back and the
  panel refetches true state. This is the documented path for consent-switch changes; the `presence`
  step-up on an app-mediated `PUT` remains supported.

## 2.0.0 (2026-09-08)

**Breaking: the in-app consent flow is removed.** The consent step runs on the AgentAdmit hosted
consent page, opened on your app's behalf (`POST /api/v1/apps/{app_id}/consent-sessions`). This
package ships no consent UI and no WebAuthn ceremony for the agent grant.

- Removed: `AgentAdmitPanel`, `ScopeSelector`, `DurationPicker`, `TokenDisplay`, `PresenceChallenge`,
  `useAgentAdmit().generateToken` / `connectionToken` / `clearToken`, the `runPresenceCeremony` /
  `browserSupportsPresence` public exports, the related prop types, and `TEMPLATE-FIRST-ARCHITECTURE.md`.
- Added: `ConnectAgentButton` and `useConsentSession` — call your backend endpoint that creates the
  consent session, receive `{ session_url }`, refuse non-`https:` URLs, and send the signed-in user to
  the hosted page.
- `useAgentAdmit` now lists and revokes connections only (`connections`, `connectionsLoaded`,
  `revokeConnection`, `refreshConnections`, rate-limit state).
- Unchanged: `ConnectionsList`, `PromptTemplates`, `ConsentSettingsPanel`, `RelationshipConsentPanel`,
  `AlertsPanel`, `AgentAdmitAdminPanel` and their hooks. `PresenceCeremonyError` stays exported for
  the consent-settings presence step-up.
- Migration: replace the panel with `ConnectAgentButton` plus a backend endpoint that creates the
  consent session with your server-side API key; keep `ConnectionsList` for the list and revoke.

## 1.11.2 (2026-09-08)

- **Docs + deprecation notices only; no runtime behavior change.** The in-app consent flow
  (`AgentAdmitPanel`, and the mint-flow pieces `ScopeSelector`, `DurationPicker`,
  `TokenDisplay`, `useAgentAdmit().generateToken`) is **deprecated** and is not a supported
  integration path. The consent step (scope selection, duration, intent, existing-grant
  review, presence ceremony, token display) runs on the AgentAdmit hosted consent page
  opened on your app's behalf (`POST /api/v1/apps/{app_id}/consent-sessions`). These
  exports keep working for existing integrations and will be removed in 2.0.
- README rewritten around the companion components: `ConnectionsList`,
  `ConsentSettingsPanel`, `RelationshipConsentPanel`, `PromptTemplates` (post-consent),
  `AlertsPanel`, `AgentAdmitAdminPanel`.
- `TEMPLATE-FIRST-ARCHITECTURE.md` marked superseded (template-first lives in the app
  around the hosted page, not in an embedded consent UI).

## 1.11.1 (2026-08-19)

- Docs only: README gains "Ceremony-confirmed changes" — when to route relationship-consent changes through hosted ceremony sessions (`POST /api/v1/consent/relationship/sessions`) for independently verifiable evidence, and how that composes with `RelationshipConsentPanel`.

## 1.5.1

- **Fix: recognize error codes from proxied backends that nest errors under
  `detail`.** AgentAdmit error responses carry the code at the top level
  (`{ error, error_description }`), but the recommended secure integration
  proxies the API through the customer's own backend, and a FastAPI backend's
  default handler emits `{ detail: { error, error_description } }`. The SDK now
  reads from the top level first and falls back to `detail`, so challenge codes
  such as `presence_attestation_required` are recognized and the passkey
  ceremony still starts (previously it silently never launched behind a
  FastAPI-style proxy). Applied to `useConsentSettings`, `runPresenceCeremony`,
  and the admin/alerts/token error messages via the shared
  `readAgentAdmitError` helper. Backward compatible.
