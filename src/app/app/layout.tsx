import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { DemoBanner } from "@/components/demo-banner";
import { isDemoMode } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { getNavigationCounts } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const demo = isDemoMode();
  const counts = await getNavigationCounts(user.id, workspace.id);
  return (
    <AppShell
      businessName={workspace.name}
      userName={user.name}
      counts={counts}
      demo={demo}
      banner={demo && workspace.demoExpiresAt ? <DemoBanner expiresAt={workspace.demoExpiresAt.toISOString()} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
