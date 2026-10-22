"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Palette,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import {
  supportedCountries,
  supportedCurrencies,
  supportedTimezones,
} from "./schema";
import type { BusinessSetupForm, PaymentInstructionForm } from "./types";

const steps = [
  { label: "Business", icon: ReceiptText },
  { label: "Branding", icon: Palette },
  { label: "Invoice defaults", icon: ReceiptText },
  { label: "Payment methods", icon: CreditCard },
];
const emptyPayment: PaymentInstructionForm = {
  name: "",
  accountName: "",
  accountReference: "",
  notes: "",
  enabled: true,
};

export function BusinessSetupWizard({
  initial,
  editing = false,
}: {
  initial: BusinessSetupForm;
  editing?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState(
    initial.hasLogo ? "/api/business/logo" : "",
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLFieldSetElement>(null);

  function update<K extends keyof BusinessSetupForm>(
    key: K,
    value: BusinessSetupForm[K],
  ) {
    setData((current) => ({ ...current, [key]: value }));
  }
  function validateStep() {
    const invalid = panel.current?.querySelector<HTMLElement>(":invalid");
    if (invalid) {
      invalid.focus();
      (invalid as HTMLInputElement).reportValidity?.();
      return false;
    }
    return true;
  }
  function next() {
    if (validateStep()) {
      setError("");
      setStep((current) => Math.min(current + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 512 * 1024
    ) {
      setError("Choose a PNG, JPEG, or WebP logo under 512 KB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setLogoDataUrl(value);
      setLogoPreview(value);
      setRemoveLogo(false);
      setError("");
    };
    reader.readAsDataURL(file);
  }
  function updatePayment(
    index: number,
    key: keyof PaymentInstructionForm,
    value: string | boolean,
  ) {
    update(
      "paymentInstructions",
      data.paymentInstructions.map((instruction, position) =>
        position === index ? { ...instruction, [key]: value } : instruction,
      ),
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep()) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, logoDataUrl, removeLogo }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Business settings could not be saved.");
        return;
      }
      // /app is dynamic, so replace() already fetches fresh data; an extra refresh() re-renders it and can swallow the next click.
      router.replace("/app");
    } catch {
      setError(
        "We couldn’t connect. Your information is still here; try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="setup-shell">
      <aside className="setup-progress">
        <span className="eyebrow">
          {editing ? "BUSINESS SETTINGS" : "QUICK SETUP"}
        </span>
        <h1>
          {editing
            ? "Keep your business details current."
            : "Set the stage for getting paid."}
        </h1>
        <p>
          {editing
            ? "These details become the defaults for future invoices."
            : "Four short steps give every future invoice a clear, consistent starting point."}
        </p>
        <ol>
          {steps.map(({ label, icon: Icon }, index) => (
            <li
              key={label}
              className={index === step ? "active" : index < step ? "done" : ""}
            >
              <span>
                {index < step ? <Check size={16} /> : <Icon size={16} />}
              </span>
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                aria-current={index === step ? "step" : undefined}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <form className="setup-form" onSubmit={submit}>
        <div className="setup-step-meta">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{steps[step].label}</span>
        </div>
        <fieldset ref={panel} className="setup-panel">
          <legend>
            {step === 0
              ? "Tell us about your business"
              : step === 1
                ? "Make it feel like yours"
                : step === 2
                  ? "Set your invoice defaults"
                  : "How can clients pay you?"}
          </legend>
          {step === 0 && (
            <>
              <p className="panel-intro">
                We’ll use these details on your invoices and receipts.
              </p>
              <div className="form-grid">
                <Text
                  label="Business name"
                  value={data.businessName}
                  onChange={(value) => update("businessName", value)}
                  required
                  maxLength={120}
                />
                <Text
                  label="Legal name (optional)"
                  value={data.legalName}
                  onChange={(value) => update("legalName", value)}
                  maxLength={160}
                />
                <Text
                  label="Owner name"
                  value={data.ownerName}
                  onChange={(value) => update("ownerName", value)}
                  required
                  maxLength={100}
                />
                <Text
                  label="Business email"
                  type="email"
                  value={data.businessEmail}
                  onChange={(value) => update("businessEmail", value)}
                  required
                  maxLength={254}
                />
                <Text
                  label="Phone (optional)"
                  type="tel"
                  value={data.phone}
                  onChange={(value) => update("phone", value)}
                  maxLength={40}
                />
                <Text
                  label="Address line 1"
                  value={data.addressLine1}
                  onChange={(value) => update("addressLine1", value)}
                  required
                  maxLength={200}
                />
                <Text
                  label="Address line 2 (optional)"
                  value={data.addressLine2}
                  onChange={(value) => update("addressLine2", value)}
                  maxLength={200}
                />
                <Text
                  label="City"
                  value={data.city}
                  onChange={(value) => update("city", value)}
                  required
                  maxLength={100}
                />
                <Text
                  label="Province / state (optional)"
                  value={data.provinceState}
                  onChange={(value) => update("provinceState", value)}
                  maxLength={100}
                />
                <Text
                  label="Postal code (optional)"
                  value={data.postalCode}
                  onChange={(value) => update("postalCode", value)}
                  maxLength={24}
                />
                <Select
                  label="Country"
                  value={data.country}
                  onChange={(value) => update("country", value)}
                  options={supportedCountries}
                />
                <Select
                  label="Default currency"
                  value={data.defaultCurrency}
                  onChange={(value) => update("defaultCurrency", value)}
                  options={supportedCurrencies.map(
                    (currency) => [currency, currency] as const,
                  )}
                />
                <Select
                  label="Time zone"
                  value={data.timezone}
                  onChange={(value) => update("timezone", value)}
                  options={supportedTimezones.map(
                    (timezone) => [timezone, timezone] as const,
                  )}
                  wide
                />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="panel-intro">
                Simple branding makes an invoice recognizable without getting in
                the way.
              </p>
              <div className="logo-field">
                <div
                  className="logo-preview"
                  style={{ backgroundColor: data.brandColor }}
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Business logo preview"
                      width={72}
                      height={72}
                      unoptimized
                    />
                  ) : (
                    <span>
                      {data.businessName.slice(0, 2).toUpperCase() || "IT"}
                    </span>
                  )}
                </div>
                <div>
                  <label className="button secondary upload-button">
                    Choose logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseLogo}
                    />
                  </label>
                  <p>PNG, JPEG, or WebP. Up to 512 KB.</p>
                  {logoPreview && (
                    <button
                      type="button"
                      className="text-button danger-text"
                      onClick={() => {
                        setLogoPreview("");
                        setLogoDataUrl(null);
                        setRemoveLogo(true);
                      }}
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Brand color
                  <div className="color-row">
                    <input
                      type="color"
                      value={data.brandColor}
                      onChange={(event) =>
                        update("brandColor", event.target.value.toUpperCase())
                      }
                    />
                    <input
                      value={data.brandColor}
                      onChange={(event) =>
                        update("brandColor", event.target.value.toUpperCase())
                      }
                      pattern="#[0-9A-Fa-f]{6}"
                      required
                      aria-label="Brand color hex value"
                    />
                  </div>
                </label>
                <Text
                  label="Website (optional)"
                  type="url"
                  value={data.website}
                  onChange={(value) => update("website", value)}
                  placeholder="https://yourbusiness.com"
                  maxLength={300}
                />
                <Area
                  label="Invoice footer (optional)"
                  value={data.invoiceFooter}
                  onChange={(value) => update("invoiceFooter", value)}
                  placeholder="Thank you for your business."
                  wide
                  maxLength={500}
                />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="panel-intro">
                You can adjust these values on individual invoices later.
              </p>
              <div className="form-grid">
                <Text
                  label="Payment terms (days)"
                  type="number"
                  value={String(data.defaultPaymentTermsDays)}
                  onChange={(value) =>
                    update("defaultPaymentTermsDays", Number(value))
                  }
                  min="0"
                  max="365"
                  required
                  maxLength={12}
                />
                <Text
                  label="Invoice prefix"
                  value={data.invoicePrefix}
                  onChange={(value) =>
                    update("invoicePrefix", value.toUpperCase())
                  }
                  pattern="[A-Z0-9-]{1,12}"
                  required
                  maxLength={40}
                />
                <Text
                  label="Starting invoice number"
                  type="number"
                  value={String(data.startingInvoiceNumber)}
                  onChange={(value) =>
                    update("startingInvoiceNumber", Number(value))
                  }
                  min="1"
                  max="999999999"
                  required
                />
                <Text
                  label="Tax label"
                  value={data.defaultTaxLabel}
                  onChange={(value) => update("defaultTaxLabel", value)}
                  required
                />
                <Text
                  label="Default tax rate (%)"
                  type="number"
                  value={data.defaultTaxRate}
                  onChange={(value) => update("defaultTaxRate", value)}
                  min="0"
                  max="100"
                  step="0.0001"
                  required
                />
                <div className="invoice-number-preview">
                  <span>First invoice</span>
                  <strong>
                    {data.invoicePrefix || "INV-"}
                    {Number.isFinite(data.startingInvoiceNumber)
                      ? data.startingInvoiceNumber
                      : 1001}
                  </strong>
                </div>
                <Area
                  label="Default notes (optional)"
                  value={data.defaultNotes}
                  onChange={(value) => update("defaultNotes", value)}
                  placeholder="Payment is due within the terms shown above."
                  wide
                  maxLength={2000}
                />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <p className="panel-intro">
                Add at least one method. Philippine options are supported, but
                every name is yours to define.
              </p>
              <div className="payment-list">
                {data.paymentInstructions.map((instruction, index) => (
                  <section className="payment-method" key={index}>
                    <div className="payment-method-head">
                      <h2>Method {index + 1}</h2>
                      {data.paymentInstructions.length > 1 && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove payment method ${index + 1}`}
                          onClick={() =>
                            update(
                              "paymentInstructions",
                              data.paymentInstructions.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="form-grid">
                      <Text
                        label="Method name"
                        value={instruction.name}
                        onChange={(value) =>
                          updatePayment(index, "name", value)
                        }
                        placeholder="Bank transfer, GCash, PayPal…"
                        required
                        maxLength={50}
                      />
                      <Text
                        label="Account name (optional)"
                        value={instruction.accountName}
                        maxLength={100}
                        onChange={(value) =>
                          updatePayment(index, "accountName", value)
                        }
                      />
                      <Text
                        label="Account number / reference (optional)"
                        value={instruction.accountReference}
                        maxLength={120}
                        onChange={(value) =>
                          updatePayment(index, "accountReference", value)
                        }
                      />
                      <Area
                        label="Instructions (optional)"
                        value={instruction.notes}
                        onChange={(value) =>
                          updatePayment(index, "notes", value)
                        }
                        placeholder="Include the invoice number in the transfer note."
                        maxLength={500}
                      />
                    </div>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={instruction.enabled}
                        onChange={(event) =>
                          updatePayment(index, "enabled", event.target.checked)
                        }
                      />
                      Show on new invoices
                    </label>
                  </section>
                ))}
              </div>
              {data.paymentInstructions.length < 8 && (
                <button
                  type="button"
                  className="button secondary add-method"
                  onClick={() =>
                    update("paymentInstructions", [
                      ...data.paymentInstructions,
                      { ...emptyPayment },
                    ])
                  }
                >
                  <Plus size={17} />
                  Add payment method
                </button>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p className="notice error setup-error" role="alert">
            {error}
          </p>
        )}
        <div className="setup-actions">
          {step > 0 ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setError("");
                setStep((current) => current - 1);
              }}
            >
              <ArrowLeft size={17} />
              Back
            </button>
          ) : (
            <span />
          )}
          {/* Distinct keys: reusing one element would turn Continue into a submit button mid-click and submit the form early. */}
          {step < steps.length - 1 ? (
            <button key="continue" type="button" className="button primary" onClick={next}>
              Continue
              <ArrowRight size={17} />
            </button>
          ) : (
            <button key="submit" type="submit" className="button primary" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save settings" : "Finish setup"}
              <Check size={17} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  pattern,
  min,
  max,
  step,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
      />
    </label>
  );
}
function Area({
  label,
  value,
  onChange,
  placeholder,
  wide,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wide?: boolean;
  maxLength?: number;
}) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={maxLength}
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  wide?: boolean;
}) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
