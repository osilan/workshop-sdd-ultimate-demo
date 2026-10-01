import { describe, expect, it } from "vitest";
import sharedVectors from "./shared-vectors.json";
import { calculateAnnuityPaymentOre, calculateSchedule, parseNokToOre, requestedLoanOre, scheduleToAnnualChart, validateMortgageDraft } from "./mortgage";
import { assessNorwegianRules } from "./rules";
import type { MortgageDraft, MortgageInput } from "./types";

function input(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return {
    purchasePriceOre: 100_000_000n,
    purchaseCostsOre: 0n,
    ownFundsOre: 10_000_000n,
    annualRateBps: 450,
    termMonths: 360,
    repaymentType: "annuity",
    rateType: "variable",
    annualIncomeOre: 100_000_000n,
    monthlyNetIncomeOre: 600_000n,
    monthlyLivingExpensesOre: 200_000n,
    debts: [],
    ...overrides,
  };
}

function draft(): MortgageDraft {
  return {
    purchasePriceNok: "1000000",
    purchaseCostsNok: "25000",
    ownFundsNok: "225000",
    annualRatePercent: "4.5",
    termYears: "25",
    repaymentType: "annuity",
    rateType: "variable",
    annualIncomeNok: "900000",
    monthlyNetIncomeNok: "50000",
    monthlyLivingExpensesNok: "25000",
    debts: [],
  };
}

describe("mortgage input and amortization", () => {
  it("matches the Lean reference model's shared vectors", () => {
    for (const vector of sharedVectors.cases) {
      if (vector.kind === "annuityZeroRate") {
        if (typeof vector.principalOre !== "number" || typeof vector.termMonths !== "number" || typeof vector.expectedPaymentOre !== "number") {
          throw new Error("Invalid annuity vector shape");
        }
        expect(calculateAnnuityPaymentOre(BigInt(vector.principalOre), 0, vector.termMonths)).toBe(BigInt(vector.expectedPaymentOre));
      } else if (vector.kind === "loanToValue") {
        if (typeof vector.propertyValueOre !== "number" || typeof vector.loanOre !== "number" || typeof vector.expectedWithin !== "boolean") {
          throw new Error("Invalid loan-to-value vector shape");
        }
        const mortgage = input({
          purchasePriceOre: BigInt(vector.propertyValueOre),
          ownFundsOre: BigInt(vector.propertyValueOre - vector.loanOre),
        });
        const passes = assessNorwegianRules(mortgage).find((item) => item.id === "ltv")?.status === "withinLimit";
        expect(passes).toBe(vector.expectedWithin);
      } else if (vector.kind === "debtToIncome") {
        if (typeof vector.annualIncomeOre !== "number" || typeof vector.expectedWithin !== "boolean") {
          throw new Error("Invalid debt-to-income vector shape");
        }
        const mortgage = input({
          purchasePriceOre: 100_000_000n,
          ownFundsOre: 10_000_000n,
          annualIncomeOre: BigInt(vector.annualIncomeOre),
        });
        const passes = assessNorwegianRules(mortgage).find((item) => item.id === "debt-to-income")?.status === "withinLimit";
        expect(passes).toBe(vector.expectedWithin);
      }
    }
  });

  it("parses NOK decimals with either decimal separator", () => {
    expect(parseNokToOre("1 234,56")).toBe(123456n);
    expect(parseNokToOre("1234.56")).toBe(123456n);
    expect(parseNokToOre("-2")).toBeUndefined();
  });

  it("validates cross-field borrowing and returns typed input", () => {
    const result = validateMortgageDraft(draft());
    expect(result.issues).toEqual({});
    expect(result.input && requestedLoanOre(result.input)).toBe(80_000_000n);

    const invalid = validateMortgageDraft({ ...draft(), ownFundsNok: "2000000" });
    expect(invalid.input).toBeUndefined();
    expect(invalid.issues.ownFundsNok).toBeDefined();
  });

  it("requires an explicit interest rate, including when zero is intended", () => {
    const result = validateMortgageDraft({ ...draft(), annualRatePercent: "" });
    expect(result.input).toBeUndefined();
    expect(result.issues.annualRatePercent).toBeDefined();
  });

  it("fully amortizes an annuity schedule and conserves principal", () => {
    const schedule = calculateSchedule(input());
    expect(schedule.periods.at(-1)?.remainingBalanceOre).toBe(0n);
    expect(schedule.periods.reduce((sum, period) => sum + period.principalOre, 0n)).toBe(schedule.principalOre);
    expect(schedule.periods.reduce((sum, period) => sum + period.interestOre, 0n)).toBe(schedule.totalInterestOre);
  });

  it("fully amortizes a zero-rate serial schedule", () => {
    const schedule = calculateSchedule(input({ annualRateBps: 0, repaymentType: "serial", termMonths: 3 }));
    expect(schedule.periods.map((period) => period.principalOre)).toEqual([30_000_000n, 30_000_000n, 30_000_000n]);
    expect(schedule.totalInterestOre).toBe(0n);
    expect(schedule.periods.at(-1)?.remainingBalanceOre).toBe(0n);
  });

  it("raises the annuity payment with rate and lowers it with a longer term", () => {
    const principal = 90_000_000n;
    const shortTerm = calculateAnnuityPaymentOre(principal, 450, 240);
    const longTerm = calculateAnnuityPaymentOre(principal, 450, 360);
    const higherRate = calculateAnnuityPaymentOre(principal, 600, 360);
    expect(longTerm).toBeLessThan(shortTerm);
    expect(higherRate).toBeGreaterThan(longTerm);
  });

  it("builds chart points from the same schedule and reaches zero balance", () => {
    const points = scheduleToAnnualChart(calculateSchedule(input({ termMonths: 18 })));
    expect(points[0]?.remainingBalance).toBe(900_000);
    expect(points.at(-1)?.remainingBalance).toBe(0);
    expect(points.at(-1)?.year).toBe(1.5);
  });
});

