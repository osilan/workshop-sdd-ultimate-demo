import type {
  ChartPoint,
  MortgageDraft,
  MortgageInput,
  MortgageSchedule,
  PaymentPeriod,
  ValidationResult,
} from "./types";

const MAX_RATE_BPS = 3_000;
const MAX_TERM_YEARS = 50;

export function parseNokToOre(raw: string): bigint | undefined {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return undefined;

  const nok = Number(normalized);
  if (!Number.isFinite(nok) || nok < 0) return undefined;
  const ore = Math.round(nok * 100);
  if (!Number.isSafeInteger(ore)) return undefined;
  return BigInt(ore);
}

function parseRateBps(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const percent = Number(raw.replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > MAX_RATE_BPS / 100) {
    return undefined;
  }
  return Math.round(percent * 100);
}

function requiredMoney(
  raw: string,
  key: string,
  label: string,
  issues: Record<string, string>,
  allowZero = true,
): bigint | undefined {
  const value = parseNokToOre(raw);
  if (value === undefined || (!allowZero && value === 0n)) {
    issues[key] = allowZero ? `Skriv inn et gyldig beløp for ${label}.` : `${label} må være større enn 0.`;
    return undefined;
  }
  return value;
}

export function validateMortgageDraft(draft: MortgageDraft): ValidationResult {
  const issues: Record<string, string> = {};
  const purchasePriceOre = requiredMoney(draft.purchasePriceNok, "purchasePriceNok", "kjøpesum", issues, false);
  const purchaseCostsOre = requiredMoney(draft.purchaseCostsNok, "purchaseCostsNok", "omkostninger", issues);
  const ownFundsOre = requiredMoney(draft.ownFundsNok, "ownFundsNok", "egenkapital", issues);
  const annualIncomeOre = requiredMoney(draft.annualIncomeNok, "annualIncomeNok", "brutto årsinntekt", issues, false);
  const monthlyNetIncomeOre = requiredMoney(draft.monthlyNetIncomeNok, "monthlyNetIncomeNok", "netto månedsinntekt", issues, false);
  const monthlyLivingExpensesOre = requiredMoney(draft.monthlyLivingExpensesNok, "monthlyLivingExpensesNok", "månedlige levekostnader", issues);
  const annualRateBps = parseRateBps(draft.annualRatePercent);
  if (annualRateBps === undefined) issues.annualRatePercent = "Renten må være mellom 0 og 30 prosent.";

  const years = Number(draft.termYears);
  if (!Number.isInteger(years) || years < 1 || years > MAX_TERM_YEARS) {
    issues.termYears = `Nedbetalingstiden må være fra 1 til ${MAX_TERM_YEARS} år.`;
  }

  if (purchasePriceOre !== undefined && purchaseCostsOre !== undefined && ownFundsOre !== undefined) {
    if (purchasePriceOre + purchaseCostsOre <= ownFundsOre) {
      issues.ownFundsNok = "Egenkapitalen må være lavere enn kjøpesum pluss omkostninger.";
    }
  }

  const debts = draft.debts.map((debt, index) => {
    const prefix = `debts.${index}`;
    const balanceOre = requiredMoney(debt.balanceNok, `${prefix}.balanceNok`, "saldo", issues);
    const monthlyPaymentOre = requiredMoney(debt.monthlyPaymentNok, `${prefix}.monthlyPaymentNok`, "terminbeløp", issues);
    const revolvingLimitOre = requiredMoney(debt.revolvingLimitNok || "0", `${prefix}.revolvingLimitNok`, "kredittramme", issues);
    const interestRateBps = parseRateBps(debt.interestRatePercent);
    const remainingYears = Number(debt.remainingTermYears);
    if (interestRateBps === undefined) issues[`${prefix}.interestRatePercent`] = "Oppgi en rente mellom 0 og 30 prosent.";
    if (!Number.isInteger(remainingYears) || remainingYears < 1 || remainingYears > MAX_TERM_YEARS) {
      issues[`${prefix}.remainingTermYears`] = "Gjenstående løpetid må være fra 1 til 50 år.";
    }
    if (balanceOre === undefined || monthlyPaymentOre === undefined || revolvingLimitOre === undefined || interestRateBps === undefined || !Number.isInteger(remainingYears) || remainingYears < 1 || remainingYears > MAX_TERM_YEARS) {
      return undefined;
    }
    return {
      label: debt.label.trim() || `Annen gjeld ${index + 1}`,
      balanceOre,
      monthlyPaymentOre,
      revolvingLimitOre,
      interestRateBps,
      remainingTermMonths: remainingYears * 12,
      securedOnHome: debt.securedOnHome,
    };
  });

  if (Object.keys(issues).length > 0 || purchasePriceOre === undefined || purchaseCostsOre === undefined || ownFundsOre === undefined || annualIncomeOre === undefined || monthlyNetIncomeOre === undefined || monthlyLivingExpensesOre === undefined || annualRateBps === undefined || !Number.isInteger(years) || years < 1 || years > MAX_TERM_YEARS || debts.some((debt) => debt === undefined)) {
    return { issues };
  }

  return {
    issues,
    input: {
      purchasePriceOre,
      purchaseCostsOre,
      ownFundsOre,
      annualRateBps,
      termMonths: years * 12,
      repaymentType: draft.repaymentType,
      rateType: draft.rateType,
      annualIncomeOre,
      monthlyNetIncomeOre,
      monthlyLivingExpensesOre,
      debts: debts as NonNullable<(typeof debts)[number]>[],
    },
  };
}

