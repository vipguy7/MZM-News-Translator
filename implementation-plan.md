# MZM News Translator — Web App Implementation Plan

## 1. Product direction

Build a production-ready Burmese newsroom workspace for journalists and editors who need to ingest source material, translate it, generate publication-ready news copy, proofread it, enrich it with SEO metadata, and retain reusable scripts and terminology.

The product should preserve the current feature intent while replacing the current prototype architecture with clear boundaries, server-enforced authorization, durable quota accounting, observable AI jobs, and a deployable web runtime.

**Primary users:** Burmese-language journalists, translators, editors, and newsroom administrators.

**Core promise:** Turn a document, URL, report, or pasted text into a reviewable Burmese or English newsroom draft without losing source context, editorial controls, or terminology preferences.

## 2. Repository assessment

The repository at [`vipguy7/MZM-News-Translator`](https://github.com/vipguy7/MZM-News-Translator) is an initial Vite/React/TypeScript application with an Express backend. The current head is commit `bdf2748` (`feat: initialize core application architecture`, 2026-10-14).

### What already exists

- React 19 + Vite + TypeScript frontend.
- Express server that serves the Vite app in development and `dist` in production.
- Firebase Authentication and Firestore user-profile storage.
- PostgreSQL access through Drizzle ORM for scripts, corrections, feedback, and global vocabulary.
- Gemini server-side generation with optional OpenAI routing.
- Input modes for PDF/DOCX files, URLs, reports, English↔Burmese translation, and pasted text.
- Generation controls for length, tone, and script type.
- Proofreading with a diff view, keyword extraction, SEO metadata, news categorization, source grounding, charts for report statistics, Google Sheets export, saved-script library, personal corrections, and an administrator vocabulary panel.
- A multi-tier URL ingestion implementation using Puppeteer, direct HTTP extraction, and Gemini Search Grounding fallback.
- Client-side `sessionStorage` result caching and an in-memory generation queue.

### Verification performed

- `npm ci --ignore-scripts` completed successfully.
- `npm run lint` / `tsc --noEmit` passed.
- `npm run build` passed.
- The production frontend bundle is approximately 1.38 MB before gzip, so code splitting is needed before a public launch.
- Dependency installation reports 35 audit findings, including 2 critical findings; these need triage before deployment.

### Current structural constraints

- [`App.tsx`](./App.tsx) is approximately 2,656 lines and owns authentication, data fetching, workspace state, navigation, generation orchestration, library actions, corrections, and administrator behavior.
- [`server.ts`](./server.ts) is approximately 1,458 lines and owns middleware, logging, queueing, AI routing, file parsing, database endpoints, scraping, and static serving.
- There is no migration history or explicit migration command for the Drizzle schema.
- The server listens on port `3000` unconditionally rather than honoring `PORT`.
- The repository has no Dockerfile, health endpoint, route manifest, automated test suite, or CI workflow.
- The existing `.aistudio/artifacts/.../implementation_plan.md` is narrowly focused on protected URL scraping; this plan supersedes it by covering the complete web application and treating URL fallback as one product capability.

## 3. Target architecture

Keep the existing technology family for the first production version to reduce rewrite risk:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS.
- **Backend:** Node.js + Express + TypeScript.
- **Authentication:** Firebase Auth, with Firebase Admin verification only on the server.
- **Application database:** PostgreSQL + Drizzle ORM and versioned migrations.
- **AI gateway:** One server-side provider abstraction supporting Gemini first and OpenAI as an explicit fallback/provider option.
- **Document extraction:** Dedicated parser module for PDF and DOCX, with bounded payload sizes and clear failure states.
- **Source ingestion:** Dedicated URL-fetch service with SSRF protection, timeout/redirect limits, extraction strategies, and grounded-source provenance.
- **Deployment:** One containerized web service serving `/api/*` and the built frontend, with managed PostgreSQL and runtime secrets.

Do not let the browser call model providers directly. The browser sends an authenticated command to the application API; the server validates ownership, applies quota, constructs the prompt, calls the selected provider, stores usage, and returns a typed result.

### Request flow

1. The client creates a typed generation request containing input type, source content/reference, language, script type, length, tone, and optional SEO/report settings.
2. The API authenticates the Firebase ID token and loads the application user.
3. The API validates payload size, input URL, file type, and user permissions.
4. A quota service reserves one generation unit in PostgreSQL in a transaction. Personal provider keys, if supported, bypass only the system quota—not authorization, validation, or abuse controls.
5. A generation service loads the user’s enabled corrections and the approved global glossary, then calls the provider adapter.
6. The response is normalized into a single `GenerationResult` contract containing text, sources, warnings, SEO data, category, and report data.
7. The API records the request, provider, model, duration, token/usage metadata when available, result status, and error category.
8. The client renders the result and offers proofreading, metadata generation, copy/export, and save-to-library actions.

### API boundary

Group routes by responsibility rather than keeping them all in `server.ts`:

- `POST /api/v1/ingestion/file`
- `POST /api/v1/ingestion/url`
- `POST /api/v1/ingestion/report-summary`
- `POST /api/v1/generations/script`
- `POST /api/v1/generations/translation`
- `POST /api/v1/generations/proofread`
- `POST /api/v1/generations/seo`
- `POST /api/v1/generations/category`
- `GET /api/v1/generations/:id`
- `GET|POST|DELETE /api/v1/library/scripts`
- `GET|POST|PATCH|DELETE /api/v1/dictionary/corrections`
- `GET|POST|DELETE /api/v1/admin/vocabulary` (admin only)
- `POST /api/v1/feedback`
- `GET /api/v1/me`
- `GET /healthz`

Return consistent errors such as `{ code, message, requestId, details? }`. Do not expose provider stack traces, raw prompt content, authorization headers, or secrets to the client.

## 4. Product modules and implementation phases

### Phase 0 — Establish a safe baseline

- Create a feature branch and preserve the current behavior as the baseline.
- Add CI for install, typecheck, build, unit tests, and dependency audit reporting.
- Pin the Node/package-manager version and document local setup.
- Add a health endpoint and a request ID middleware.
- Replace ad hoc `console`/file logging with structured logging that redacts `Authorization`, `cookie`, `x-custom-*`, API keys, and request bodies.
- Make the server honor `process.env.PORT || 3000` and fail fast with an actionable startup error when required runtime configuration is missing.
- Add `GET /manus-routes.json` or the equivalent deployment route manifest required by the chosen hosting platform.

**Outcome:** the app has a repeatable build, a safe baseline, and a runtime that can be monitored and deployed.

### Phase 1 — Separate frontend application domains

Break `App.tsx` into feature modules without changing user-visible behavior:

- `features/auth`: sign-in, sign-up, session provider, protected shell.
- `features/workspace`: input selector, generation controls, job status, result view.
- `features/library`: saved scripts, search/filter, CSV export, delete.
- `features/dictionary`: personal corrections and enable/disable state.
- `features/admin`: role-gated global vocabulary management.
- `features/settings`: provider/model preferences and account settings.
- `features/guide`: policy and module guidance.
- `components/ui`: buttons, dialogs, fields, banners, loading states.
- `lib/api`: authenticated fetch client and typed endpoint functions.
- `lib/query`: request caching and invalidation strategy.

Introduce typed domain models instead of `any` for profile, scripts, corrections, admin vocabulary, queue status, API errors, and report/chart data. Keep Burmese UI strings in a dedicated typed localization module.

**Outcome:** each feature can be tested and changed independently, and the workspace no longer owns every application concern.

### Phase 2 — Normalize authentication, authorization, and roles

- Keep Firebase Auth for email/password and Google sign-in.
- Verify ID tokens server-side on every protected route.
- Replace the hard-coded email check (`axiom.data7@gmail.com`) with a database-backed role or Firebase custom claim such as `admin`.
- Add a single `requireRole('admin')` middleware.
- Define ownership predicates for every user-owned query and mutation.
- Specifically fix the current script deletion path so the `DELETE` condition includes both `newsScripts.id` and `req.dbUser.id`.
- Restrict both read and write access to global vocabulary to administrators; the current read endpoint is not protected by the admin check.
- Add account deletion/export policy decisions before storing more user content.
- Move provider keys out of Firestore plaintext. Preferred approach: do not persist user keys at all; accept them only through a short-lived server-mediated provider session. If persistence is required, encrypt them with a runtime-managed key and never return the plaintext to the browser.

**Outcome:** authorization is enforced by the server and cannot be bypassed by changing client state.

### Phase 3 — Make data and quota accounting authoritative

Add versioned migrations and indexes for:

- `users`: Firebase UID, email, role, status, created/updated timestamps.
- `scripts`: owner, title, content, source metadata, script type, category, SEO fields, created/updated timestamps.
- `corrections`: owner, original term, replacement, enabled flag, timestamps.
- `global_vocabulary`: term, translation, part of speech, notes, created-by, timestamps.
- `generation_requests`: owner, operation, provider, model, status, duration, request hash, error code, created timestamp.
- `usage_counters`: owner, UTC usage date, reserved/completed/failed counts, unique constraint on owner/date.
- `feedback`: owner, rating, text snapshot reference, comment, correction fields, timestamps.

Choose one quota system. The recommended design is PostgreSQL as the source of truth, using a transaction and row lock/upsert for daily usage. Remove the current split between Firestore `credits`, PostgreSQL `usageToday`, and client-side calls to `consumeSystemCredit`.

Define whether failed provider requests refund a reservation. The default should be: reserve before the provider call, mark success/failure afterward, refund only failures caused by an internal/provider outage—not invalid user input.

**Outcome:** users see the same quota in every client, and concurrent requests cannot exceed the daily limit.

### Phase 4 — Harden the AI and ingestion services

Extract the backend into modules:

- `server/app.ts`: middleware and route registration.
- `server/config.ts`: validated environment configuration.
- `server/auth/`: Firebase Admin token verification and role middleware.
- `server/ai/`: provider interface, Gemini adapter, OpenAI adapter, model policy, retry/backoff, response normalization.
- `server/generation/`: prompt construction, glossary injection, quota reservation, request persistence.
- `server/ingestion/`: PDF/DOCX parsing and URL extraction.
- `server/library/`, `server/dictionary/`, `server/admin/`: route handlers and service logic.
- `server/db/`: schema, migrations, repositories, transaction helpers.

For AI operations:

- Validate and cap prompt/input size per operation.
- Use explicit model configuration rather than silently substituting undocumented model names.
- Keep system instructions and output schemas versioned.
- Use structured output for SEO and report extraction, with runtime schema validation.
- Add bounded retries only for transient provider errors and return a stable error code for quota, authentication, timeout, and policy failures.
- Include enabled personal corrections and global vocabulary through a bounded, sanitized glossary context.
- Store source URLs and grounding metadata with the generation result.

For file ingestion:

- Allow only the documented file types and enforce byte/page/text limits.
- Reject malformed base64 and oversized payloads before decoding.
- Treat OCR/enhanced extraction as a separate, explicitly metered operation.
- Avoid sending sensitive documents to a third-party provider without a clear user notice and retention policy.

For URL ingestion:

- Allow only `http` and `https` schemes.
- Resolve DNS and block loopback, link-local, private, metadata-service, multicast, and reserved IP ranges, including after redirects.
- Cap redirects, response bytes, navigation time, browser concurrency, and total extraction time.
- Avoid arbitrary Chromium anti-detection behavior as the primary product guarantee; treat protected pages as unsupported or use only permitted public/search-grounded data.
- Never claim that a grounded reconstruction is the original article. Label it as AI-retrieved context and preserve the actual grounding sources.
- Cache successful extraction by normalized URL with a short TTL, subject to source terms and privacy requirements.

**Outcome:** the backend is modular, bounded, and explicit about provenance and provider behavior.

### Phase 5 — Improve workspace UX and accessibility

Preserve the current editorial-broadsheet direction, but make the flow clearer:

- Workspace starts with one prominent input mode and a compact “style” disclosure.
- Show a step state: `Preparing source → Extracting → Drafting → Reviewing`.
- Keep source title, source URL, extraction method, and grounding warning adjacent to the generated result.
- Make “Paste text” a first-class recovery action when a URL cannot be extracted.
- Keep the generated script editable only through deliberate actions so the original output remains recoverable.
- Add autosave draft state locally without persisting sensitive source text beyond the chosen retention policy.
- Make library search/filter and script deletion explicit, with a reversible archive or confirmation for destructive actions.
- Ensure Burmese typography, keyboard navigation, visible focus, error summaries, and screen-reader labels work across all dialogs and selector controls.
- Replace the current 1.38 MB initial bundle with route/feature-level lazy loading, especially for charts, PDF/DOCX helpers, and admin screens.

### Phase 6 — Production deployment and operations

- Add a Dockerfile that installs dependencies, builds the frontend, and starts the bundled server.
- Add a non-authenticated `/healthz` endpoint that checks process readiness and optionally a lightweight database connection.
- Configure runtime secrets for Firebase Admin, Firebase client settings, PostgreSQL, and AI providers. Never put server secrets in Vite client variables.
- Use PostgreSQL migrations during a controlled release step, not implicitly on every server boot.
- Configure CORS to the known frontend origin(s), or remove it when frontend and API share the same origin.
- Add rate limits separately for anonymous ingestion, authenticated generation, file parsing, URL scraping, and admin mutations.
- Add metrics for request count, latency, provider failures, queue depth, quota denials, scrape method, and generation success rate. Do not record source document contents in metrics.
- Add alerting for provider error spikes, database pool exhaustion, queue saturation, and repeated SSRF/validation attempts.
- Define retention and deletion behavior for saved scripts, source text, request logs, provider keys, and feedback.

## 5. Proposed project structure

```text
.
├── client/
│   ├── app/                 # App shell, routing, providers, auth guard
│   ├── components/ui/       # Shared accessible UI primitives
│   ├── features/
│   │   ├── auth/
│   │   ├── workspace/
│   │   ├── library/
│   │   ├── dictionary/
│   │   ├── admin/
│   │   ├── settings/
│   │   └── guide/
│   ├── lib/api/             # Typed API client and error handling
│   ├── lib/cache/           # Draft/result cache policy
│   ├── styles/              # Tailwind theme and typography
│   └── main.tsx
├── server/
│   ├── app.ts               # Express app composition
│   ├── config.ts            # Runtime env validation
│   ├── auth/                # Firebase Admin and roles
│   ├── ai/                  # Provider adapters and schemas
│   ├── generation/          # Prompt, quota, request orchestration
│   ├── ingestion/           # URL, PDF, DOCX, OCR boundaries
│   ├── modules/             # Library, dictionary, admin, feedback
│   ├── middleware/          # Auth, rate limit, request ID, errors
│   └── db/                  # Drizzle schema, migrations, repositories
├── shared/
│   ├── contracts/           # API request/response schemas
│   ├── domain/              # Shared enums and types
│   └── localization/        # Burmese/English UI strings
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── migrations/
├── public/manus-routes.json
├── Dockerfile
├── .env.example
└── package.json
```

The migration can be incremental: first move backend modules while keeping route paths compatible, then move the frontend feature by feature, then introduce `/api/v1` contracts behind compatibility adapters.

## 6. Design system

### Design movement

**Editorial modernism / digital broadsheet:** a calm, high-legibility newsroom instrument rather than a generic AI dashboard.

### Core principles

1. **Source before spectacle:** provenance, warnings, and the original input remain visible near generated copy.
2. **Quiet hierarchy:** typography and spacing do more work than decorative cards or gradients.
3. **Editorial control:** every AI action is reviewable, reversible, and explicit about what it changed.
4. **Bilingual precision:** Burmese text receives equal typographic and interaction quality, not a fallback treatment.

### Color philosophy

Use a warm limestone canvas for long reading sessions, deep charcoal for authoritative text, muted slate for structure, and one ownable cobalt accent for actions and focus. Red/amber should be reserved for factual warnings, quota limits, and destructive actions.

- Canvas: `#FBF9F5`
- Surface: `#FFFFFF`
- Text: `#0F172A`
- Muted text: `#475569`
- Divider: `#CBD5E1`
- Signature brand color: **Mizzima Cobalt `#1E3A8A`**
- Action highlight: `#2563EB`
- Warning: `#B45309`
- Error: `#B91C1C`

### Layout paradigm

Use a **persistent newsroom rail + focused writing canvas**. The left rail contains workspace/library/dictionary/admin navigation. The main area uses a source-to-draft vertical flow with a narrow provenance column on wide screens and a single-column flow on mobile. Avoid a dashboard grid of equal cards.

### Signature elements

- A thin cobalt “edition rule” framing the active workspace.
- Small source-provenance lines with extraction method and timestamp.
- Editorial diff styling that uses restrained underlines and margin notes rather than bright blocks.

### Interaction and animation

Interactions should feel deliberate and newsroom-like. Use 150–220 ms opacity, border, and height transitions. Use a restrained progress stepper during extraction and generation. Avoid bouncing cards, celebratory confetti, and continuous motion. Respect `prefers-reduced-motion`.

### Typography

- Burmese UI/body: `Noto Sans Myanmar`, with `Padauk` fallback.
- Burmese headlines: `Noto Serif Myanmar`.
- Latin editorial headings: `Playfair Display`.
- System fallback: `ui-sans-serif`, `Georgia`, serif as appropriate.

Use a clear type scale: small metadata at 12–13px, controls at 14px, body copy at 16–18px with generous line height, workspace title at 28–36px, and article title at 32–48px depending on viewport.

### Brand essence and voice

**Positioning:** A source-grounded Burmese newsroom workspace for turning raw reporting into publishable, reviewable copy.

**Personality:** precise, composed, editorial.

Headlines should be factual and specific. CTAs should describe the editorial action rather than promise magic. Example lines:

- “အရင်းအမြစ်ကို စစ်ဆေးပြီး သတင်းမူကြမ်းဖန်တီးမည်” — “Review source and create draft”
- “ပြင်ဆင်ချက်များကို စစ်ဆေးပြီးမှ သိမ်းဆည်းပါ” — “Review edits before saving”

### Wordmark and logo concept

Use a compact mark formed from two offset editorial quotation bars and a single cobalt vertical rule, suggesting translation between source and publication. Pair it with a custom wordmark lockup rather than rendering the brand name in the default body font.

## 7. Security and correctness blockers to resolve before launch

These are not optional polish items:

1. **Script ownership:** the current delete query can delete by ID without constraining the authenticated owner.
2. **Admin reads:** the global vocabulary GET endpoint currently lacks the same administrator restriction applied to writes.
3. **Plaintext provider secrets:** custom Gemini/OpenAI keys are stored in Firestore and copied into browser-managed state.
4. **Sensitive logs:** request headers are serialized to `server_requests.log`, which can capture Firebase bearer tokens and custom API keys.
5. **SSRF:** `/api/scrape-url` accepts arbitrary URLs and launches a browser/fetcher without a private-network/redirect policy.
6. **Quota split-brain:** Firestore credits, PostgreSQL daily script counts, and client-side credit consumption are separate mechanisms.
7. **Hard-coded admin identity:** authorization depends on a literal email address in both client and server code.
8. **Single-process queue:** the in-memory queue does not coordinate across replicas and uses email/IP as its identity.
9. **Open CORS and large bodies:** `cors()` and a 50 MB JSON limit are too broad for a public endpoint.
10. **Model drift:** constants and server routing reference model names that should be validated against the currently enabled provider catalog.
11. **Dependency risk:** the current install reports critical and high vulnerabilities; resolve or document every finding before release.
12. **Source and copyright policy:** grounded fallback must be framed as source-linked context, not an unmarked reproduction of a protected article.

## 8. Definition of done for the first production release

The first release is ready when:

- A user can authenticate, submit each supported input type, generate a script, proofread it, create SEO metadata, and save/export it.
- Every protected API mutation enforces authentication, ownership, and role checks server-side.
- Quota is transactionally enforced in one database and remains correct under concurrent requests.
- Provider keys and auth tokens never appear in browser logs, application logs, response bodies, or database plaintext.
- URL ingestion rejects private-network targets and boundedly handles redirects, timeouts, payload size, and browser concurrency.
- Generated results retain source URLs, extraction method, grounding warnings, and provider/model metadata.
- Database schema changes are versioned and reproducible from a clean environment.
- `npm run lint`, `npm run build`, unit tests, API integration tests, and dependency checks run in CI.
- The production container exposes a working health endpoint, honors `PORT`, serves the built frontend, and has documented runtime secrets.
- The initial client bundle is code-split and the app is usable on mobile and keyboard-only navigation.

## References

[1]: https://github.com/vipguy7/MZM-News-Translator "MZM News Translator repository"
[2]: https://github.com/vipguy7/MZM-News-Translator/blob/main/App.tsx "Current React application entrypoint"
[3]: https://github.com/vipguy7/MZM-News-Translator/blob/main/server.ts "Current Express server and API routes"
[4]: https://github.com/vipguy7/MZM-News-Translator/blob/main/src/db/schema.ts "Current Drizzle database schema"
[5]: https://github.com/vipguy7/MZM-News-Translator/blob/main/firestore.rules "Current Firestore security rules"
