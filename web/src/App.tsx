import { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  CheckCircle2,
  CircleHelp,
  Home,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scheduleToAnnualChart, validateMortgageDraft } from "./domain/mortgage";
import { calculateScenario } from "./domain/rules";
import type { ExistingDebtDraft, MortgageDraft, ScenarioResult } from "./domain/types";
import { formatNok, moneyOreToNok } from "./format";

const initialDraft: MortgageDraft = {
  purchasePriceNok: "4500000",
  purchaseCostsNok: "112500",
  ownFundsNok: "700000",
  annualRatePercent: "5.2",
  termYears: "25",
  repaymentType: "annuity",
  rateType: "variable",
  annualIncomeNok: "1050000",
  monthlyNetIncomeNok: "70000",
  monthlyLivingExpensesNok: "29000",
  debts: [],
};

const initialAlternative = {
  termYears: "30",
  annualRatePercent: "5.7",
  ownFundsNok: "950000",
};

function evaluate(draft: MortgageDraft): ScenarioResult | undefined {
  const validation = validateMortgageDraft(draft);
  return validation.input ? calculateScenario(validation.input) : undefined;
}

function alternativeDraft(draft: MortgageDraft, alternative: typeof initialAlternative): MortgageDraft {
  return {
    ...draft,
    termYears: alternative.termYears,
    annualRatePercent: alternative.annualRatePercent,
    ownFundsNok: alternative.ownFundsNok,
  };
}

type ComparisonPoint = {
  year: number;
  currentPrincipal?: number;
  currentInterest?: number;
  alternativePrincipal?: number;
  alternativeInterest?: number;
  currentBalance?: number;
  currentCumulative?: number;
  alternativeBalance?: number;
  alternativeCumulative?: number;
};

function comparisonPoints(current: ScenarioResult, alternative: ScenarioResult): ComparisonPoint[] {
  const points = new Map<number, ComparisonPoint>();
  const add = (result: ScenarioResult, scenario: "current" | "alternative") => {
    for (const point of scheduleToAnnualChart(result.schedule)) {
      const row = points.get(point.year) ?? { year: point.year };
      if (scenario === "current") {
        row.currentPrincipal = point.principalPayment;
        row.currentInterest = point.interestPayment;
        row.currentBalance = point.remainingBalance;
        row.currentCumulative = point.cumulativePrincipal;
      } else {
        row.alternativePrincipal = point.principalPayment;
        row.alternativeInterest = point.interestPayment;
        row.alternativeBalance = point.remainingBalance;
        row.alternativeCumulative = point.cumulativePrincipal;
      }
      points.set(point.year, row);
    }
  };
  add(current, "current");
  add(alternative, "alternative");
  return [...points.values()].sort((left, right) => left.year - right.year);
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
  step = "any",
  min = "0",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  suffix?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className={`field${error ? " field-error" : ""}`} htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </span>
      {error && <span className="field-error-text" id={`${id}-error`}>{error}</span>}
    </label>
  );
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="range-field">
      <div className="range-heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="range-limits" aria-hidden="true"><span>{min.toLocaleString("nb-NO")}</span><span>{max.toLocaleString("nb-NO")}</span></div>
    </div>
  );
}

function RuleCard({ rule }: { rule: ScenarioResult["assessments"][number] }) {
  const Icon = rule.status === "withinLimit" ? CheckCircle2 : rule.status === "aboveLimit" ? AlertCircle : CircleHelp;
  const label = rule.status === "withinLimit" ? "Innenfor" : rule.status === "aboveLimit" ? "Avvik" : "Ikke vurdert";
  return (
    <article className={`rule-row rule-${rule.status}`}>
      <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
      <div className="rule-copy">
        <div className="rule-title-line"><h3>{rule.title}</h3><span className="rule-status">{label}</span></div>
        <p>{rule.detail}</p>
      </div>
      <div className="rule-value"><strong>{rule.value}</strong><span>{rule.limit}</span></div>
    </article>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label === 0 ? "Ved kjøp" : `År ${label}`}</strong>
      {payload.filter((item) => item.value !== undefined).map((item) => (
        <div key={item.name} className="tooltip-row"><span style={{ color: item.color }}>●</span>{item.name}<strong>{formatNok(item.value ?? 0)}</strong></div>
      ))}
    </div>
  );
}

