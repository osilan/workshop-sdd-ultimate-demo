export type RepaymentType = "annuity" | "serial";
export type RateType = "variable" | "fixed";
export type AssessmentStatus = "withinLimit" | "aboveLimit" | "unableToAssess";

export interface ExistingDebtDraft {
  id: string;
  label: string;
  balanceNok: string;
  interestRatePercent: string;
  monthlyPaymentNok: string;
  remainingTermYears: string;
  securedOnHome: boolean;
  revolvingLimitNok: string;
}

export interface MortgageDraft {
  purchasePriceNok: string;
  purchaseCostsNok: string;
  ownFundsNok: string;
  annualRatePercent: string;
  termYears: string;
  repaymentType: RepaymentType;
  rateType: RateType;
  annualIncomeNok: string;
  monthlyNetIncomeNok: string;
  monthlyLivingExpensesNok: string;
  debts: ExistingDebtDraft[];
}

export interface MortgageInput {
  purchasePriceOre: bigint;
  purchaseCostsOre: bigint;
  ownFundsOre: bigint;
  annualRateBps: number;
  termMonths: number;
  repaymentType: RepaymentType;
  rateType: RateType;
  annualIncomeOre: bigint;
  monthlyNetIncomeOre: bigint;
  monthlyLivingExpensesOre: bigint;
  debts: ExistingDebt[];
}

export interface ExistingDebt {
  label: string;
  balanceOre: bigint;
  interestRateBps: number;
  monthlyPaymentOre: bigint;
  remainingTermMonths: number;
  securedOnHome: boolean;
  revolvingLimitOre: bigint;
}

export interface ValidationResult {
  input?: MortgageInput;
  issues: Record<string, string>;
}

export interface PaymentPeriod {
  month: number;
  paymentOre: bigint;
  principalOre: bigint;
  interestOre: bigint;
  remainingBalanceOre: bigint;
  cumulativePrincipalOre: bigint;
}

export interface MortgageSchedule {
  principalOre: bigint;
  monthlyPaymentOre: bigint;
  totalInterestOre: bigint;
  totalPaymentsOre: bigint;
  periods: PaymentPeriod[];
}

export interface RuleAssessment {
  id: string;
  title: string;
  status: AssessmentStatus;
  value: string;
  limit: string;
  detail: string;
}

export interface ScenarioResult {
  input: MortgageInput;
  schedule: MortgageSchedule;
  assessments: RuleAssessment[];
}

export interface ChartPoint {
  year: number;
  month: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  cumulativePrincipal: number;
  remainingBalance: number;
}