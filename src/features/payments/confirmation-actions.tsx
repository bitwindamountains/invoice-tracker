"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ConfirmationActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function act(action: "confirm" | "reject") {
    setPending(true);
    setError("");
    const response = await fetch(`/api/payment-confirmations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "confirm" ? { action } : { action, note: null },
      ),
    });
    if (!response.ok) {
      setError(
        ((await response.json()) as { error?: string }).error ??
          "Could not review confirmation.",
      );
      setPending(false);
      return;
    }
    router.refresh();
  }
  return (
    <div className="confirmation-actions">
      <button
        className="button secondary"
        disabled={pending}
        onClick={() => void act("reject")}
      >
        Reject
      </button>
      <button
        className="button primary"
        disabled={pending}
        onClick={() => void act("confirm")}
      >
        Confirm payment
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
