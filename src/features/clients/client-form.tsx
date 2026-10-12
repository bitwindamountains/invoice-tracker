"use client";
import { toast } from "@/components/toaster";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { supportedCountries, supportedCurrencies } from "@/features/onboarding/schema";
import type { ClientFormValues } from "./types";

export function ClientForm({ initial, clientId }: { initial: ClientFormValues; clientId?: string }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const editing = Boolean(clientId);
  function update(key: keyof ClientFormValues, value: string) { setData((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: undefined })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setFieldErrors({});
    try {
      const response = await fetch(editing ? `/api/clients/${clientId}` : "/api/clients", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json() as { id?: string; error?: string; fields?: Record<string, string[] | undefined> };
      if (!response.ok || !result.id) { setError(result.error ?? "Client could not be saved."); setFieldErrors(result.fields ?? {}); return; }
      toast(editing ? "Client updated." : "Client added."); router.replace(`/app/clients/${result.id}`); router.refresh();
    } catch { setError("We couldn’t connect. Your information is still here; try again."); }
    finally { setPending(false); }
  }
  return <form className="client-form" onSubmit={submit}>
    <section className="form-section"><div className="section-heading"><span className="eyebrow">CLIENT DETAILS</span><h2>Who are you billing?</h2><p>Name and email are required. Everything else can be added when it becomes useful.</p></div><div className="form-grid">
      <Field label="Client name" name="name" value={data.name} update={update} error={fieldErrors.name?.[0]} required maxLength={120}/>
      <Field label="Company (optional)" name="company" value={data.company} update={update} error={fieldErrors.company?.[0]} maxLength={120}/>
      <Field label="Email" name="email" type="email" value={data.email} update={update} error={fieldErrors.email?.[0]} required maxLength={254}/>
      <Field label="Phone (optional)" name="phone" type="tel" value={data.phone} update={update} error={fieldErrors.phone?.[0]} maxLength={40}/>
      <label>Currency override<select value={data.currency} onChange={(event) => update("currency", event.target.value)}><option value="">Use business default</option>{supportedCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select>{fieldErrors.currency?.[0] && <span className="field-error">{fieldErrors.currency[0]}</span>}</label>
      <Field label="Tax ID (optional)" name="taxId" value={data.taxId} update={update} error={fieldErrors.taxId?.[0]} maxLength={80}/>
    </div></section>
    <section className="form-section"><div className="section-heading"><span className="eyebrow">BILLING ADDRESS</span><h2>Where should invoices be addressed?</h2></div><div className="form-grid">
      <Field label="Address line 1 (optional)" name="addressLine1" value={data.addressLine1} update={update} error={fieldErrors.addressLine1?.[0]} maxLength={200} wide/>
      <Field label="Address line 2 (optional)" name="addressLine2" value={data.addressLine2} update={update} error={fieldErrors.addressLine2?.[0]} maxLength={200} wide/>
      <Field label="City (optional)" name="city" value={data.city} update={update} error={fieldErrors.city?.[0]} maxLength={100}/>
      <Field label="Province / state (optional)" name="provinceState" value={data.provinceState} update={update} error={fieldErrors.provinceState?.[0]} maxLength={100}/>
      <Field label="Postal code (optional)" name="postalCode" value={data.postalCode} update={update} error={fieldErrors.postalCode?.[0]} maxLength={24}/>
      <label>Country (optional)<select value={data.country} onChange={(event) => update("country", event.target.value)}><option value="">No country selected</option>{supportedCountries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>{fieldErrors.country?.[0] && <span className="field-error">{fieldErrors.country[0]}</span>}</label>
    </div></section>
    <section className="form-section"><div className="section-heading"><span className="eyebrow">PRIVATE NOTES</span><h2>Keep useful context nearby.</h2><p>Notes stay inside your workspace and never appear on invoices.</p></div><label>Notes (optional)<textarea rows={5} maxLength={2000} value={data.notes} onChange={(event) => update("notes", event.target.value)}/>{fieldErrors.notes?.[0] && <span className="field-error">{fieldErrors.notes[0]}</span>}</label></section>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="client-form-actions"><Link className="button secondary" href={editing ? `/app/clients/${clientId}` : "/app/clients"}><ArrowLeft size={17}/>Cancel</Link><button className="button primary" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create client"}<Check size={17}/></button></div>
  </form>;
}

function Field({ label, name, value, update, error, type = "text", required, maxLength, wide }: { label: string; name: keyof ClientFormValues; value: string; update: (name: keyof ClientFormValues, value: string) => void; error?: string; type?: string; required?: boolean; maxLength: number; wide?: boolean }) {
  return <label className={wide ? "wide" : undefined}>{label}<input type={type} value={value} onChange={(event) => update(name, event.target.value)} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}/>{error && <span className="field-error" id={`${name}-error`}>{error}</span>}</label>;
}
