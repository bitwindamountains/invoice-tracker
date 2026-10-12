"use client";
import { toast } from "@/components/toaster";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function RecordPayment({
  invoiceId,
  balance,
  currency,
}: {
  invoiceId: string;
  balance: string;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: form.get("amount"),
        method: form.get("method"),
        reference: form.get("reference"),
        paidAt: form.get("paidAt"),
        note: form.get("note"),
      }),
    });
    if (!response.ok) {
      setError(
        ((await response.json()) as { error?: string }).error ??
          "Payment could not be recorded.",
      );
      setPending(false);
      return;
    }
    setOpen(false);
    toast("Payment recorded.");
    router.refresh();
  }
  return (
    <>
      {
        <button className="button primary" onClick={() => setOpen(true)}>
          Record payment
        </button>
      }
      {open && (
        <div className="dialog-backdrop">
          <form
            className="dialog-card payment-dialog"
            role="dialog"
            aria-label="Record payment"
            onSubmit={submit}
          >
            <h2>Record payment</h2>
            <p>
              Remaining balance: {currency} {balance}
            </p>
            <label>
              Amount
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={balance}
                required
              />
            </label>
            <label>
              Method
              <input
                name="method"
                maxLength={100}
                required
                placeholder="Bank transfer"
              />
            </label>
            <label>
              Reference (optional)
              <input name="reference" maxLength={200} />
            </label>
            <label>
              Payment date
              <input
                name="paidAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              Note (optional)
              <textarea name="note" rows={3} maxLength={1000} />
            </label>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={pending}>
                {pending ? "Recording…" : "Record payment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
