# Contributing

Thanks for your interest in contributing! Please follow the project's general coding standards and open a PR for changes.

## E2E / CI checklist (Playwright)

When adding or changing E2E tests (Playwright) or CI configuration, please ensure:

- [ ] Add/update tests under `e2e/` covering new behavior.
- [ ] Run tests locally: start dev server with `PLAYWRIGHT=1` then run `pnpm test:e2e`.
- [ ] If tests require DB fixtures, add seeding to `src/app/api/test` or update `prisma/seed.ts`.
- [ ] Document any required repository secrets (e.g. `NEXTAUTH_SECRET`) in `README.md`.
- [ ] Ensure the workflow file (`.github/workflows/playwright.yml`) includes the required environment variables.

Small changes welcome — open a PR against `main` and reference related issues if any.