describe("Norwegian mortgage rule indicators", () => {
  it("accepts exactly 90 percent LTV and flags the next krone above it", () => {
    const atLimit = input({ purchasePriceOre: 100_000_000n, ownFundsOre: 10_000_000n });
    const aboveLimit = input({ purchasePriceOre: 100_000_000n, ownFundsOre: 9_999_999n });
    expect(assessNorwegianRules(atLimit).find((item) => item.id === "ltv")?.status).toBe("withinLimit");
    expect(assessNorwegianRules(aboveLimit).find((item) => item.id === "ltv")?.status).toBe("aboveLimit");
  });

  it("accepts debt at exactly five times income and flags debt above it", () => {
    const atLimit = input({
      purchasePriceOre: 100_000_000n,
      ownFundsOre: 10_000_000n,
      annualIncomeOre: 18_000_000n,
    });
    const aboveLimit = input({
      ...atLimit,
      debts: [{ label: "Billån", balanceOre: 1n, interestRateBps: 500, monthlyPaymentOre: 1n, remainingTermMonths: 60, securedOnHome: false, revolvingLimitOre: 0n }],
    });
    expect(assessNorwegianRules(atLimit).find((item) => item.id === "debt-to-income")?.status).toBe("withinLimit");
    expect(assessNorwegianRules(aboveLimit).find((item) => item.id === "debt-to-income")?.status).toBe("aboveLimit");
  });

  it("marks fixed-rate stress assessment as unable to assess", () => {
    const fixedRate = input({ rateType: "fixed" });
    expect(assessNorwegianRules(fixedRate).find((item) => item.id === "affordability")?.status).toBe("unableToAssess");
  });

  it("uses outstanding balances for debt ratio but full revolving limits for servicing", () => {
    const creditLine = {
      label: "Kredittkort",
      balanceOre: 0n,
      interestRateBps: 0,
      monthlyPaymentOre: 0n,
      remainingTermMonths: 60,
      securedOnHome: false,
      revolvingLimitOre: 500_000_000n,
    };
    const withCreditLine = input({
      annualIncomeOre: 20_000_000n,
      monthlyNetIncomeOre: 3_000_000n,
      monthlyLivingExpensesOre: 1_000_000n,
      debts: [creditLine],
    });
    const assessments = assessNorwegianRules(withCreditLine);
    expect(assessments.find((item) => item.id === "debt-to-income")?.status).toBe("withinLimit");
    expect(assessments.find((item) => item.id === "affordability")?.status).toBe("aboveLimit");
  });

  it("stresses the selected repayment type", () => {
    const shared = {
      monthlyNetIncomeOre: 750_000n,
      monthlyLivingExpensesOre: 0n,
    };
    const annuity = assessNorwegianRules(input(shared)).find((item) => item.id === "affordability");
    const serial = assessNorwegianRules(input({ ...shared, repaymentType: "serial" })).find((item) => item.id === "affordability");
    expect(annuity?.status).toBe("withinLimit");
    expect(serial?.status).toBe("aboveLimit");
  });
});