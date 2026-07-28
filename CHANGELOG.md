# Changelog

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
