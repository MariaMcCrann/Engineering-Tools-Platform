import type { ReactNode } from "react";

export const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";

export function Field({ label, value, unit, hint, onChange, placeholder, disabled }: {
  label: string; value: string; unit?: string; hint?: string; placeholder?: string; disabled?: boolean; onChange: (value: string) => void;
}) {
  return <label className="calc-field"><span>{label}</span><small>{hint ?? "\u00a0"}</small>
    <input type="number" step="any" min="0" value={value} placeholder={placeholder} disabled={disabled} onChange={event => onChange(event.target.value)} />
    {unit && <i>{unit}</i>}</label>;
}

export function Select({ label, value, onChange, children, hint }: { label: string; value: string; hint?: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="calc-field"><span>{label}</span><small>{hint ?? "\u00a0"}</small>
    <select data-report-option-label value={value} onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

export function Card({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{step}</b><h2>{title}</h2></div>{children}</section>;
}

export function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function Check({ ok, pass, fail, warn }: { ok: boolean | null; pass: string; fail: string; warn?: boolean }) {
  if (ok === null) return null;
  return <span className={ok ? "pass" : warn ? "warn" : "fail"}>{ok ? "✓ " + pass : (warn ? "! " : "✕ ") + fail}</span>;
}

export function TitleRow({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="title-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div></div>;
}

export function ResultHero({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <div className="result-hero result-main"><span>{label}</span>{" "}<strong>{value}</strong>{unit && <>{" "}<small>{unit}</small></>}</div>;
}
