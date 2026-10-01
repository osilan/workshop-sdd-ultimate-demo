import { calculateAnnuityPaymentOre, calculateSchedule, requestedLoanOre } from "./mortgage";
import type { MortgageInput, RuleAssessment, ScenarioResult } from "./types";

function statusDetail(status: RuleAssessment["status"]): string {
  if (status === "withinLimit") return "Innenfor den viste grensen";
  if (status === "aboveLimit") return "Overskrider eller oppfyller ikke den viste grensen";
  return "Kan ikke vurderes med opplysningene som er lagt inn";
}

function assessment(
  id: string,
  title: string,
  status: RuleAssessment["status"],
  value: string,
  limit: string,
  explanation: string,
): RuleAssessment {
  return { id, title, status, value, limit, detail: `${statusDetail(status)}. ${explanation}` };
}

export function assessNorwegianRules(input: MortgageInput): RuleAssessment[] {
  const loanOre = requestedLoanOre(input);
  const securedDebtOre = input.debts
    .filter((debt) => debt.securedOnHome)
    .reduce((total, debt) => total + (debt.revolvingLimitOre > debt.balanceOre ? debt.revolvingLimitOre : debt.balanceOre), 0n);
  const totalSecuredOre = loanOre + securedDebtOre;
  const totalDebtOre = loanOre + input.debts.reduce((total, debt) => {
    return total + debt.balanceOre;
  }, 0n);
  const ltvWithinLimit = totalSecuredOre * 100n <= input.purchasePriceOre * 90n;
  const debtRatioWithinLimit = totalDebtOre <= input.annualIncomeOre * 5n;
  const ltvPercent = Number(totalSecuredOre) / Number(input.purchasePriceOre) * 100;
  const debtRatio = Number(totalDebtOre) / Number(input.annualIncomeOre);

  const loanToValue = assessment(
    "ltv",
    "Belåningsgrad",
    ltvWithinLimit ? "withinLimit" : "aboveLimit",
    `${ltvPercent.toFixed(1)} %`,
    "Maks. 90 %",
    "Kjøpesum brukes som anslag på forsiktig verdigrunnlag. Oppgitt fellesgjeld og annen gjeld med pant regnes med; tilleggssikkerhet er ikke modellert.",
  );

  const debtToIncome = assessment(
    "debt-to-income",
    "Samlet gjeldsgrad",
    debtRatioWithinLimit ? "withinLimit" : "aboveLimit",
    `${debtRatio.toFixed(2)} × årsinntekt`,
    "Maks. 5 ×",
    "Oppgitt gjeldssaldo og lånebehov sammenlignes med brutto årsinntekt. Kredittrammer brukes fullt ut i betjeningsevnevurderingen.",
  );

  const stressRateBps = Math.max(input.annualRateBps + 300, 700);
  const stressedMortgageSchedule = calculateSchedule({ ...input, annualRateBps: stressRateBps });
  const stressedMortgagePayment = stressedMortgageSchedule.periods[0]?.paymentOre ?? 0n;
  const stressedDebtPayments = input.debts.reduce((total, debt) => {
    const stressedRate = Math.max(debt.interestRateBps + 300, 700);
    const assessedExposure = debt.revolvingLimitOre > debt.balanceOre ? debt.revolvingLimitOre : debt.balanceOre;
    const currentInterest = Number(debt.balanceOre) * debt.interestRateBps / 120_000;
    const stressedInterest = Number(assessedExposure) * stressedRate / 120_000;
    return total + debt.monthlyPaymentOre + BigInt(Math.max(0, Math.round(stressedInterest - currentInterest)));
  }, 0n);
  const monthlySurplusOre = input.monthlyNetIncomeOre - input.monthlyLivingExpensesOre - stressedMortgagePayment - stressedDebtPayments;
  const affordability = input.rateType === "fixed"
    ? assessment("affordability", "Betjeningsevne", "unableToAssess", "Ikke vurdert", "Rente + 3 pp, minst 7 %", "Renten ved utløpet av fastrenteperioden må vurderes særskilt.")
    : assessment(
      "affordability",
      "Betjeningsevne",
      monthlySurplusOre >= 0n ? "withinLimit" : "aboveLimit",
      `${Number(monthlySurplusOre / 100n).toLocaleString("nb-NO")} kr/mnd`,
      `Minst 0 kr ved ${ (stressRateBps / 100).toFixed(2) } % stressrente`,
      "Estimert netto månedsbeløp etter levekostnader og stressede terminbeløp.",
    );

  const schedule = calculateSchedule(input);
  const principalFirstYear = schedule.periods
    .slice(0, 12)
    .reduce((total, period) => total + period.principalOre, 0n);
  const ltvAboveAmortizationThreshold = totalSecuredOre * 100n > input.purchasePriceOre * 60n;
  let repayment: RuleAssessment;
  if (!ltvAboveAmortizationThreshold) {
    repayment = assessment("minimum-repayment", "Avdragskrav", "withinLimit", "Ikke utløst", "Belåningsgrad maks. 60 %", "Dette særskilte minstekravet gjelder ikke ved belåningsgrad på 60 % eller lavere.");
  } else {
    const thirtyYearPayment = calculateAnnuityPaymentOre(loanOre, input.annualRateBps, 360);
    const thirtyYearSchedule = calculateSchedule({ ...input, termMonths: 360, repaymentType: "annuity" });
    const thirtyYearPrincipalFirstYear = thirtyYearSchedule.periods
      .slice(0, 12)
      .reduce((total, period) => total + period.principalOre, 0n);
    const twoPointFivePercent = loanOre * 25n / 1000n;
    const minimumAnnualPrincipal = twoPointFivePercent < thirtyYearPrincipalFirstYear ? twoPointFivePercent : thirtyYearPrincipalFirstYear;
    repayment = assessment(
      "minimum-repayment",
      "Minste årlige avdrag",
      principalFirstYear >= minimumAnnualPrincipal ? "withinLimit" : "aboveLimit",
      `${Number(principalFirstYear / 100n).toLocaleString("nb-NO")} kr første år`,
      `Minst ${Number(minimumAnnualPrincipal / 100n).toLocaleString("nb-NO")} kr første år`,
      `Minstekravet er det laveste av 2,5 % av lånet og avdragene i en 30-årig annuitetsplan ved ${ (input.annualRateBps / 100).toFixed(2) } %. Terminbeløp: ${Number(thirtyYearPayment / 100n).toLocaleString("nb-NO")} kr/mnd.`,
    );
  }

  return [loanToValue, debtToIncome, affordability, repayment];
}

export function calculateScenario(input: MortgageInput): ScenarioResult {
  return {
    input,
    schedule: calculateSchedule(input),
    assessments: assessNorwegianRules(input),
  };
}