import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { ensurePersonalWorkspace } from "@/services/workspace";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const workspace = await ensurePersonalWorkspace(session.user);
  const profile = await getDatabase().businessProfile.findUnique({
    where: { workspaceId: workspace.id },
    select: { logoData: true, logoMimeType: true },
  });
  if (!profile?.logoData || !profile.logoMimeType)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  return new Response(new Uint8Array(profile.logoData), {
    headers: {
      "Content-Type": profile.logoMimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
