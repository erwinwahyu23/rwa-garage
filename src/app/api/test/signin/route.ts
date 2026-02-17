import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  // Only enable in Playwright/test mode
  if (!(process.env.PLAYWRIGHT === '1' || process.env.NODE_ENV === 'test')) {
    return new Response(null, { status: 404 });
  }

  try {
    const origin = new URL(req.url).origin;

    const email = 'e2e@example.com';
    const name = 'E2E User';
    const passwordPlain = 'password123';

    // ensure user exists
    const hash = await bcrypt.hash(passwordPlain, 10);
    await prisma.user.upsert({
      where: { email },
      update: { name, password: hash, role: 'ADMIN' },
      create: { email, name, password: hash, role: 'ADMIN' },
    });

    // ensure a test supplier exists for E2E
    const supplierName = 'Supplier 1';
    const existingSupplier = await prisma.supplier.findFirst({ where: { name: supplierName } });
    if (!existingSupplier) {
      await prisma.supplier.create({ data: { name: supplierName } });
    }

    const html = `
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <div>Signing in...</div>
          <script>
            (async function(){
              try {
                const email = ${JSON.stringify(email)};
                const password = ${JSON.stringify(passwordPlain)};

                // fetch csrf token from client so cookies match
                const csrfRes = await fetch('/api/auth/csrf');
                const csrfJson = await csrfRes.json().catch(()=>({}));
                const csrfToken = csrfJson?.csrfToken ?? '';

                const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: '/' });

                await fetch('/api/auth/callback/credentials', {
                  method: 'POST',
                  body: body.toString(),
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  credentials: 'include'
                });

                // navigate to root after sign-in
                window.location.href = '/';
              } catch (err) {
                console.error('Sign-in failed', err);
                document.body.innerText = 'Sign-in failed';
              }
            })();
          </script>
        </body>
      </html>
    `;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    console.error('E2E sign-in error', err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
}