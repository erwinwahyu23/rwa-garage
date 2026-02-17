Playwright E2E tests

To run the Playwright E2E tests locally:

1. Start the dev server with the Playwright environment flag so server-side auth is bypassed for tests (run in a separate terminal):

   - Windows PowerShell: cmd /C "set PLAYWRIGHT=1 && pnpm dev"
   - Or using cross-env: npx cross-env PLAYWRIGHT=1 pnpm dev

2. In another terminal, run:

   pnpm test:e2e

Note: You only need to set `PLAYWRIGHT=1` when running against the dev server started locally. CI can set this env variable for its job.

CI / GitHub Actions notes

- Required repo secret: `NEXTAUTH_SECRET` (string). Set this in Settings → Secrets and variables → Actions. The workflow will use this for NextAuth. If it's not provided the workflow will generate one dynamically during the job, but you may prefer to set it for stable behavior.
- The workflow expects a Postgres service and will use `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/rwa_garage_test` during the job.
- The E2E tests enable a test-signin endpoint that is active when `PLAYWRIGHT=1` or `NODE_ENV='test'` is present in the environment; the workflow sets `PLAYWRIGHT=1` for you.

Tips:
- For faster iteration locally, run the dev server with `PLAYWRIGHT=1` in one terminal, then `pnpm test:e2e` in another.
- If you need to seed additional test data, add it in `src/app/api/test` or modify `prisma/seed.ts` for CI-specific seeds.