// Shared runtime values for server-function modules.
// Server-function files must keep module scope to imports + fn declarations,
// so constants/helpers live here instead.

export const ADMIN_PASSWORD = "20071030";

export function isTransientBackendError(error: unknown) {
  const message = String(
    (error as { message?: unknown } | null | undefined)?.message ?? error ?? "",
  );
  return (
    message.includes("Error code 521") ||
    message.includes("Web server is down") ||
    message.includes("<!DOCTYPE html") ||
    message.includes("schema cache")
  );
}

export function logTrackerError(action: string, error: unknown) {
  if (!isTransientBackendError(error)) {
    console.warn(`[tracker] ${action} failed`, error);
  }
}

export const CHANGELOG_KINDS = ["new", "fix", "improved", "soon"] as const;
