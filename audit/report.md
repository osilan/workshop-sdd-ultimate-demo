# Lean Specification Audit

Audit date: 2026-10-01. Scope: current `main` worktree and the specification modules selected by `lake_lib MortgageCalculator`.

| Severity | Location | Finding | Why it matters | Proposed fix |
|---|---|---|---|---|
| major | `web/`, `MortgageCalculator/Requirements.lean` | No web application source or package manifest is present on this branch. All 18 scenarios are deferred, and `npm test --prefix web` cannot run because `web/package.json` is absent. | The user-facing calculator and its implementation evidence are not part of the audited branch; the Lean gate passes without implementation tests. | Add and track the TypeScript application and test package, then change a scenario to executable only when its named checker exists. |
| major | `MortgageCalculator/Design.lean` | Eight theorem names and named test/API strings are stored in `DesignUnit` records, but there are zero top-level theorems and no implementation/test declarations for those names. Snapshot validation only checks nonblank strings, valid targets, unique IDs, and links; it does not resolve theorem or test names. | These records are plans, not proof or test evidence. The current gate can pass while all cited evidence names are unresolved. | Add the referenced Lean model and actual test suite; add a verification statement or another gate that resolves theorem citations and checker names, and reports missing citations as open obligations. |
| info | `MortgageCalculator/Design.lean`, `MortgageCalculator.lean` | The three `#guard`s check snapshot well-formedness and the fixed counts of eight design units and 17 requirements. | They protect declaration shape/counts, not mortgage arithmetic, Norwegian-rule behavior, UI behavior, or accessibility. | Keep these structural guards and add behavior-specific executable checks alongside implementation. |
| info | `MortgageCalculator/Requirements.lean` | All 18 scenarios are explicitly `deferred`, with reasons that match the absent implementation. No scenario is falsely marked executable. Their stated conditions are satisfiable; for example, a 91% LTV input witnesses the LTV case, and two valid inputs with different terms witness scenario comparison. | The spec is honest about its current evidence gap, but it provides no behavioral assurance yet. | Retain deferred status until each scenario has an independently grounded checker. |

## Evidence Review

- Top-level theorem count is zero, so there are no theorem proofs or `#print axioms` results to assess. No `sorryAx`-dependent theorem exists.
- No tests are present on this branch. Circular expected values, fixture independence, and test mutation sensitivity therefore cannot be assessed.
- Mutation count is 0/0 (not applicable): there is no reference model or implementation in the audited tree to mutate. The unresolved `DesignUnit` references are directly confirmed by the theorem count and repository scan.
- The official-rule statements are specification text only; this audit does not treat their presence as implementation or proof.
- No theorem statements, requirement values, or `#guard` lines were changed during the audit.

## Before/After

| Metric | Before | After |
|---|---:|---:|
| Lean nonblank, non-comment lines | 359 | 359 |
| Theorems | 0 | 0 |
| `#guard`s | 3 | 3 |
| Warnings | 0 | 0 |
| `sorry`s | 0 | 0 |
| Axioms | 0 | 0 |
| Mutants killed / total | 0 / 0 | 0 / 0 |
| Statement fingerprint unchanged | yes | yes |

Baseline details and the canonical statement fingerprint digest are in `audit/baseline.md`.