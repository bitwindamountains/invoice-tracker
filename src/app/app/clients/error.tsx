"use client";
export default function ClientsError({ reset }: { reset: () => void }) { return <div className="state-page"><span className="eyebrow">SOMETHING WENT WRONG</span><h1>Clients could not be loaded.</h1><p>Try the request again.</p><button className="button primary" onClick={reset}>Try again</button></div>; }