function ComparisonCharts({ current, alternative }: { current: ScenarioResult; alternative: ScenarioResult }) {
  const points = comparisonPoints(current, alternative);
  const yFormatter = (value: number) => new Intl.NumberFormat("nb-NO", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  const commonProps = { data: points, accessibilityLayer: true, margin: { top: 12, right: 8, left: 2, bottom: 2 } };
  return (
    <>
      <section className="chart-section" aria-labelledby="payments-chart-title">
        <div className="chart-heading">
          <div><span className="eyebrow">01 / TERMINER</span><h3 id="payments-chart-title">Slik fordeles månedsbeløpet</h3></div>
          <span className="chart-unit">NOK per måned</span>
        </div>
        <div className="chart-legend" aria-label="Forklaring">
          <span><i className="legend-mark current-mark" /> Nåværende lån</span>
          <span><i className="legend-mark alternative-mark" /> Alternativt lån</span>
          <span><i className="legend-mark principal-mark" /> Avdrag</span>
          <span><i className="legend-mark interest-mark" /> Renter</span>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid stroke="#dce4de" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} tickCount={7} tickFormatter={(value) => `${value} år`} stroke="#7a8981" tickLine={false} axisLine={false} />
              <YAxis width={54} tickFormatter={yFormatter} stroke="#7a8981" tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="currentPrincipal" name="Nå: avdrag" stroke="#23725c" strokeWidth={2.2} dot={false} connectNulls />
              <Line type="monotone" dataKey="currentInterest" name="Nå: renter" stroke="#8aac85" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="alternativePrincipal" name="Alternativ: avdrag" stroke="#cc593e" strokeWidth={2.2} strokeDasharray="6 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="alternativeInterest" name="Alternativ: renter" stroke="#e6a45d" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-section" aria-labelledby="balance-chart-title">
        <div className="chart-heading">
          <div><span className="eyebrow">02 / EGENKAPITAL OVER TID</span><h3 id="balance-chart-title">Gjeld som gjenstår og avdrag som er betalt</h3></div>
          <span className="chart-unit">NOK</span>
        </div>
        <div className="chart-legend" aria-label="Forklaring">
          <span><i className="legend-mark current-mark" /> Nå: restgjeld</span>
          <span><i className="legend-mark current-cumulative" /> Nå: betalte avdrag</span>
          <span><i className="legend-mark alternative-mark" /> Alternativ: restgjeld</span>
          <span><i className="legend-mark alternative-cumulative" /> Alternativ: betalte avdrag</span>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid stroke="#dce4de" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} tickCount={7} tickFormatter={(value) => `${value} år`} stroke="#7a8981" tickLine={false} axisLine={false} />
              <YAxis width={54} tickFormatter={yFormatter} stroke="#7a8981" tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="currentBalance" name="Nå: restgjeld" stroke="#23725c" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="currentCumulative" name="Nå: betalte avdrag" stroke="#8aac85" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="alternativeBalance" name="Alternativ: restgjeld" stroke="#cc593e" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="alternativeCumulative" name="Alternativ: betalte avdrag" stroke="#e6a45d" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="data-table-details">
          <summary>Vis datapunktene som tabell</summary>
          <div className="table-scroll">
            <table>
              <caption>Årlige sammenligningspunkter. Beløp i NOK.</caption>
                <thead><tr><th scope="col">År</th><th scope="col">Nå: avdrag/mnd</th><th scope="col">Nå: renter/mnd</th><th scope="col">Nå: restgjeld</th><th scope="col">Nå: betalte avdrag</th><th scope="col">Alt.: avdrag/mnd</th><th scope="col">Alt.: renter/mnd</th><th scope="col">Alt.: restgjeld</th><th scope="col">Alt.: betalte avdrag</th></tr></thead>
                  <tbody>{points.map((point) => <tr key={point.year}><th scope="row">{point.year}</th><td>{point.currentPrincipal === undefined ? "–" : formatNok(point.currentPrincipal)}</td><td>{point.currentInterest === undefined ? "–" : formatNok(point.currentInterest)}</td><td>{point.currentBalance === undefined ? "–" : formatNok(point.currentBalance)}</td><td>{point.currentCumulative === undefined ? "–" : formatNok(point.currentCumulative)}</td><td>{point.alternativePrincipal === undefined ? "–" : formatNok(point.alternativePrincipal)}</td><td>{point.alternativeInterest === undefined ? "–" : formatNok(point.alternativeInterest)}</td><td>{point.alternativeBalance === undefined ? "–" : formatNok(point.alternativeBalance)}</td><td>{point.alternativeCumulative === undefined ? "–" : formatNok(point.alternativeCumulative)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
        <p className="chart-note">Egenkapital ved kjøp er et startbeløp. Grafen viser nedbetaling av lånet, ikke boligpris eller fremtidig markedsverdi.</p>
      </section>
    </>
  );
}

function DebtFields({
  debt,
  index,
  onChange,
  onRemove,
  errors,
}: {
  debt: ExistingDebtDraft;
  index: number;
  onChange: (patch: Partial<ExistingDebtDraft>) => void;
  onRemove: () => void;
  errors: Record<string, string>;
}) {
  const prefix = `debts.${index}`;
  return (
    <fieldset className="debt-block">
      <legend>Gjeld {index + 1}</legend>
      <button className="icon-button debt-remove" type="button" onClick={onRemove} aria-label={`Fjern gjeld ${index + 1}`} title="Fjern gjeld"><Trash2 size={16} /></button>
      <div className="field-grid field-grid-two">
        <Field id={`${prefix}-label`} label="Type gjeld" value={debt.label} onChange={(label) => onChange({ label })} step="1" />
        <Field id={`${prefix}-balance`} label="Saldo" suffix="kr" value={debt.balanceNok} onChange={(balanceNok) => onChange({ balanceNok })} error={errors[`${prefix}.balanceNok`]} />
        <Field id={`${prefix}-rate`} label="Rente" suffix="%" value={debt.interestRatePercent} onChange={(interestRatePercent) => onChange({ interestRatePercent })} error={errors[`${prefix}.interestRatePercent`]} />
        <Field id={`${prefix}-payment`} label="Terminbeløp" suffix="kr/mnd" value={debt.monthlyPaymentNok} onChange={(monthlyPaymentNok) => onChange({ monthlyPaymentNok })} error={errors[`${prefix}.monthlyPaymentNok`]} />
        <Field id={`${prefix}-term`} label="Gjenstående løpetid" suffix="år" value={debt.remainingTermYears} onChange={(remainingTermYears) => onChange({ remainingTermYears })} error={errors[`${prefix}.remainingTermYears`]} step="1" min="1" />
        <Field id={`${prefix}-limit`} label="Kredittramme" suffix="kr" value={debt.revolvingLimitNok} onChange={(revolvingLimitNok) => onChange({ revolvingLimitNok })} error={errors[`${prefix}.revolvingLimitNok`]} />
      </div>
      <label className="checkbox-row"><input type="checkbox" checked={debt.securedOnHome} onChange={(event) => onChange({ securedOnHome: event.target.checked })} /> Gjeld med pant i denne boligen, inkludert fellesgjeld</label>
    </fieldset>
  );
}

function defaultDebt(): ExistingDebtDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    balanceNok: "0",
    interestRatePercent: "0",
    monthlyPaymentNok: "0",
    remainingTermYears: "5",
    securedOnHome: false,
    revolvingLimitNok: "0",
  };
}

