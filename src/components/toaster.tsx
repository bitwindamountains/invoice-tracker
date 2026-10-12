"use client";
import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" };
const EVENT = "app:toast";

export function toast(message: string, tone: Toast["tone"] = "success") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let next = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onToast = (event: Event) => {
      const { message, tone } = (event as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++next;
      setItems((current) => [...current.slice(-2), { id, message, tone }]);
      const timer = setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
        timers.delete(timer);
      }, 4200);
      timers.add(timer);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      timers.forEach(clearTimeout);
    };
  }, []);
  // aria-live without role="status" so page-level status messages stay unique for assistive tech and tests.
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.tone}`}>
          {item.tone === "success" ? <CircleCheck size={17} aria-hidden /> : <CircleAlert size={17} aria-hidden />}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
