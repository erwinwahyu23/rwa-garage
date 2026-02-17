This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

---

## CI / E2E tests (Playwright) 🔧

This project includes Playwright E2E tests located in the `e2e/` folder and a GitHub Actions workflow to run them in CI (`.github/workflows/playwright.yml`). Before running the workflow, ensure the following repo secret is set:

- `NEXTAUTH_SECRET` — a string used by NextAuth for signing JWTs and sessions. You can set this in the repository Settings → Secrets and variables → Actions. If not set, the workflow will generate a random secret during the run, but setting it ensures stable behavior across runs.

Notes:
- The workflow starts a Postgres service and uses `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/rwa_garage_test` in CI.
- Tests enable a small test-only sign-in endpoint (`/api/test/signin`) which automatically signs in a seeded test user when `PLAYWRIGHT=1` (the workflow sets this env var).
- For local runs, see `e2e/README.md` for instructions (start dev server with `PLAYWRIGHT=1` then run `pnpm test:e2e`).

---



To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
