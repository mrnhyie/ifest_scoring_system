# Scoreboard

Two-competitor scoreboard with a public viewer page. Next.js App Router + Postgres.

- `/` — admin (enter password key to manage scoring).
- `/view` — public viewer. No login, read-only, polls for changes every ~0.7s.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed locally: without `DATABASE_URL` the app runs an embedded Postgres (PGlite) in `.data/pglite`. The first visit lets you set an admin password key (or you can define `ADMIN_PASSWORD` in your environment).

## Tests

```bash
npm run test:e2e
```

The suite boots its own dev server on port 3101 with a throwaway database in `/tmp`, drives the real UI in headless Chrome (system Chrome must be installed at `/Applications/Google Chrome.app`), and writes screenshots to `/tmp/next-*.png`.

## Deploy to Vercel + Neon Postgres

1. Create a Postgres database on [Neon](https://neon.tech) and copy the pooled connection string.
2. In Vercel Project Settings → Environment Variables, add:
   - `DATABASE_URL` — your Neon connection string (`postgres://...`).
   - `ADMIN_PASSWORD` — (optional) your desired admin password string. If set, this key unlocks admin controls directly with no setup required.
3. Deploy:

```bash
npx vercel --prod
```

4. Share `/view` with the audience and use `/` with your admin key to run the scoreboard.

## Notes

- Session cookie is httpOnly, SameSite=Lax, Secure in production, 12 hours.
- Login requires only the password string (no email or username).
- Passwords are scrypt-hashed if stored in the database, or matched against `ADMIN_PASSWORD`.
- Photos are center-cropped to 480×480 JPEG in the browser, capped at 2 MB server-side, and served immutably by revision.
