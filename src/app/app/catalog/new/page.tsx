import { redirect } from "next/navigation";
import { CatalogForm } from "@/features/catalog/catalog-form";
import { requireSession } from "@/lib/session";
import { ensurePersonalWorkspace } from "@/services/workspace";
export default async function NewCatalogItemPage() { const { user } = await requireSession(); const workspace = await ensurePersonalWorkspace(user); if (!workspace.onboardingCompletedAt) redirect("/onboarding"); return <div className="workspace"><main id="main" className="client-editor-main"><span className="eyebrow">NEW CATALOG ITEM</span><h1>Create a product or service</h1><p className="form-description">Set reusable defaults. You can still customize invoice lines later.</p><CatalogForm currency={workspace.defaultCurrency} initial={{ name: "", description: "", price: "", unit: "", taxable: true }}/></main></div>; }
