import LeanSpec.Design
import LeanSpec.Snapshot
import MortgageCalculator.Requirements

open LeanSpec

namespace MortgageCalculator

public def inputContractDesign : DesignUnit := {
  id := systemInputContract.id
  interfaces := ⟨#[
    ⟨"MortgageInput", by native_decide⟩,
    ⟨"ValidationIssue", by native_decide⟩,
    ⟨"validateMortgageInput(input): ValidationIssue[]", by native_decide⟩
  ], by native_decide⟩
  functions := #[⟨"validateMortgageInput", by native_decide⟩]
  tests := ⟨#[
    ⟨"rejectNegativeAmounts", by native_decide⟩,
    ⟨"rejectZeroIncome", by native_decide⟩,
    ⟨"rejectNonPositiveBorrowing", by native_decide⟩
  ], by native_decide⟩
}

public def calculationCoreDesign : DesignUnit := {
  id := systemCalculationCore.id
  interfaces := ⟨#[
    ⟨"MoneyOre = bigint", by native_decide⟩,
    ⟨"RateBasisPoints = number", by native_decide⟩,
    ⟨"CalculationResult", by native_decide⟩,
    ⟨"calculateMortgage(input): CalculationResult", by native_decide⟩
  ], by native_decide⟩
  functions := #[
    ⟨"calculateAnnuitySchedule", by native_decide⟩,
    ⟨"calculateSerialSchedule", by native_decide⟩,
    ⟨"calculateMortgage", by native_decide⟩
  ]
  tests := ⟨#[
    ⟨"annuityZeroRateVector", by native_decide⟩,
    ⟨"annuityNonZeroRateVector", by native_decide⟩,
    ⟨"serialPrincipalTotalsToLoan", by native_decide⟩,
    ⟨"sameInputSameResult", by native_decide⟩,
    ⟨"roundingAtPaymentBoundary", by native_decide⟩
  ], by native_decide⟩
  theorems := #[
    ⟨"MortgageModel.annuityPrincipalConserved", by native_decide⟩,
    ⟨"MortgageModel.serialPrincipalConserved", by native_decide⟩
  ]
}

public def rulePolicyDesign : DesignUnit := {
  id := systemRulePolicy.id
  interfaces := ⟨#[
    ⟨"RuleSet", by native_decide⟩,
    ⟨"RuleAssessment", by native_decide⟩,
    ⟨"assessNorwegianRules(input, rules): RuleAssessment[]", by native_decide⟩
  ], by native_decide⟩
  functions := #[⟨"assessNorwegianRules", by native_decide⟩]
  tests := ⟨#[
    ⟨"loanToValueBoundaryCases", by native_decide⟩,
    ⟨"debtToIncomeBoundaryCases", by native_decide⟩,
    ⟨"stressRateUsesThreePointsOrSevenPercent", by native_decide⟩,
    ⟨"unsupportedCaseIsNotPassing", by native_decide⟩
  ], by native_decide⟩
  theorems := #[
    ⟨"MortgageModel.loanToValueClassificationSound", by native_decide⟩,
    ⟨"MortgageModel.debtToIncomeClassificationSound", by native_decide⟩
  ]
}

public def frontendDesign : DesignUnit := {
  id := systemFrontendContract.id
  surface := .web
  target := .typescript
  interfaces := ⟨#[
    ⟨"MortgageForm", by native_decide⟩,
    ⟨"ResultsView", by native_decide⟩,
    ⟨"MortgageInput", by native_decide⟩,
    ⟨"CalculationResult", by native_decide⟩,
    ⟨"RuleAssessment[]", by native_decide⟩
  ], by native_decide⟩
  functions := #[
    ⟨"submitMortgageForm", by native_decide⟩,
    ⟨"renderCalculationResult", by native_decide⟩
  ]
  tests := ⟨#[
    ⟨"formToResultsIntegration", by native_decide⟩,
    ⟨"showRuleSourceAndLimitations", by native_decide⟩,
    ⟨"formatNokForNorwegianLocale", by native_decide⟩
  ], by native_decide⟩
}

