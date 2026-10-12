export function formatMoney(value: { toString(): string } | string | number, currency: string) {
  const amount = Number(typeof value === "number" ? value : value.toString());
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: currency === "JPY" ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Amount whose digits roll up into place on first paint. The final value is the default state, so nothing hides if CSS fails. */
export function RollingAmount({ text, className = "" }: { text: string; className?: string }) {
  let digit = 0;
  return (
    <span className={`rolling-amount ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((char, index) => {
        const isDigit = /\d/.test(char);
        if (isDigit) digit++;
        return (
          <span key={index} aria-hidden className={isDigit ? "roll-digit" : "roll-static"} style={isDigit ? ({ "--i": digit } as React.CSSProperties) : undefined}>
            {char}
          </span>
        );
      })}
    </span>
  );
}

export function MoneyStack({ values, roll = false }: { values: Record<string, string>; roll?: boolean }) {
  const entries = Object.entries(values);
  if (!entries.length) return <strong className="money money-empty">—</strong>;
  return (
    <>
      {entries.map(([currency, value]) => (
        <strong key={currency} className="money">
          {roll ? <RollingAmount text={formatMoney(value, currency)} /> : formatMoney(value, currency)}
        </strong>
      ))}
    </>
  );
}
