"use client";
export default function InvoicesError({ reset }: { reset: () => void }) { return <div className="state-page"><h1>Invoices could not be loaded.</h1><button className="button primary" onClick={reset}>Try again</button></div>; }
