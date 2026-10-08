import { getAuth } from "./auth";
import { ensurePersonalWorkspace } from "@/services/workspace";

export async function getApiWorkspace(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return null;
  const workspace = await ensurePersonalWorkspace(session.user);
  if (!workspace.onboardingCompletedAt) return null;
  return { session, workspace };
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
