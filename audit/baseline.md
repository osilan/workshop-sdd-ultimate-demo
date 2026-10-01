# Audit Baseline

Captured before audit edits on 2026-10-01, branch `main`.

## Build and Tests

- `lake build`: PASS; no warnings.
- `python3 scripts/gate.py check`: PASS.
- Implementation tests: no repository `tests/` directory; the gate skips them. `npm test --prefix web` fails because `web/package.json` is absent. The untracked `web/` directory contains generated artifacts only, not application source.

## Proof Inventory

- Top-level Lean theorems: 0. Consequently, there are no `#print axioms` outputs to record.
- `sorry`: 0; `admit`: 0; `axiom`: 0; `unsafe`: 0; `implemented_by`: 0; `set_option maxHeartbeats`: 0.
- `native_decide`: 95 occurrences, all in `MortgageCalculator/Design.lean`, which is allow-listed in `audit/gate.json` for LeanSpec's proof-carrying text fields.
- `#guard`: 3.

## Statements and Size

- Requirements: 17; scenarios marked `executable`: 0; scenarios marked `deferred`: 18.
- Lean files scanned: 3; nonblank, non-comment lines: 359 total.
- `MortgageCalculator.lean`: 2 lines; `MortgageCalculator/Design.lean`: 195 lines; `MortgageCalculator/Requirements.lean`: 162 lines.
- The canonical sorted statement inventory is `audit/fingerprint.tsv`: 17 full requirement values, 3 guard lines, and no theorem statements. SHA-256: `c23076ebfe6ba9661d0dcce5ab3191b31d8f174265dceac6ef22ab038974ab05`.

## Worktree

- `git status --short --branch`: `main...origin/main`, with only `?? web/` at capture time.