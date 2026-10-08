import type { Instrumentation } from "next";
import { logEvent } from "@/lib/logger";
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
