"use client";
import { FormEvent, useState } from "react";
export function PublicPaymentActions({
  token,
  balance,
  currency,
}: {
  token: string;
  balance: string;
  currency: string;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(path: string, body: object) {
    setError("");
    const response = await fetch(`/api/public/invoices/${token}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setError(
        ((await response.json()) as { error?: string }).error ??
          "Could not submit.",
      );
      return;
    }
    setMessage(
      path === "payment-confirmations"
        ? "Payment confirmation submitted for review."
        : "Payment date saved. The business has been notified.",
    );
  }
  function confirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit("payment-confirmations", {
      amount: data.get("amount"),
      method: data.get("method"),
      reference: data.get("reference"),
      paidAt: data.get("paidAt"),
      message: data.get("message"),
      idempotencyKey: crypto.randomUUID(),
    });
  }
  function promise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit("payment-promises", {
      promisedFor: data.get("promisedFor"),
      note: data.get("note"),
    });
  }
  return (
    <section className="public-payment-actions">
      <div>
        <h2>Already paid?</h2>
        <p>
          Tell the business about an external payment. This remains pending
          until reviewed.
        </p>
        <form onSubmit={confirmation}>
          <label>
            Amount ({currency})
            <input
              name="amount"
              defaultValue={balance}
              inputMode="decimal"
              required
            />
          </label>
          <label>
            Payment method
            <input name="method" required maxLength={100} />
          </label>
          <label>
            Reference number
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
            Message
            <textarea name="message" rows={2} />
          </label>
          <button className="button primary">
            Submit payment confirmation
          </button>
        </form>
      </div>
      <div>
        <h2>I will pay on…</h2>
        <form onSubmit={promise}>
          <label>
            Promised date
            <input name="promisedFor" type="date" required />
          </label>
          <label>
            Note
            <textarea name="note" rows={2} />
          </label>
          <button className="button secondary">Save payment promise</button>
        </form>
      </div>
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </section>
  );
}