export default function App() {
  const [draft, setDraft] = useState(initialDraft);
  const [alternative, setAlternative] = useState(initialAlternative);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [calculated, setCalculated] = useState(() => ({ current: evaluate(initialDraft), alternative: evaluate(alternativeDraft(initialDraft, initialAlternative)) }));
  const [showAllRules, setShowAllRules] = useState(false);
  const [hasUncalculatedChanges, setHasUncalculatedChanges] = useState(false);

  function updateDraft<K extends keyof MortgageDraft>(field: K, value: MortgageDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setHasUncalculatedChanges(true);
  }

  function updateAlternative(field: keyof typeof initialAlternative, value: string) {
    setAlternative((currentValue) => ({ ...currentValue, [field]: value }));
    setHasUncalculatedChanges(true);
  }

  function updateDebt(id: string, patch: Partial<ExistingDebtDraft>) {
    updateDraft("debts", draft.debts.map((debt) => debt.id === id ? { ...debt, ...patch } : debt));
  }

  function handleCalculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentDraft = validateMortgageDraft(draft);
    const altDraft = validateMortgageDraft(alternativeDraft(draft, alternative));
    const nextIssues = { ...currentDraft.issues };
    for (const [key, value] of Object.entries(altDraft.issues)) {
      if (key === "ownFundsNok") nextIssues.alternativeOwnFundsNok = value;
      else if (key === "annualRatePercent") nextIssues.alternativeRate = value;
      else if (key === "termYears") nextIssues.alternativeTerm = value;
      else nextIssues[key] = value;
    }
    setIssues(nextIssues);
    if (!currentDraft.input || !altDraft.input) {
      setCalculated({ current: undefined, alternative: undefined });
      setHasUncalculatedChanges(false);
      document.getElementById("input-errors")?.focus();
      return;
    }
    setCalculated({
      current: calculateScenario(currentDraft.input),
      alternative: calculateScenario(altDraft.input),
    });
    setHasUncalculatedChanges(false);
  }

  function resetAll() {
    setDraft(initialDraft);
    setAlternative(initialAlternative);
    setIssues({});
    setCalculated({ current: evaluate(initialDraft), alternative: evaluate(alternativeDraft(initialDraft, initialAlternative)) });
    setHasUncalculatedChanges(false);
  }

  const current = calculated.current;
  const alt = calculated.alternative;
  const purchaseTotal = Number(draft.purchasePriceNok || 0) + Number(draft.purchaseCostsNok || 0);
  const maxOwnFunds = Math.max(Number(alternative.ownFundsNok), 1, Math.floor(purchaseTotal - 1));
  const requestedLoanNok = purchaseTotal - Number(draft.ownFundsNok || 0);
  const currentMonthly = current ? formatNok(moneyOreToNok(current.schedule.monthlyPaymentOre)) : "–";
  const altMonthly = alt ? formatNok(moneyOreToNok(alt.schedule.monthlyPaymentOre)) : "–";
  const visibleAssessments = current?.assessments.filter((rule) => showAllRules || rule.id !== "minimum-repayment") ?? [];
  const comparisonStatus = current && alt
    ? moneyOreToNok(alt.schedule.monthlyPaymentOre) - moneyOreToNok(current.schedule.monthlyPaymentOre)
    : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="Boligkompass, hjem">
          <span className="brand-mark"><Home size={18} strokeWidth={2.2} /></span>
          <span>bolig<span>kompass</span></span>
        </a>
        <div className="topbar-right"><span className="rule-stamp"><span className="status-dot" />Norske boliglånsregler · kontrollert 01.10.2026</span><a href="https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648" target="_blank" rel="noreferrer">Kilde <ArrowDownRight size={14} /></a></div>
      </header>

      <main id="top" className="page-shell">
        <section className="page-intro">
          <div><span className="eyebrow">BOLIGFINANSIERING / 01</span><h1>Hva tåler økonomien din?</h1><p>Utforsk lånet, egenkapitalen og hva en endring i rente eller løpetid betyr for månedsbeløpet.</p></div>
          <button className="text-button" type="button" onClick={resetAll}><RotateCcw size={15} /> Tilbakestill eksempel</button>
        </section>

        <form onSubmit={handleCalculate} noValidate>
          <div className="workspace-grid">
            <aside className="assumptions-panel" aria-label="Låneforutsetninger">
              <div className="panel-heading"><div><span className="eyebrow">FORUTSETNINGER</span><h2>Ditt boligkjøp</h2></div><span className="step-index">A</span></div>
              <section className="input-section" aria-labelledby="purchase-heading">
                <h3 id="purchase-heading">Kjøp og lån</h3>
                <div className="field-grid">
                  <Field id="purchase-price" label="Kjøpesum" value={draft.purchasePriceNok} suffix="kr" onChange={(value) => updateDraft("purchasePriceNok", value)} error={issues.purchasePriceNok} />
                  <Field id="purchase-costs" label="Omkostninger" value={draft.purchaseCostsNok} suffix="kr" onChange={(value) => updateDraft("purchaseCostsNok", value)} error={issues.purchaseCostsNok} />
                  <Field id="own-funds" label="Egenkapital" value={draft.ownFundsNok} suffix="kr" onChange={(value) => updateDraft("ownFundsNok", value)} error={issues.ownFundsNok} />
                  <div className="derived-loan"><span>Anslått lånebehov</span><strong>{requestedLoanNok > 0 ? formatNok(requestedLoanNok) : "Kontroller beløp"}</strong></div>
                </div>
                <div className="field-grid field-grid-two">
                  <Field id="interest-rate" label="Nominell rente" value={draft.annualRatePercent} suffix="%" onChange={(value) => updateDraft("annualRatePercent", value)} error={issues.annualRatePercent} step="0.01" />
                  <Field id="term-years" label="Løpetid" value={draft.termYears} suffix="år" onChange={(value) => updateDraft("termYears", value)} error={issues.termYears} step="1" min="1" />
                </div>
                <div className="segmented-field">
                  <span className="field-label">Nedbetalingsform</span>
                  <div className="segmented" role="group" aria-label="Nedbetalingsform">
                    <button type="button" aria-pressed={draft.repaymentType === "annuity"} onClick={() => updateDraft("repaymentType", "annuity")}>Annuitet</button>
                    <button type="button" aria-pressed={draft.repaymentType === "serial"} onClick={() => updateDraft("repaymentType", "serial")}>Serie</button>
                  </div>
                </div>
                <div className="segmented-field">
                  <span className="field-label">Rentetype</span>
                  <div className="segmented" role="group" aria-label="Rentetype">
                    <button type="button" aria-pressed={draft.rateType === "variable"} onClick={() => updateDraft("rateType", "variable")}>Flytende</button>
                    <button type="button" aria-pressed={draft.rateType === "fixed"} onClick={() => updateDraft("rateType", "fixed")}>Fast</button>
                  </div>
                </div>
              </section>

              <section className="input-section" aria-labelledby="income-heading">
                <h3 id="income-heading">Husholdning</h3>
                <div className="field-grid field-grid-two">
                  <Field id="annual-income" label="Brutto årsinntekt" value={draft.annualIncomeNok} suffix="kr" onChange={(value) => updateDraft("annualIncomeNok", value)} error={issues.annualIncomeNok} />
                  <Field id="net-income" label="Netto inntekt" value={draft.monthlyNetIncomeNok} suffix="kr/mnd" onChange={(value) => updateDraft("monthlyNetIncomeNok", value)} error={issues.monthlyNetIncomeNok} />
                  <Field id="living-expenses" label="Levekostnader" value={draft.monthlyLivingExpensesNok} suffix="kr/mnd" onChange={(value) => updateDraft("monthlyLivingExpensesNok", value)} error={issues.monthlyLivingExpensesNok} />
                </div>
              </section>

              <section className="input-section debt-section" aria-labelledby="debt-heading">
                <div className="section-title-line"><h3 id="debt-heading">Annen gjeld</h3><span className="optional-label">Valgfritt</span></div>
                <p className="section-hint">Oppgi saldo og eventuell kredittramme. Kredittrammer vurderes fullt utnyttet.</p>
                {draft.debts.map((debt, index) => (
                  <DebtFields key={debt.id} debt={debt} index={index} errors={issues} onChange={(patch) => updateDebt(debt.id, patch)} onRemove={() => updateDraft("debts", draft.debts.filter((item) => item.id !== debt.id))} />
                ))}
                <button className="add-debt-button" type="button" onClick={() => updateDraft("debts", [...draft.debts, defaultDebt()])}><Plus size={15} /> Legg til gjeld</button>
              </section>

              <section className="input-section alternative-section" aria-labelledby="alternative-heading">
                <div className="panel-heading compact-heading"><div><span className="eyebrow">SAMMENLIGN</span><h2 id="alternative-heading">Endre ett valg</h2></div><span className="step-index step-index-alt">B</span></div>
                <p className="section-hint">Sammenlign dagens forutsetninger med et alternativ.</p>
                <RangeField id="alternative-term" label="Løpetid" value={Number(alternative.termYears)} min={5} max={40} step={1} display={`${alternative.termYears} år`} onChange={(termYears) => updateAlternative("termYears", termYears)} />
                <Field id="alternative-term-number" label="Alternativ løpetid" value={alternative.termYears} suffix="år" onChange={(termYears) => updateAlternative("termYears", termYears)} error={issues.alternativeTerm} step="1" min="1" />
                <RangeField id="alternative-rate" label="Rente" value={Number(alternative.annualRatePercent)} min={0} max={12} step={0.05} display={`${alternative.annualRatePercent} %`} onChange={(annualRatePercent) => updateAlternative("annualRatePercent", annualRatePercent)} />
                <Field id="alternative-rate-number" label="Alternativ rente" value={alternative.annualRatePercent} suffix="%" onChange={(annualRatePercent) => updateAlternative("annualRatePercent", annualRatePercent)} error={issues.alternativeRate} step="0.05" />
                <RangeField id="alternative-equity" label="Egenkapital" value={Number(alternative.ownFundsNok)} min={0} max={maxOwnFunds} step={10000} display={formatNok(Number(alternative.ownFundsNok))} onChange={(ownFundsNok) => updateAlternative("ownFundsNok", ownFundsNok)} />
                <Field id="alternative-equity-number" label="Alternativ egenkapital" value={alternative.ownFundsNok} suffix="kr" onChange={(ownFundsNok) => updateAlternative("ownFundsNok", ownFundsNok)} error={issues.alternativeOwnFundsNok} />
              </section>

              <button className="calculate-button" type="submit"><span>Beregn sammenligning</span><ArrowDownRight size={18} /></button>
              {Object.keys(issues).length > 0 && <div className="validation-summary" id="input-errors" tabIndex={-1} role="alert"><AlertCircle size={16} /> Kontroller feltene som er markert før du beregner.</div>}
              <p className="privacy-note"><CircleHelp size={14} /> Opplysningene behandles lokalt i nettleseren og lagres ikke.</p>
            </aside>

            <div className="results-panel">
              {current && alt ? (
                <>
                  <section className="result-lead" aria-live="polite">
                    <div><span className="eyebrow">ESTIMERT TERMINBELØP</span><div className="payment-pair"><div><span>Nå</span><strong>{currentMonthly}</strong><small>per måned</small></div><div className="comparison-delta"><span>Alternativ</span><strong>{altMonthly}</strong><small>{comparisonStatus >= 0 ? "+" : "−"}{formatNok(Math.abs(comparisonStatus))} / mnd</small></div></div></div>
                    <div className="lead-note"><span className="step-index">01</span><p>Beløpet er et estimat for renter og avdrag. Gebyrer og bankens vilkår kommer i tillegg.</p></div>
                  </section>
                  {hasUncalculatedChanges && <p className="stale-results" role="status">Forutsetningene er endret. Beregn på nytt for å oppdatere sammenligningen.</p>}

                  <section className="summary-strip" aria-label="Sammenligning av låneforutsetninger">
                    <div><span>Nå / lånebehov</span><strong>{current ? formatNok(moneyOreToNok(current.schedule.principalOre)) : "–"}</strong><small>{draft.termYears} år · {draft.annualRatePercent} %</small></div>
                    <div><span>Alternativ / lånebehov</span><strong>{formatNok(moneyOreToNok(alt.schedule.principalOre))}</strong><small>{alternative.termYears} år · {alternative.annualRatePercent} %</small></div>
                    <div><span>Egenkapital ved kjøp</span><strong>{formatNok(Number(draft.ownFundsNok || 0))}</strong><small>Alternativ: {formatNok(Number(alternative.ownFundsNok || 0))}</small></div>
                  </section>

                  <div className="visualization-heading"><div><span className="eyebrow">LÅNEBANER</span><h2>To mulige veier videre</h2></div><span className="data-tag">Planlagt nedbetaling</span></div>
                  <ComparisonCharts current={current} alternative={alt} />

                  <section className="rule-panel" aria-labelledby="rules-heading">
                    <div className="section-title-line rule-panel-heading"><div><span className="eyebrow">REGELINDIKATORER</span><h2 id="rules-heading">En første kontroll</h2></div><button className="text-button" type="button" onClick={() => setShowAllRules((shown) => !shown)}>{showAllRules ? "Vis færre" : "Vis alle"}</button></div>
                    <p className="section-hint">Indikatorene er en forenklet beregning, ikke et lånetilsagn.</p>
                    <div className="rule-list">{visibleAssessments.map((rule) => <RuleCard key={rule.id} rule={rule} />)}</div>
                    <div className="rule-disclaimer"><AlertCircle size={16} /><p>Banken vurderer hele økonomien din. Kjøpesummen brukes som anslag på boligverdi. Fellesgjeld, tilleggssikkerhet, refinansiering, fleksibilitetskvoter og individuelle levekostnader kan endre utfallet.</p></div>
                    <a className="source-link" href="https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648" target="_blank" rel="noreferrer">Se utlånsforskriften på Lovdata <ArrowDownRight size={14} /></a>
                  </section>
                </>
              ) : (
                <section className="empty-results" aria-live="polite"><AlertCircle size={24} /><h2>Kontroller forutsetningene</h2><p>Resultatene vises når alle nødvendige beløp og vilkår er gyldige.</p></section>
              )}
            </div>
          </div>
        </form>

        <footer className="page-footer"><span>Boligkompass · Uavhengig overslag</span><span>Ikke et tilbud om lån</span></footer>
      </main>
    </div>
  );
}