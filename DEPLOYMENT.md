# MZM News Translator — Production Deployment

This application is a full-stack Node/Express + Vite SPA. The Express server serves the compiled frontend and exposes the API routes, so deploy it as a **long-running Node web service**, not as a static-only site.

## 1. Recommended hosting shape

Use one of these deployment patterns:

- **Simplest:** Render or Railway Node web service + managed PostgreSQL.
- **More controlled:** Cloud Run/Fly.io/another container platform + managed PostgreSQL.
- **Avoid:** Static-only hosting, because the app requires Express API routes, Firebase token verification, OCR parsing, URL scraping, and AI provider calls.

The service listens on `0.0.0.0` and honors the platform-provided `PORT` variable through [`main.ts`](./main.ts).

## 2. Build and start commands

Use Node.js 22 or newer.

```bash
npm ci
npm run lint
npm run build
npm start
```

Platform settings:

```text
Build command: npm ci && npm run lint && npm run build
Start command: npm start
Health check: /healthz
```

The build creates:

- `dist/index.html` and frontend assets
- `dist/server.cjs` for the production Express process

## 3. Required production services

### PostgreSQL

Provision a managed PostgreSQL database. The runtime database client reads these variables:

```text
SQL_HOST
SQL_USER
SQL_PASSWORD
SQL_DB_NAME
```

The Drizzle CLI additionally needs administrative credentials:

```text
SQL_ADMIN_USER
SQL_ADMIN_PASSWORD
```

The current runtime pool uses PostgreSQL’s default port and does not configure SSL explicitly. Confirm that the selected provider accepts the connection mode used by the service. If the provider requires SSL, update `src/db/index.ts` to configure the pool’s `port` and `ssl` options before deployment.

### Firebase Authentication

The frontend uses the Firebase project declared in `firebase-applet-config.json`. Enable the authentication providers used by the UI, such as:

- Email/password
- Google sign-in, if enabled in the product

Add the production domain to Firebase Authentication’s authorized domains.

The server verifies Firebase ID tokens through `firebase-admin`. The current admin initialization supplies the project ID and relies on Google Application Default Credentials. In production, provide credentials through the hosting platform’s identity mechanism or a secret-mounted service-account file using `GOOGLE_APPLICATION_CREDENTIALS`.

Never commit a Firebase service-account JSON file or private key.

## 4. AI provider configuration

Configure at least one server-side provider key:

```text
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

Optional provider routing:

```text
OPENAI_API_BASE=https://api.openai.com/v1
```

The application supports per-request provider preference through the existing client settings. The current OpenAI provider fallback uses `gpt-5-nano`; verify that model is available for the target OpenAI-compatible endpoint. Gemini remains the most direct default path for this application’s original configuration.

Do not expose server AI keys as `VITE_*` variables or commit them to the repository.

## 5. Initialize the database

This repository currently contains the Drizzle schema but does not contain a checked-in `drizzle/` migration directory. For an initial environment, use the Drizzle schema push workflow with the database administrator variables configured:

```bash
SQL_HOST=... \
SQL_DB_NAME=... \
SQL_ADMIN_USER=... \
SQL_ADMIN_PASSWORD=... \
npx drizzle-kit push
```

For a controlled production workflow, generate and commit migrations from a development environment instead:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Review generated SQL before applying it to production. Back up the database before future schema changes.

## 6. Deployment sequence

1. Push the refactored repository to the deployment provider.
2. Select Node.js 22+.
3. Configure the build and start commands above.
4. Provision PostgreSQL and add the SQL variables.
5. Configure Firebase Authentication and production authorized domains.
6. Provide Firebase Admin Application Default Credentials through the platform secret/identity system.
7. Add `GEMINI_API_KEY` or `OPENAI_API_KEY`.
8. Initialize the database schema before opening the service to users.
9. Deploy with `NODE_ENV=production`.
10. Confirm the health and smoke tests below.

## 7. Post-deployment smoke tests

Replace `https://your-domain.example` with the deployed URL.

```bash
curl -fsS https://your-domain.example/healthz
curl -fsS https://your-domain.example/
curl -i https://your-domain.example/api/news-scripts
curl -fsS https://your-domain.example/api/queue-status
```

Expected behavior:

- `/healthz` returns `{"status":"ok"}`.
- `/` returns the SPA shell.
- `/api/news-scripts` returns `401` without a Firebase bearer token.
- `/api/queue-status` returns queue JSON.

Then test from the deployed UI with a real Firebase-authenticated user:

1. Sign in.
2. Generate a short script.
3. Translate text.
4. Proofread the result.
5. Generate SEO metadata.
6. Save and reload a script in the library.
7. Add and toggle a personal correction.
8. Upload a small PDF or DOCX.
9. Test URL scraping with a permitted public article.

Monitor the provider response time and memory use during PDF OCR and Puppeteer scraping. Use at least 1 GB RAM for a small deployment and increase memory if browser scraping or large PDFs are common.

## 8. Production hardening before public launch

- Add a committed migration workflow instead of relying on ad hoc schema pushes.
- Add database SSL/port configuration if required by the managed database.
- Restrict CORS from the current permissive `cors()` configuration to the production origin.
- Add request-rate limiting for AI and scraping endpoints.
- Move request logging from synchronous file writes to the platform’s structured logging system or a persistent log sink.
- Add a persistent/shared queue if deploying more than one service instance; the current `GenerationQueue` is process-local.
- Add object storage or another persistent location if uploaded documents or generated artifacts need retention.
- Set platform timeouts high enough for AI generation, PDF OCR, and Puppeteer scraping.
- Configure automatic database backups and a rollback strategy.
- Confirm Firebase authorized domains and production OAuth redirect behavior.

## 9. Current repository-specific caveats

- No Dockerfile or platform manifest is currently checked in.
- The production server is Express plus the Vite-built SPA; it is not a static-only Vite deployment.
- The server can run AI generation without SQL configuration, but personal corrections, global vocabulary, profiles, library persistence, and usage accounting require PostgreSQL.
- `firebase-applet-config.json` contains client-side Firebase configuration and must be included in the build; it is not a replacement for Firebase Admin credentials.
