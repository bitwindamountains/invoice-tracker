"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { CatalogFormValues } from "./types";

export function CatalogForm({ initial, itemId, currency }: { initial: CatalogFormValues; itemId?: string; currency: string }) {
  const router = useRouter(); const [data, setData] = useState(initial); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  function update<K extends keyof CatalogFormValues>(key: K, value: CatalogFormValues[K]) { setData((current) => ({ ...current, [key]: value })); setFields((current) => ({ ...current, [key]: undefined })); }
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(""); setFields({}); try { const response = await fetch(itemId ? `/api/catalog/${itemId}` : "/api/catalog", { method: itemId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const result = await response.json() as { id?: string; error?: string; fields?: Record<string, string[] | undefined> }; if (!response.ok || !result.id) { setError(result.error ?? "Item could not be saved."); setFields(result.fields ?? {}); return; } router.replace(`/app/catalog/${result.id}`); router.refresh(); } catch { setError("We couldn’t connect. Your information is still here; try again."); } finally { setPending(false); } }
  return <form className="client-form catalog-form" onSubmit={submit}><section className="form-section"><div className="section-heading"><span className="eyebrow">ITEM DETAILS</span><h2>What do you sell?</h2><p>Save a reusable product or service for future invoices.</p></div><div className="form-grid">
    <label className="wide">Name<input value={data.name} onChange={(e) => update("name", e.target.value)} required maxLength={120}/>{fields.name?.[0] && <span className="field-error">{fields.name[0]}</span>}</label>
    <label className="wide">Description (optional)<textarea rows={4} value={data.description} onChange={(e) => update("description", e.target.value)} maxLength={1000}/>{fields.description?.[0] && <span className="field-error">{fields.description[0]}</span>}</label>
    <label>Default price ({currency})<input inputMode="decimal" value={data.price} onChange={(e) => update("price", e.target.value)} placeholder="0.00" required maxLength={20}/>{fields.price?.[0] && <span className="field-error">{fields.price[0]}</span>}</label>
    <label>Unit<input value={data.unit} onChange={(e) => update("unit", e.target.value)} placeholder="hour, project, item" required maxLength={40}/>{fields.unit?.[0] && <span className="field-error">{fields.unit[0]}</span>}</label>
    <label className="checkbox wide"><input type="checkbox" checked={data.taxable} onChange={(e) => update("taxable", e.target.checked)}/><span>Taxable by default</span></label>
  </div></section>{error && <p className="notice error" role="alert">{error}</p>}<div className="client-form-actions"><Link className="button secondary" href={itemId ? `/app/catalog/${itemId}` : "/app/catalog"}>Cancel</Link><button className="button primary" disabled={pending}>{pending ? "Saving…" : itemId ? "Save changes" : "Create item"}<Check size={17}/></button></div></form>;
}
