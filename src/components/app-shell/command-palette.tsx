"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, FilePlus2, FileText, Search, UserPlus, Users } from "lucide-react";
import { primaryNav, secondaryNav } from "./nav";

type Result = { id: string; group: string; label: string; detail?: string; href: string; icon: typeof FileText };

const actions: Result[] = [
  { id: "new-invoice", group: "Actions", label: "Create invoice", href: "/app/invoices/new", icon: FilePlus2 },
  { id: "new-client", group: "Actions", label: "Add client", href: "/app/clients/new", icon: UserPlus },
];
const pages: Result[] = [...primaryNav, ...secondaryNav].map((item) => ({ id: item.href, group: "Pages", label: item.label, href: item.href, icon: item.icon }));

function money(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const search = encodeURIComponent(term);
        const [invoices, clients] = await Promise.all([
          fetch(`/api/invoices?search=${search}`, { signal: controller.signal }).then((response) => (response.ok ? response.json() : { items: [] })),
          fetch(`/api/clients?search=${search}`, { signal: controller.signal }).then((response) => (response.ok ? response.json() : { items: [] })),
        ]);
        setRemote([
          ...(invoices.items ?? []).slice(0, 5).map((invoice: { id: string; invoiceNumber: string; clientName: string; total: string; currency: string; status: string }) => ({
            id: invoice.id, group: "Invoices", label: invoice.invoiceNumber, detail: `${invoice.clientName} · ${money(invoice.total, invoice.currency)}`, href: `/app/invoices/${invoice.id}`, icon: FileText,
          })),
          ...(clients.items ?? []).slice(0, 5).map((client: { id: string; name: string; company?: string | null; email: string }) => ({
            id: client.id, group: "Clients", label: client.name, detail: client.company || client.email, href: `/app/clients/${client.id}`, icon: Users,
          })),
        ]);
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setRemote([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const local = [...actions, ...pages].filter((item) => !term || item.label.toLowerCase().includes(term));
    return [...(term.length >= 2 ? remote : []), ...local];
  }, [query, remote]);
  const searching = loading && query.trim().length >= 2;

  const go = (item: Result | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  let lastGroup = "";
  return (
    <dialog ref={dialogRef} className="palette" aria-label="Search" onClose={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="palette-body">
        <label className="palette-input">
          <Search size={18} aria-hidden />
          <span className="sr-only">Search the workspace</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length >= 2) setLoading(true); }}
            placeholder="Search clients, invoices, references…"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
              if (event.key === "Enter") { event.preventDefault(); go(results[active]); }
            }}
          />
          {searching && <span className="palette-spinner" aria-label="Searching" />}
        </label>
        <ul id="palette-results" role="listbox" className="palette-results" aria-label="Results">
          {results.length === 0 && <li className="palette-empty">No matches for “{query}”. Try an invoice number or client name.</li>}
          {results.map((item, index) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={`${item.group}-${item.id}`} role="presentation">
                {heading && <span className="palette-group" role="presentation">{heading}</span>}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  className="palette-option"
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                >
                  <span className="menu-icon"><Icon size={16} aria-hidden /></span>
                  <span className="palette-text"><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>
                  {index === active && <CornerDownLeft size={15} aria-hidden className="palette-enter" />}
                </div>
              </li>
            );
          })}
        </ul>
        <footer className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></footer>
      </div>
    </dialog>
  );
}
