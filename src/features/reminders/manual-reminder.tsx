"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Send } from "lucide-react";
import { toast } from "@/components/toaster";

export function ManualReminder({ invoiceId, invoiceNumber, clientName, balance, dueDate, businessName }: { invoiceId: string; invoiceNumber: string; clientName: string; balance: string; dueDate: string; businessName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState("FRIENDLY");
  const [subject, setSubject] = useState(`Payment reminder for ${invoiceNumber}`);
  const [message, setMessage] = useState(`Hi ${clientName},\n\nThis is a reminder that ${invoiceNumber} has a remaining balance of ${balance}, due ${dueDate}. Please let us know when payment has been arranged.\n\nThank you,\n${businessName}`);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/reminders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tone, subject, message }) });
      const body = await response.json();
      const result = response.ok ? (body.delivered ? "Reminder accepted for delivery." : "Reminder recorded, but delivery failed.") : body.error;
      setStatus(result);
      if (response.ok) {
        toast(body.delivered ? `Follow-up sent to ${clientName}.` : "Reminder recorded, delivery failed.", body.delivered ? "success" : "error");
        if (body.delivered) setOpen(false);
        router.refresh();
      }
    } catch {
      setStatus("Reminder could not be sent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <div>
        <button className="button secondary" onClick={() => setOpen(true)}>
          <BellRing size={16} aria-hidden />
          Follow up
        </button>
        {status && <p role="status" className="sr-only">{status}</p>}
      </div>
    );
  return (
    <div className="inline-form reminder-compose">
      <div className="tone-picker" role="radiogroup" aria-label="Tone">
        {[["FRIENDLY", "Friendly"], ["PROFESSIONAL", "Professional"], ["FIRM", "Firm"]].map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={tone === value} className={tone === value ? "is-active" : undefined} onClick={() => setTone(value)}>{label}</button>
        ))}
      </div>
      <label>Subject<input value={subject} maxLength={200} onChange={(event) => setSubject(event.target.value)} /></label>
      <label>Message<textarea value={message} rows={7} maxLength={4000} onChange={(event) => setMessage(event.target.value)} /></label>
      <div className="detail-actions">
        <button className="button primary" disabled={busy} onClick={send}><Send size={16} aria-hidden />{busy ? "Sending…" : "Send reminder"}</button>
        <button className="button secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {status && <p role="status" className="notice">{status}</p>}
    </div>
  );
}
