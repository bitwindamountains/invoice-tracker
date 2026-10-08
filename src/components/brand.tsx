import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Invoice Tracker home">
      <span className="brand-mark">
        <ArrowUpRight size={23} strokeWidth={2.5} />
      </span>
      invoice<span className="brand-light">tracker</span>
      <span className="brand-dot">.</span>
    </Link>
  );
}
