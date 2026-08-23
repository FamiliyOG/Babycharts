# Security Policy

## Supported Versions

We actively provide security updates and bug fixes for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The security of your family's data and privacy is our highest priority. If you believe you have found a security vulnerability in BabyCharts, please report it responsibly.

### How to report:

- **Please DO NOT file a public GitHub issue** for sensitive security vulnerabilities.
- Send an email to the repository maintainer or use [GitHub Private Vulnerability Reporting](https://github.com).
- Include as much detail as possible:
  - Description of the vulnerability
  - Steps to reproduce the issue
  - Proof of Concept (PoC) or exploit code if applicable
  - Affected components or routes

### What to expect:

- **Acknowledgment**: You will receive a response within 48 hours.
- **Assessment**: We will evaluate the impact and keep you informed about remediation progress.
- **Fix & Disclosure**: We will publish a patched release before publicly discussing the vulnerability.

---

## Security Architecture & Best Practices in BabyCharts

- **Self-Hosted Privacy**: All health, biometric, and personal records stay strictly on your own hardware. No external cloud telemetry or tracking.
- **Authentication**: Salted password hashing via `bcrypt` (work factor 10), stateless JSON Web Tokens (`JWT`), and optional **Time-based One-Time Password (TOTP / 2FA)** compatible with Google Authenticator, 1Password, Bitwarden, and Apple Passwords.
- **ACID Database Reliability**: Production-grade embedded `SQLite` with Write-Ahead Logging (`WAL`), strict foreign keys, and parameterized queries protecting against SQL injection.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions per family (`admin`, `editor`, `viewer`).
- **Content Security & Sanitization**: Strict HTML entity encoding and DOMPurify protections on rich exports.
