import { getSession } from "./auth";
import { getEnvironment } from "./env";
import { ensurePersonalWorkspace } from "@/services/workspace";

export async function getApiWorkspace() {
  const session = await getSession();
  if (!session) return null;
  const workspace = await ensurePersonalWorkspace(session.user);
  if (!workspace.onboardingCompletedAt) return null;
  return { session, workspace };
}

// Compare against APP_URL: in development Next reports request.url as localhost even when the browser uses 127.0.0.1.
export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(getEnvironment().APP_URL).origin);
}
