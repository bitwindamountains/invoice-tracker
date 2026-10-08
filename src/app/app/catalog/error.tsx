"use client";
export default function CatalogError({ reset }: { reset: () => void }) { return <div className="state-page"><span className="eyebrow">SOMETHING WENT WRONG</span><h1>Catalog could not be loaded.</h1><button className="button primary" onClick={reset}>Try again</button></div>; }
