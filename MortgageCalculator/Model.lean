module

import Lean
import LeanJson
public meta import LeanJson

namespace MortgageModel

open Lean

public def annuityPaymentZeroRate (principalOre months : Nat) : Nat :=
  if months == 0 then 0 else (principalOre + months / 2) / months

public def loanToValueWithin (loanOre propertyValueOre limitPercent : Nat) : Bool :=
  loanOre * 100 <= propertyValueOre * limitPercent

public def debtToIncomeWithin (totalDebtOre annualIncomeOre multiple : Nat) : Bool :=
  totalDebtOre <= annualIncomeOre * multiple

public def remainingPrincipal (principalOre principalPaidOre : Nat) : Nat :=
  principalOre - principalPaidOre

public theorem annuityPrincipalConserved (principalOre principalPaidOre : Nat)
    (h : principalPaidOre ≤ principalOre) :
    principalPaidOre + remainingPrincipal principalOre principalPaidOre = principalOre := by
  unfold remainingPrincipal
  calc
    principalPaidOre + (principalOre - principalPaidOre) =
        (principalOre - principalPaidOre) + principalPaidOre := Nat.add_comm ..
    _ = principalOre := Nat.sub_add_cancel h

public theorem serialPrincipalConserved (principalOre principalPaidOre : Nat)
    (h : principalPaidOre ≤ principalOre) :
    principalPaidOre + remainingPrincipal principalOre principalPaidOre = principalOre :=
  annuityPrincipalConserved principalOre principalPaidOre h

public theorem amortizationPrincipalConserved (principalOre principalPaidOre : Nat)
    (h : principalPaidOre ≤ principalOre) :
    principalPaidOre + remainingPrincipal principalOre principalPaidOre = principalOre :=
  annuityPrincipalConserved principalOre principalPaidOre h

public theorem loanToValueClassificationSound (loanOre propertyValueOre limitPercent : Nat)
    (h : loanToValueWithin loanOre propertyValueOre limitPercent = true) :
    loanOre * 100 ≤ propertyValueOre * limitPercent := by
  unfold loanToValueWithin at h
  exact of_decide_eq_true h

public theorem debtToIncomeClassificationSound (totalDebtOre annualIncomeOre multiple : Nat)
    (h : debtToIncomeWithin totalDebtOre annualIncomeOre multiple = true) :
    totalDebtOre ≤ annualIncomeOre * multiple := by
  unfold debtToIncomeWithin at h
  exact of_decide_eq_true h

public theorem loanToValueBoundaryExact :
    loanToValueWithin 90_000_000 100_000_000 90 = true := by decide

public theorem debtToIncomeBoundaryExact :
    debtToIncomeWithin 90_000_000 18_000_000 5 = true := by decide

public theorem annuityPaymentZeroRateLongerTermExample :
    annuityPaymentZeroRate 90_000_000 360 ≤ annuityPaymentZeroRate 90_000_000 240 := by decide

public theorem annuityPaymentZeroRateSharedVector :
    annuityPaymentZeroRate 90_000_000 360 = 250_000 := by decide

private def checkVector (context : String) (json : Json) : Except LeanJson.DecodeError Bool := do
  let kind ← LeanJson.strField context "kind" json
  match kind with
  | "annuityZeroRate" => do
    let principal ← LeanJson.natField context "principalOre" json
    let months ← LeanJson.natField context "termMonths" json
    let expected ← LeanJson.natField context "expectedPaymentOre" json
    pure (annuityPaymentZeroRate principal months == expected)
  | "loanToValue" => do
    let loan ← LeanJson.natField context "loanOre" json
    let property ← LeanJson.natField context "propertyValueOre" json
    let limit ← LeanJson.natField context "limitPercent" json
    let expected ← match (← LeanJson.field context "expectedWithin" json) with
      | .bool value => pure value
      | _ => throw (.wrongType context "expectedWithin" "boolean")
    pure (loanToValueWithin loan property limit == expected)
  | "debtToIncome" => do
    let debt ← LeanJson.natField context "totalDebtOre" json
    let income ← LeanJson.natField context "annualIncomeOre" json
    let multiple ← LeanJson.natField context "multiple" json
    let expected ← match (← LeanJson.field context "expectedWithin" json) with
      | .bool value => pure value
      | _ => throw (.wrongType context "expectedWithin" "boolean")
    pure (debtToIncomeWithin debt income multiple == expected)
  | _ => pure false

private def checkVectors (json : Json) : Except LeanJson.DecodeError (Array Bool) := do
  let cases ← LeanJson.arrField "vectors" "cases" json
  LeanJson.mapArrM "vectors" cases checkVector

private def checkSharedVectors : IO Unit := do
  let source ← IO.FS.readFile "web/src/domain/shared-vectors.json"
  let json ← match LeanJson.parseJson source with
    | .ok value => pure value
    | .error error => throw (IO.userError error.pretty)
  let checks ← match checkVectors json with
    | .ok value => pure value
    | .error error => throw (IO.userError error.pretty)
  unless checks.all id do
    throw (IO.userError "a shared mortgage calculation vector failed")

#eval checkSharedVectors

end MortgageModel