export function requestedLoanOre(input: MortgageInput): bigint {
  return input.purchasePriceOre + input.purchaseCostsOre - input.ownFundsOre;
}

function roundOre(amount: number): bigint {
  return BigInt(Math.round(amount));
}

export function calculateAnnuityPaymentOre(principalOre: bigint, annualRateBps: number, months: number): bigint {
  if (principalOre <= 0n || months <= 0) return 0n;
  const monthlyRate = annualRateBps / 10_000 / 12;
  if (monthlyRate === 0) return roundOre(Number(principalOre) / months);
  const principal = Number(principalOre);
  return roundOre(principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
}

export function calculateSchedule(input: MortgageInput): MortgageSchedule {
  const principalOre = requestedLoanOre(input);
  const periods: PaymentPeriod[] = [];
  let balanceOre = principalOre;
  let cumulativePrincipalOre = 0n;
  let totalInterestOre = 0n;
  let totalPaymentsOre = 0n;
  const monthlyRate = input.annualRateBps / 10_000 / 12;
  const fixedPaymentOre = input.repaymentType === "annuity"
    ? calculateAnnuityPaymentOre(principalOre, input.annualRateBps, input.termMonths)
    : undefined;

  for (let month = 1; month <= input.termMonths && balanceOre > 0n; month += 1) {
    const interestOre = roundOre(Number(balanceOre) * monthlyRate);
    const principalDue = input.repaymentType === "annuity"
      ? (fixedPaymentOre ?? 0n) - interestOre
      : principalOre / BigInt(input.termMonths) + (BigInt(month) <= principalOre % BigInt(input.termMonths) ? 1n : 0n);
    const principalPaymentOre = month === input.termMonths || principalDue >= balanceOre ? balanceOre : principalDue;
    const paymentOre = principalPaymentOre + interestOre;
    balanceOre -= principalPaymentOre;
    cumulativePrincipalOre += principalPaymentOre;
    totalInterestOre += interestOre;
    totalPaymentsOre += paymentOre;
    periods.push({
      month,
      paymentOre,
      principalOre: principalPaymentOre,
      interestOre,
      remainingBalanceOre: balanceOre,
      cumulativePrincipalOre,
    });
  }

  return {
    principalOre,
    monthlyPaymentOre: periods[0]?.paymentOre ?? 0n,
    totalInterestOre,
    totalPaymentsOre,
    periods,
  };
}

export function scheduleToAnnualChart(schedule: MortgageSchedule): ChartPoint[] {
  const points: ChartPoint[] = [{
    year: 0,
    month: 0,
    principalPayment: 0,
    interestPayment: 0,
    totalPayment: 0,
    cumulativePrincipal: 0,
    remainingBalance: Number(schedule.principalOre) / 100,
  }];

  for (let month = 12; month <= schedule.periods.length; month += 12) {
    const period = schedule.periods[month - 1];
    if (!period) continue;
    points.push({
      year: month / 12,
      month,
      principalPayment: Number(period.principalOre) / 100,
      interestPayment: Number(period.interestOre) / 100,
      totalPayment: Number(period.paymentOre) / 100,
      cumulativePrincipal: Number(period.cumulativePrincipalOre) / 100,
      remainingBalance: Number(period.remainingBalanceOre) / 100,
    });
  }

  const finalPeriod = schedule.periods.at(-1);
  if (finalPeriod && finalPeriod.month % 12 !== 0) {
    points.push({
      year: finalPeriod.month / 12,
      month: finalPeriod.month,
      principalPayment: Number(finalPeriod.principalOre) / 100,
      interestPayment: Number(finalPeriod.interestOre) / 100,
      totalPayment: Number(finalPeriod.paymentOre) / 100,
      cumulativePrincipal: Number(finalPeriod.cumulativePrincipalOre) / 100,
      remainingBalance: Number(finalPeriod.remainingBalanceOre) / 100,
    });
  }

  return points;
}