public def visualizationDesign : DesignUnit := {
  id := systemVisualization.id
  surface := .web
  target := .typescript
  interfaces := ⟨#[
    ⟨"AmortizationScenario", by native_decide⟩,
    ⟨"AmortizationPoint", by native_decide⟩,
    ⟨"ScenarioComparison", by native_decide⟩,
    ⟨"AmortizationChart", by native_decide⟩,
    ⟨"buildAmortizationSeries(schedule): AmortizationPoint[]", by native_decide⟩
  ], by native_decide⟩
  functions := #[
    ⟨"buildAmortizationSeries", by native_decide⟩,
    ⟨"compareAmortizationScenarios", by native_decide⟩
  ]
  tests := ⟨#[
    ⟨"longerAnnuityTermLowersPeriodicPayment", by native_decide⟩,
    ⟨"higherRateRaisesAnnuityPayment", by native_decide⟩,
    ⟨"moreInitialOwnFundsReduceBorrowedPrincipal", by native_decide⟩,
    ⟨"scheduleEndsAtZeroBalance", by native_decide⟩,
    ⟨"initialOwnFundsRemainPurchaseTimeValue", by native_decide⟩,
    ⟨"chartMatchesAccessibleScheduleTable", by native_decide⟩
  ], by native_decide⟩
  theorems := #[
    ⟨"MortgageModel.amortizationPrincipalConserved", by native_decide⟩,
    ⟨"MortgageModel.annuityPaymentDecreasesWithLongerTerm", by native_decide⟩
  ]
}

public def accessibilityDesign : DesignUnit := {
  id := systemAccessibility.id
  surface := .web
  target := .typescript
  interfaces := ⟨#[
    ⟨"AccessibleMortgageForm", by native_decide⟩,
    ⟨"AccessibleResultsView", by native_decide⟩
  ], by native_decide⟩
  tests := ⟨#[
    ⟨"keyboardOnlyCalculationFlow", by native_decide⟩,
    ⟨"validationErrorsHaveAssociatedLabels", by native_decide⟩,
    ⟨"responsiveAtNarrowViewport", by native_decide⟩
  ], by native_decide⟩
}

public def privacyDesign : DesignUnit := {
  id := systemPrivacy.id
  surface := .web
  target := .typescript
  interfaces := ⟨#[
    ⟨"InMemoryCalculationState", by native_decide⟩,
    ⟨"calculateMortgage", by native_decide⟩
  ], by native_decide⟩
  tests := ⟨#[
    ⟨"calculationMakesNoNetworkRequests", by native_decide⟩,
    ⟨"calculationDoesNotUsePersistentStorage", by native_decide⟩
  ], by native_decide⟩
}

public def evidenceDesign : DesignUnit := {
  id := systemEvidence.id
  interfaces := ⟨#[
    ⟨"MortgageModel", by native_decide⟩,
    ⟨"SharedCalculationVectors", by native_decide⟩
  ], by native_decide⟩
  functions := #[⟨"runSharedCalculationVectors", by native_decide⟩]
  tests := ⟨#[
    ⟨"typescriptMatchesLeanReferenceVectors", by native_decide⟩,
    ⟨"everyRuleHasBelowAtAboveTests", by native_decide⟩
  ], by native_decide⟩
  theorems := #[
    ⟨"MortgageModel.loanToValueBoundaryExact", by native_decide⟩,
    ⟨"MortgageModel.debtToIncomeBoundaryExact", by native_decide⟩
  ]
}

public def allRequirements : Array Requirement := #[
  requiredInputs,
  repaymentEstimate,
  loanToValueLimit,
  debtToIncomeLimit,
  affordabilityStressTest,
  repaymentRequirement,
  explainRuleResults,
  currentRuleDisclosure,
  amortizationVisualization,
  systemInputContract,
  systemCalculationCore,
  systemRulePolicy,
  systemFrontendContract,
  systemVisualization,
  systemAccessibility,
  systemPrivacy,
  systemEvidence
]

public def allDesignUnits : Array DesignUnit := #[
  inputContractDesign,
  calculationCoreDesign,
  rulePolicyDesign,
  frontendDesign,
  visualizationDesign,
  accessibilityDesign,
  privacyDesign,
  evidenceDesign
]

public def mortgageDesignSnapshot : SpecSnapshot := {
  requirements := allRequirements
  uniqueIds := by native_decide
  designs := allDesignUnits
  uniqueDesignIds := by native_decide
  designsLinked := by native_decide
}

#guard mortgageDesignSnapshot.wellFormed
#guard mortgageDesignSnapshot.designs.size == 8
#guard mortgageDesignSnapshot.requirements.size == 17

end MortgageCalculator
