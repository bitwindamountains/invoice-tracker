import { notFound, redirect } from "next/navigation";
import { ClientForm } from "@/features/clients/client-form";
import { requireSession } from "@/lib/session";
import { ClientAccessDenied, ClientNotFound, getClient } from "@/services/clients";
import { ensurePersonalWorkspace } from "@/services/workspace";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { user } = await requireSession(); const workspace = await ensurePersonalWorkspace(user);
  if (!workspace.onboardingCompletedAt) redirect("/onboarding");
  let client;
  try { client = await getClient(user.id, workspace.id, (await params).clientId); } catch (error) { if (error instanceof ClientNotFound || error instanceof ClientAccessDenied) notFound(); throw error; }
  const initial = { name: client.name, company: client.company ?? "", email: client.email, phone: client.phone ?? "", addressLine1: client.addressLine1 ?? "", addressLine2: client.addressLine2 ?? "", city: client.city ?? "", provinceState: client.provinceState ?? "", postalCode: client.postalCode ?? "", country: client.country ?? "", taxId: client.taxId ?? "", currency: client.currency ?? "", notes: client.notes ?? "", version: client.version };
  return <div className="workspace"><main id="main" className="client-editor-main"><span className="eyebrow">EDIT CLIENT</span><h1>Edit {client.name}</h1><p className="form-description">Update the billing details stored for this client.</p><ClientForm initial={initial} clientId={client.id}/></main></div>;
}
