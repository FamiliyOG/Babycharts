# GitHub Branch Protection & Required Status Checks (BC-306)

This document specifies the required branch protection configuration for `main` / `master` to guarantee that no pull request or commit bypasses quality, security, or testing gates.

## Required Branch Protection Rules

### Target Branch: `main`

1. **Require a pull request before merging:**
   - Require approvals: Minimum 1 review required.
   - Dismiss stale pull request approvals when new commits are pushed: `Enabled`.
   - Require review from Code Owners: `Enabled`.

2. **Require status checks to pass before merging:**
   - Require branches to be up to date before merging: `Enabled`.
   - **Required Status Checks:**
     - `validate (24.x)` (Lint, Format, Deadcode, Duplication, Typecheck, Architecture)
     - `Automated Tests & Coverage (Vitest & Supertest)`
     - `Frontend Production Build (Vite)`
     - `Bundle Budget Validation (check-budgets)`
     - `Dependency Review` (GitHub Dependency Review action)
     - `CodeQL Analysis`
     - `Semgrep Security Scan`
     - `Gitleaks Secret Scan`

3. **Require conversation resolution before merging:**
   - All comments on code must be resolved: `Enabled`.

4. **Require signed commits:**
   - GPG or SSH signed commits: `Recommended`.

5. **Do not allow bypassing the above settings:**
   - Enforce for Administrators: `Enabled` (No admin bypass).
   - Restrict direct pushes and force pushes: `Enabled`.
