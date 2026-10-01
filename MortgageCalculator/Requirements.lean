import LeanSpec.Elab.Sugar

open LeanSpec

namespace MortgageCalculator

requirement requiredInputs where
  id "mortgage.inputs.required"
  shall "Collect purchase price, optional one-time purchase costs, own funds, mortgage interest rate and term, repayment type, qualifying annual income, monthly net household income, normal monthly living expenses, and each existing debt's balance, interest rate, scheduled payment, remaining term, and any revolving credit limit, using NOK. Derive requested borrowing from purchase price plus purchase costs less own funds."
  strength must

  scenario "reject invalid inputs"
    given "a required amount is negative, the term or interest rate is invalid, or own funds and purchase costs leave no positive amount to borrow"
    when "the user requests a calculation"
    then_ "the calculator identifies the invalid fields and does not present a result"
    check deferred "Input form and validation are not implemented"

requirement repaymentEstimate where
  id "mortgage.repayment.estimate"
  shall "Estimate monthly principal and interest payments and total interest for an annuity or serial repayment mortgage from the entered principal, nominal annual interest rate, and term; disclose that lender fees and lender-specific conventions may change actual payments."
  strength must

  scenario "show repayment estimate"
    given "the user has entered valid loan terms and selected a repayment type"
    when "the user requests a calculation"
    then_ "the calculator shows the estimated monthly payment, total interest, and selected repayment type"
    check deferred "Repayment calculations are not implemented"

requirement loanToValueLimit where
  id "mortgage.rule.loan-to-value"
  shall "For a standard residential repayment mortgage, calculate loan-to-value using the proposed mortgage and other loans secured on the home, including housing-cooperative shared debt, divided by the entered prudent property value; flag a ratio above 90 percent."
  strength must

  scenario "flag excessive loan-to-value"
    given "the requested mortgage and other secured debt exceed 90 percent of the prudent property value"
    when "the calculator evaluates the Norwegian lending-rule indicators"
    then_ "the result identifies the loan-to-value limit and shows the calculated ratio"
    check deferred "Regulatory indicators are not implemented"

requirement debtToIncomeLimit where
  id "mortgage.rule.debt-to-income"
  shall "Compare the borrower's total debt, including the proposed mortgage, with qualifying annual income and flag a debt-to-income multiple above 5; allow the user to enter combined household figures for joint applicants."
  strength must

  scenario "flag excessive debt-to-income"
    given "total debt exceeds five times qualifying annual income"
    when "the calculator evaluates the Norwegian lending-rule indicators"
    then_ "the result identifies the five-times limit and shows the calculated multiple"
    check deferred "Regulatory indicators are not implemented"

requirement affordabilityStressTest where
  id "mortgage.rule.affordability-stress-test"
  shall "Estimate household debt-servicing capacity by assessing the proposed and existing interest-bearing debt at the greater of each current rate plus 3 percentage points or 7 percent, and by assessing revolving credit facilities at full utilisation; show monthly net household income remaining after normal living expenses and stressed debt payments."
  strength must

  scenario "show stressed household budget"
    given "the user has entered household income, normal living expenses, other debt payments, and revolving credit limits"
    when "the calculator evaluates affordability"
    then_ "the result shows the applied stress rate, assessed payments, and estimated monthly surplus or shortfall"
    check deferred "Complete household-debt modelling is not implemented"

requirement repaymentRequirement where
  id "mortgage.rule.minimum-repayments"
  shall "When loan-to-value exceeds 60 percent, show the regulatory minimum annual repayment as the lower of 2.5 percent of the approved loan and the repayment on an equivalent 30-year annuity loan at the entered rate; otherwise show that this specific minimum does not apply."
  strength must

  scenario "show minimum repayment above threshold"
    given "loan-to-value is greater than 60 percent"
    when "the calculator evaluates repayment requirements"
    then_ "the result displays the calculated minimum annual repayment"
    check deferred "Minimum-repayment calculation is not implemented"

requirement explainRuleResults where
  id "mortgage.results.explain-rules"
  shall "Present each rule indicator separately as within limit, above limit, or unable to assess, with the relevant input values and calculation; do not represent a rule-screening result as a loan approval or guarantee."
  strength must

  scenario "explain an above-limit result"
    given "one or more rule indicators are above their stated limits"
    when "the results are displayed"
    then_ "the calculator names each exceeded limit and states that a lender makes the final decision"
    check deferred "Results view is not implemented"

requirement currentRuleDisclosure where
  id "mortgage.rules.source-and-currency"
  shall "Identify the Norwegian Lending Regulations (Forskrift om finansforetakenes utlånspraksis), the rule version or verification date used, and a link to https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648; state that the Norwegian text is authoritative and that lender assessments, additional collateral, refinancing rules, and permitted flexibility-quota exceptions are not fully modelled."
  strength must

  scenario "disclose source and limitations"
    given "the calculator displays rule indicators based on rules verified on 2026-10-01"
    when "the user views the results"
    then_ "the official source, verification date, and limitations are available with the result"
    check deferred "Rule-source disclosure is not implemented"

requirement amortizationVisualization where
  id "mortgage.visualization.amortization"
  shall "Let the user compare a current mortgage scenario with an alternative by changing loan term, annual interest rate, and initial own funds (egenkapital/down payment). Visualize periodic principal and interest payments, cumulative principal repaid, and remaining loan balance over time; keep initial own funds distinct from amounts repaid after purchase, and do not imply future property-value changes."
  strength must

  scenario "compare mortgage scenarios"
    given "the user has entered a valid mortgage scenario and selected different term, interest-rate, or initial-own-funds assumptions for comparison"
    when "the user requests a comparison"
    then_ "the calculator shows both scenarios' payment and balance trajectories over their respective terms and identifies the assumptions used"
    check deferred "Scenario comparison visualization is not implemented"

