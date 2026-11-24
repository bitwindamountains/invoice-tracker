# Public demo on Render (free)

A public "Try the live demo" site for showing Invoice Tracker to prospects. It is not a place for real invoices. `render.demo.yaml` describes two free Render resources, both in Singapore:

| Resource | Name | What it is |
| --- | --- | --- |
| PostgreSQL 17 | `invoice-tracker-demo-db` | Throwaway demo data. Render deletes free databases 30 days after creation. |
| Web service (Node) | `invoice-tracker-demo` | The app with `DEMO_MODE=true`. Runs migrations at start. |

There is no second service and no rewrite: the app serves everything from one origin. Demo mode needs no Supabase or Resend keys and refuses to start if it finds them.

## Deploy

1. Push the branch to GitHub, then in Render choose **New → Blueprint**, pick the repo and set the blueprint path to `render.demo.yaml`.
2. If Render asks for a card and declines it, create the resources by hand with the values from the file (same names, Singapore, Free plan):
   - **New → PostgreSQL**: name `invoice-tracker-demo-db`, PostgreSQL 17. Copy its **Internal Database URL**.
   - **New → Web Service** from this repo: runtime Node, build command `npm ci --include=dev && npm run build`, start command `npm run db:migrate && npm run start:demo`, health check path `/api/health/ready`. Add every environment variable from the file; set `DATABASE_URL` to the internal URL.
3. **`DEMO_MODE=true` must be set where the build runs**, not only at start. `next.config.ts` reads it when the headers are built, to send `Referrer-Policy: same-origin`; without it Chrome sends `Origin: null` on the demo form post and the request is refused. Render's environment variables apply to both phases, so just keep it in the service's environment.
4. If Render gives a different `.onrender.com` name, update `APP_URL` (it must be https) and redeploy.

The build needs devDependencies (typescript, prisma, tsx), so the build command uses `npm ci --include=dev`; Render builds with `NODE_ENV=production`, which would otherwise skip them.

## Check after deploying

The service sleeps after about 15 minutes idle, so the first request can take about a minute.

- `https://<service>.onrender.com/api/health/ready` answers `{"status":"ready"}`.
- On `/`, **Try the live demo** opens a seeded workspace with the "Demo workspace" banner and a non-zero Outstanding total.
- Create an invoice, send it, open its public link, record a payment, and see it marked Paid.
- **Start over** in the banner gives a fresh seeded workspace; **Sign out** returns to `/`.
- **Client IP:** the demo is limited to 3 starts per hour per visitor. From one network start four demos: the fourth should be refused, while another network (mobile data) still works. If every visitor shares one limit, the app is seeing a proxy address. Read `demo_forwarded_hops` in the Render logs (logged once per process: the number of `X-Forwarded-For` entries, never the addresses). The app keys on the last entry; if the proxy chain adds a trailing hop of its own, change the hop rule in `clientAddress` (`src/lib/rate-limit.ts`).
- Look in the logs for `demo_cleanup_failed`. It should not appear.

## Limits and caveats

- **Cold start.** After idle the first visit is slow, and **Try the live demo** can take a minute (the page says so).
- **30-day database.** Create a new free database, point `DATABASE_URL` at it and redeploy. Migrations run at start.
- **Emails are written to the service's disk only** (`EMAIL_MODE=file`), and the disk is wiped on each deploy or restart. Nothing is delivered.
- **Possible out-of-memory during `next build`.** The free plan has 512 MB. If the build is killed, retry; if it keeps failing, build with a larger plan once, or add `NODE_OPTIONS=--max-old-space-size=460` to the build.
- **Cleanup.** Demo workspaces expire after a day. Expired ones are removed at every server start; the app also removes one when its visitor starts over or signs out.
- **Not a production build.** Production still needs https `APP_URL` and `TRUST_PROXY=true`, which the file sets, but none of the real-mode requirements (verified email, error monitor).

## Run the demo locally

Use a **local** database, never the shared one in `.env`.

```sh
npm run db:local          # in one terminal
DATABASE_URL=postgresql://<local url> DEMO_MODE=true SUPABASE_SECRET_KEY= RESEND_API_KEY= EMAIL_MODE=file APP_URL=http://127.0.0.1:3100 npx next dev --hostname 127.0.0.1 --port 3100
```

The empty `SUPABASE_SECRET_KEY=` and `RESEND_API_KEY=` switch off any keys in `.env` (empty values count as unset).

## Demo browser test

`tests/e2e/demo.spec.ts` runs against a demo-mode server and is not part of CI. With the server above running, in another shell with the same variables:

```sh
DATABASE_URL=<local url> DEMO_MODE=true SUPABASE_SECRET_KEY= RESEND_API_KEY= EMAIL_MODE=file APP_URL=http://127.0.0.1:3100 npx playwright test tests/e2e/demo.spec.ts
```

The test deletes the `app:demo:` rate-limit rows first (locally every visit shares one 3-per-hour bucket) and refuses to run unless `DATABASE_URL` points at 127.0.0.1 or localhost. `DEMO_MODE=true` also makes Playwright skip the real-mode `foundation.spec.ts`.
