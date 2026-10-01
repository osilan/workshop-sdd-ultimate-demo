# Boligkompass

Boligkompass is a browser-based mortgage calculator prototype for Norwegian home buyers. It estimates annuity or serial repayments and compares two sets of loan assumptions, including term, interest rate, and initial equity (`egenkapital`). It also shows simplified indicators based on Norway's Lending Regulations.

This is an independent estimate, not a loan offer, financial advice, or a substitute for a lender's credit assessment.

## Run Locally

Requirements: Node.js 22 or newer and npm.

```sh
cd web
npm ci
npm run dev
```

Vite prints the local URL after the development server starts.

## Checks

Run the browser application's tests and production build from `web/`:

```sh
npm test
npm run build
npm audit --audit-level=moderate
```

Run the Lean specification build and audit gate from the repository root:

```sh
lake build
python3 scripts/gate.py check
```

The Lean gate currently checks requirements, design snapshot structure, fingerprints, and proof hygiene. Frontend tests are run separately by `npm test` and CI.

## GitHub Pages

GitHub Actions runs the Lean gate, frontend tests, dependency audit, and production build on pull requests and pushes. A successful push to `main` deploys `web/dist` to GitHub Pages. In repository settings, select **Settings → Pages → Build and deployment → GitHub Actions**. The workflow uses GitHub's OIDC token for deployment; no deployment secret is required.

The Vite build detects the Pages repository slug from `GITHUB_REPOSITORY` when `GITHUB_PAGES=true`. Local development uses the root URL.

## Calculation Scope

- Amounts are entered in NOK and converted internally to integer øre. Interest rates are represented in basis points.
- Repayment schedules assume the entered nominal interest rate remains unchanged for the modeled term. Fees and lender-specific conventions are not included.
- Loan-to-value uses the purchase price as a proxy for a prudently assessed property value. Additional collateral is not modeled.
- Debt-to-income uses entered outstanding debt balances. Revolving limits are considered at full utilization in the affordability estimate.
- The affordability indicator is a simplified estimate, not a bank credit decision. Fixed-rate expiry cases are marked as unable to assess; existing-debt payment modeling is approximate.
- The rule indicators are based on the Norwegian Lending Regulations (`Forskrift om finansforetakenes utlånspraksis`) checked on 2026-10-01. The authoritative Norwegian text is at [Lovdata](https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648). Regulatory flexibility quotas, refinancing provisions, and lender-specific assessments are not implemented.
- The comparison chart shows scheduled payments, cumulative principal repaid, and remaining mortgage balance. Initial own funds are shown separately; property appreciation is not modeled.
- Entered financial data is processed in the browser and is not intentionally sent to a server or persistent storage.

## Specification

Requirements and design records are in `MortgageCalculator/Requirements.lean` and `MortgageCalculator/Design.lean`. The Lean arithmetic reference model is in `MortgageCalculator/Model.lean`; shared calculation vectors are in `web/src/domain/shared-vectors.json`.

## License

No license has been selected for this project yet. The vendored dependency under `open-lean-spec/` has its own license; it does not license this project's code. Until a project license is added, do not assume the project code is available for reuse.