import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/session";
import { getNavigationCounts } from "@/services/payment-intelligence";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  const counts = await getNavigationCounts(user.id, workspace.id);
  return (
    <AppShell businessName={workspace.name} userName={user.name} counts={counts}>
      {children}
    </AppShell>
  );
}
