/**
 * Read an AgentAdmit error body tolerating both response shapes.
 *
 * The AgentAdmit API (and this SDK's contract) carries error codes at the TOP
 * LEVEL: `{ error, error_description }`. But the recommended secure integration
 * proxies the API through the customer's own backend, and a backend that nests
 * errors — notably FastAPI's default HTTPException handler, which emits
 * `{ detail: { error, error_description } }` — would otherwise hide the code
 * from the SDK, so challenge codes (e.g. `presence_attestation_required`) go
 * unrecognized and the passkey ceremony never starts.
 *
 * Reading from the top level first, then falling back to `detail`, keeps the
 * canonical contract primary while protecting every FastAPI-style proxy.
 */
export interface AgentAdmitErrorBody {
  error?: string;
  error_description?: string;
}

export function readAgentAdmitError(body: unknown): AgentAdmitErrorBody {
  const top = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const detail =
    top.detail && typeof top.detail === 'object'
      ? (top.detail as Record<string, unknown>)
      : {};
  return {
    error: (top.error ?? detail.error) as string | undefined,
    error_description: (top.error_description ?? detail.error_description) as string | undefined,
  };
}