requirement systemInputContract where
  id "mortgage.system.input-contract"
  shall "Refine mortgage.inputs.required: expose a typed MortgageInput contract and validate all field and cross-field constraints before calculation; invalid input returns field-addressed issues and cannot produce a CalculationResult."
  strength must

  scenario "return field-addressed validation issues"
    given "one or more required mortgage inputs are invalid"
    when "the calculation service receives the input"
    then_ "it returns validation issues identifying the affected fields and no result"
    check deferred "The TypeScript input contract is not implemented"

requirement systemCalculationCore where
  id "mortgage.system.calculation-core"
  shall "Refine mortgage.repayment.estimate: implement the calculation core as deterministic, side-effect-free TypeScript functions with explicit input and result types; represent NOK internally as integer ore and annual rates as integer basis points, and define rounding at the payment boundary."
  strength must

  scenario "calculate without hidden state"
    given "the same valid typed input is submitted more than once"
    when "the pure calculation function is called"
    then_ "each call returns the same result and performs no network or storage operation"
    check deferred "The TypeScript calculation core is not implemented"

requirement systemRulePolicy where
  id "mortgage.system.rule-policy"
  shall "Refine mortgage.rule.loan-to-value, mortgage.rule.debt-to-income, mortgage.rule.affordability-stress-test, and mortgage.rule.minimum-repayments: keep Norwegian rule values in a typed, versioned RuleSet separate from repayment formulas, and return a per-rule assessment with status, measured value, threshold, and explanation. Unsupported or incomplete cases must be marked unable to assess, never within limit."
  strength must

  scenario "report unsupported rule cases honestly"
    given "the input uses a fixed-rate expiry case or another case outside the supported RuleSet"
    when "the rule assessment is calculated"
    then_ "the affected rule is marked unable to assess and is not reported as passing"
    check deferred "Versioned rule assessment is not implemented"

requirement systemFrontendContract where
  id "mortgage.system.frontend-contract"
  shall "Refine mortgage.results.explain-rules and mortgage.rules.source-and-currency: implement a Norwegian Bokmal, responsive browser interface in TypeScript with a grouped mortgage form, an explicit calculate action, field-level validation, and a results view driven only by typed calculation and rule-assessment results. Keep presentation and financial calculations in separate modules."
  strength must

  scenario "render typed results"
    given "valid form input has produced a typed calculation result and rule assessments"
    when "the user requests a calculation"
    then_ "the results view presents the estimate, each rule status, its threshold and explanation, and the source disclosure without recalculating financial rules in the UI"
    check deferred "The browser interface is not implemented"

requirement systemVisualization where
  id "mortgage.system.visualization"
  shall "Refine mortgage.visualization.amortization: derive chart series from the typed amortization schedule, compare a baseline with one alternative scenario, and keep charting separate from mortgage and rule calculations. Show scheduled principal and interest, cumulative principal repaid, and remaining loan balance on a time axis; also provide the plotted values as an accessible table or equivalent text."
  strength must

  scenario "update and expose comparison series"
    given "the alternative scenario changes term, annual interest rate, or initial own funds"
    when "the user recalculates the comparison"
    then_ "the chart, accessible data representation, and scenario summaries all use the same recalculated schedules"
    check deferred "Typed schedule visualization is not implemented"

requirement systemAccessibility where
  id "mortgage.system.accessibility"
    shall "Make all form fields, calculate actions, validation messages, result statuses, and scenario controls operable and understandable with keyboard and assistive technology; use semantic labels, programmatically associated errors, visible focus, and responsive layouts without horizontal scrolling at narrow viewport widths. Provide chart values in an accessible table or equivalent text and do not encode scenario or payment meaning by color alone."
  strength must

  scenario "complete calculation by keyboard"
    given "the user navigates the page using only a keyboard"
    when "the user enters valid values and activates calculate"
    then_ "the user can reach the result and identify each rule status without a pointer"
    check deferred "Accessibility behavior is not implemented"

  scenario "read chart data without visual perception"
    given "the user uses a screen reader or cannot distinguish chart colors"
    when "the user views a scenario comparison"
    then_ "the user can identify each scenario, time period, payment breakdown, cumulative principal, and remaining balance from the accessible data representation"
    check deferred "Accessible chart representation is not implemented"

requirement systemPrivacy where
  id "mortgage.system.privacy"
  shall "Keep entered financial data in browser memory for the active page session only; do not transmit, persist, or send it to analytics in the initial release."
  strength must

  scenario "keep calculation data local"
    given "the user enters household income, debt, and property figures"
    when "the calculator computes and displays a result"
    then_ "the values are processed locally and are not sent to a server, persistent browser storage, or analytics"
    check deferred "The browser data flow is not implemented"

requirement systemEvidence where
  id "mortgage.system.evidence"
  shall "For every supported calculation and rule, provide named TypeScript tests for nominal and boundary cases; maintain a small Lean 4 reference model for arithmetic invariants and use shared test vectors to compare the TypeScript implementation with the model. Record unresolved proof obligations as open rather than claiming the TypeScript implementation itself is kernel-verified."
  strength must

  scenario "cover regulatory boundaries"
    given "a supported calculation or rule has a threshold"
    when "the test suite runs"
    then_ "it checks values immediately below, exactly at, and immediately above the threshold"
    check deferred "Calculation tests and the Lean reference model are not implemented"

end MortgageCalculator
