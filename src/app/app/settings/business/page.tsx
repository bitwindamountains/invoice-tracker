import { redirect } from "next/navigation";
import { BusinessSetupWizard } from "@/features/onboarding/business-setup-form";
import { loadBusinessSetup } from "@/features/onboarding/load";
import { requireSession } from "@/lib/session";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function BusinessSettingsPage() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  return (
    <div className="workspace">
      <main id="main" className="setup-main">
        <BusinessSetupWizard
          initial={await loadBusinessSetup(workspace.id, user)}
          editing
        />
      </main>
    </div>
  );
}
