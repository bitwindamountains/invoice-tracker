import { redirect } from "next/navigation";
import { ClientForm } from "@/features/clients/client-form";
import { requireSession } from "@/lib/session";
import { ensurePersonalWorkspace } from "@/services/workspace";

const emptyClient = { name: "", company: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", provinceState: "", postalCode: "", country: "", taxId: "", currency: "", notes: "" };

export default async function NewClientPage() {
  const { user } = await requireSession();
  const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  return <div className="workspace"><main id="main" className="client-editor-main"><span className="eyebrow">NEW CLIENT</span><h1>Create a client</h1><p className="form-description">Add the details you need to prepare accurate invoices.</p><ClientForm initial={emptyClient}/></main></div>;
}
