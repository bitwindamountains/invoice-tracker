import { redirect } from "next/navigation";
import { PrivateHeader } from "@/components/private-header";
import { BusinessSetupWizard } from "@/features/onboarding/business-setup-form";
import { loadBusinessSetup } from "@/features/onboarding/load";
import { requireSession } from "@/lib/session";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function OnboardingPage() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (workspace.onboardingCompletedAt) redirect("/app");
  return (
    <div className="workspace">
      <PrivateHeader showSettings={false} showAppNavigation={false} />
      <main id="main" className="setup-main">
        <BusinessSetupWizard
          initial={await loadBusinessSetup(workspace.id, user)}
        />
      </main>
    </div>
  );
}
