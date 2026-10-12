"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { ArrowUpRight, FilePlus2, Menu, Plus, ReceiptText, Search, UserPlus, Wallet, X } from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { SignOut } from "@/components/sign-out";
import { CommandPalette } from "./command-palette";
import { isActive, mobileNav, primaryNav, secondaryNav, type NavItem } from "./nav";

type Counts = { attention: number; inbox: number };

function NavLink({ item, pathname, counts, onNavigate }: { item: NavItem; pathname: string; counts: Counts; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  const count = item.badge ? counts[item.badge] : 0;
  const Icon = item.icon;
  return (
    <Link className={`nav-link${active ? " is-active" : ""}`} href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <Icon size={18} aria-hidden />
      <span>{item.label}</span>
      {count > 0 && (
        <>
          <span className={`nav-count${item.badge === "attention" ? " is-urgent" : ""}`} aria-hidden>{count}</span>
          <span className="sr-only">, {count} {item.badge === "attention" ? "need attention" : "waiting"}</span>
        </>
      )}
    </Link>
  );
}

const createItems = [
  { href: "/app/invoices/new", label: "Invoice", hint: "Draft and send", icon: FilePlus2 },
  { href: "/app/clients/new", label: "Client", hint: "Add who you bill", icon: UserPlus },
  { href: "/app/expenses", label: "Expense", hint: "Record a cost", icon: ReceiptText },
  { href: "/app/get-paid", label: "Payment", hint: "From an open invoice", icon: Wallet },
];

function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="quick-create" ref={ref}>
      <button className="button primary quick-create-trigger" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        <Plus size={17} aria-hidden className="quick-create-plus" />
        New
      </button>
      {open && (
        <div className="menu-popover" role="menu" aria-label="Create new">
          {createItems.map(({ href, label, hint, icon: Icon }) => (
            <Link key={label} role="menuitem" href={href} onClick={() => setOpen(false)}>
              <span className="menu-icon"><Icon size={17} aria-hidden /></span>
              <span><strong>{label}</strong><small>{hint}</small></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ businessName, userName, counts, children }: { businessName: string; userName: string; counts: Counts; children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const dialog = moreRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  const initials = businessName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "IT";
  const moreActive = [...primaryNav.slice(4), ...secondaryNav].some((item) => isActive(pathname, item.href));

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="sidebar-brand" href="/app" aria-label="Invoice Tracker dashboard">
          <span className="brand-mark"><ArrowUpRight size={20} strokeWidth={2.5} /></span>
          <span>invoice<span className="brand-light">tracker</span></span>
        </Link>
        <div className="workspace-chip" title={businessName}>
          <span className="workspace-avatar" aria-hidden>{initials}</span>
          <span><strong>{businessName}</strong><small>{userName}</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          {primaryNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} counts={counts} />)}
        </nav>
        <nav className="sidebar-nav sidebar-secondary" aria-label="Workspace">
          {secondaryNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} counts={counts} />)}
        </nav>
        <div className="sidebar-foot"><SignOut /></div>
      </aside>
      <div className="shell-main">
        <AmbientBackground variant="quiet" />
        <header className="topbar">
          <Link className="topbar-brand" href="/app" aria-label="Invoice Tracker dashboard">
            <span className="brand-mark"><ArrowUpRight size={18} strokeWidth={2.5} /></span>
          </Link>
          <button className="search-trigger" onClick={() => setPaletteOpen(true)} aria-haspopup="dialog">
            <Search size={17} aria-hidden />
            <span>Search clients, invoices…</span>
            <kbd>⌘K</kbd>
          </button>
          <QuickCreate />
        </header>
        <div className="shell-content">
          <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
            <div>{children}</div>
          </ViewTransition>
        </div>
      </div>
      <nav className="mobile-tabbar" aria-label="Mobile">
        {mobileNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
              <span className="tab-icon"><Icon size={20} aria-hidden />{count > 0 && <><i className="tab-dot" aria-hidden /><span className="sr-only">, {count} need attention</span></>}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button className={moreActive ? "is-active" : undefined} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
          <span className="tab-icon"><Menu size={20} aria-hidden />{counts.inbox > 0 && <><i className="tab-dot" aria-hidden /><span className="sr-only">, {counts.inbox} confirmations waiting</span></>}</span>
          <span>More</span>
        </button>
      </nav>
      <dialog ref={moreRef} className="sheet" aria-label="More navigation" onClose={() => setMoreOpen(false)} onClick={(event) => event.target === event.currentTarget && setMoreOpen(false)}>
        <div className="sheet-body">
          <div className="sheet-head">
            <strong>{businessName}</strong>
            <button className="icon-button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X size={18} /></button>
          </div>
          <nav className="sheet-nav" aria-label="More">
            {[...primaryNav.slice(4), ...secondaryNav].map((item) => <NavLink key={item.href} item={item} pathname={pathname} counts={counts} onNavigate={() => setMoreOpen(false)} />)}
          </nav>
          <SignOut />
        </div>
      </dialog>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
