import type { Instrumentation } from "next";
import { logEvent } from "@/lib/logger";
import { errorLabel } from "@/lib/error-label";
import { getEnvironment } from "@/lib/env";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest).slice(0, 128) : undefined;
  logEvent("server_request_error", { method: request.method, route: context.routePath, routeType: context.routeType, digest });
  const environment = getEnvironment();
  if (environment.ERROR_MONITOR_URL && environment.ERROR_MONITOR_TOKEN) {
    try {
      await fetch(environment.ERROR_MONITOR_URL, { method: "POST", headers: { Authorization: `Bearer ${environment.ERROR_MONITOR_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ event: "server_request_error", digest, method: request.method, route: context.routePath, routeType: context.routeType, version: environment.DEPLOYMENT_VERSION, timestamp: new Date().toISOString() }), signal: AbortSignal.timeout(3000) });
    } catch { logEvent("error_monitor_delivery_failed", { route: context.routePath }); }
  }
};

// Demo workspaces expire after a day; sweep the stale ones at boot. Fire and forget so a slow database never delays readiness.
export async function register() {
  // Deliberate exception to the isDemoMode() rule: getEnvironment() would throw at boot on a bad env.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DEMO_MODE !== "true") return;
  void import("@/services/demo-cleanup")
    .then(({ deleteDemoWorkspaces }) => deleteDemoWorkspaces({ demoExpiresAt: { lt: new Date() } }))
    .catch((error: unknown) => logEvent("demo_cleanup_failed", { error: errorLabel(error) }));
}
