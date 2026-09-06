# Release Verification Guide (BC-308)

This guide documents the procedures for cryptographically verifying and inspecting published BabyCharts release containers and artifacts.

## 1. Verifying Container Digest & Provenance

BabyCharts publishes multi-arch container images (`linux/amd64`, `linux/arm64`) directly to the GitHub Container Registry (`ghcr.io`).

### Inspecting Image Digest

```bash
docker buildx imagetools inspect ghcr.io/<owner>/babycharts:latest
```

Ensure the manifest list references the cryptographic `sha256` digest corresponding to the release tag commit in git.

## 2. Release Tag Verification

Release tags follow Semantic Versioning (`vMAJOR.MINOR.PATCH`):

```bash
# Verify tag signature and commit SHA
git tag -v v1.0.0
git log -1 v1.0.0 --show-signature
```

## 3. SBOM (Software Bill of Materials) Inspection

To inspect package dependencies and licenses inside the release image:

```bash
# Using Syft (Anchore)
syft ghcr.io/<owner>/babycharts:latest -o table
```
