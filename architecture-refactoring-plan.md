# MZM News Translator — Architectural Refactoring Plan

## 1. Refactoring objective

Split the two oversized application entrypoints into independently understandable modules without changing the product’s observable behavior during the first refactoring cycle.

- [`App.tsx`](./App.tsx) currently owns authentication, settings, workspace state, generation orchestration, library operations, personal corrections, admin vocabulary, navigation, modal state, and nearly the entire render tree.
- [`server.ts`](./server.ts) currently owns Express startup, middleware, request logging, AI provider selection, retries, queueing, glossary construction, database access, file parsing, URL scraping, all API routes, static serving, and error handling.

The target is not merely “more files.” The target is a set of boundaries where:

1. UI components receive state and callbacks through feature-level contracts rather than reading global state.
2. Server routes translate HTTP into application commands and do not contain provider or database business logic.
3. Shared contracts are typed and validated at the API boundary.
4. Infrastructure is injected into use cases so unit tests do not need a live Firebase, PostgreSQL, Gemini, browser, or filesystem process.
5. Each extraction can be merged and reverted independently.

## 2. Constraints and non-goals

### Constraints

- Preserve the existing React/Vite/Express stack for this refactor.
- Preserve current user flows, Burmese UI strings, generation options, and API behavior until the compatibility phase is complete.
- Keep the current URLs and endpoint names temporarily so the frontend can migrate incrementally.
- Keep Firebase Auth as the identity provider and PostgreSQL/Drizzle as the application-data store during this phase.
- Maintain the existing development command until the new composition root is verified.

### Non-goals for the first refactor

- Do not redesign the product UI.
- Do not switch databases or authentication providers.
- Do not rewrite every prompt at the same time as moving modules.
- Do not introduce a global state library solely because the current file is large.
- Do not make every component independently fetch its own data; feature hooks should own server interaction.
- Do not move secrets into new client modules. The refactor must reduce secret exposure, not spread it.

## 3. Current responsibility map

### `App.tsx` responsibility clusters

| Current area | Approx. lines | Responsibilities | Target owner |
|---|---:|---|---|
| Authentication/profile | 87–242, 389–471 | Firebase auth listener, profile loading, provider-key state, sign-in/out | `AuthProvider`, `useAuth`, `AccountSettings` |
| Workspace input | 111–157, 493–567, 1022–1098 | Input mode, source fields, length/tone/type controls, reset, input validation | `WorkspaceProvider`, `InputPanel`, `useWorkspaceInput` |
| Generation workflow | 129–147, 244–286, 567–759 | Generate, queue polling, cooldown, proofread, keywords, cache, errors | `useGenerationWorkflow`, `GenerationStatus`, `ResultWorkspace` |
| Library | 159–164, 792–889, 1921–2064 | Load/save/delete/open/export scripts | `useLibrary`, `LibraryPanel` |
| Personal corrections | 165–171, 890–963, 2065–2192 | Load/add/toggle/delete corrections | `useCorrections`, `CorrectionsPanel` |
| Admin vocabulary | 173–181, 963–1021, 2257–2366 | Load/add/delete global terms, admin visibility | `useAdminVocabulary`, `AdminVocabularyPanel` |
| Shell/navigation | 148–186, 1200–1550 | Tabs, sidebar, mobile navigation, dropdowns, modal toggles | `AppShell`, `Sidebar`, `TopBar`, `ModalHost` |
| Render composition | 1041–1199, 1554–2656 | Conditional input/result/tab/modal render tree | Feature page components |

The important observation is that the current clusters are already visible in the state declarations and handler blocks. The refactor should use those natural boundaries rather than inventing unrelated abstractions.

### `server.ts` responsibility clusters

| Current area | Approx. lines | Responsibilities | Target owner |
|---|---:|---|---|
| Queue | 29–113, 331–370 | In-memory generation serialization and cancellation | `GenerationQueue`, `QueueService` |
| App startup | 115–160, 1429–1457 | Express creation, middleware, Vite/static serving, listen | `server/app.ts`, `server/main.ts` |
| Provider/runtime helpers | 161–330 | AI client selection, error mapping, retries | `AiProvider`, `AiOrchestrator`, `ProviderErrorMapper` |
| Glossary context | 372–408 | Load personal/global vocabulary and build prompt instructions | `GlossaryService` |
| Library/profile routes | 410–518 | Script CRUD and usage profile | `library.routes`, `profile.routes`, repositories/use cases |
| Corrections/feedback routes | 519–659 | Personal corrections and feedback | `dictionary.routes`, `feedback.routes` |
| Admin routes | 660–734 | Global vocabulary and authorization | `admin.routes`, `RoleGuard`, `VocabularyService` |
| File parsing | 745–836 | Base64 decoding, PDF/DOCX parsing, optional OCR | `FileExtractionService`, `ingestion.routes` |
| Generation routes | 837–1077 | Script/report/summary/translation/proofread/SEO/category | `generation.routes`, generation use cases |
| HTML extraction | 1078–1159 | Readability and selector-based article extraction | `ArticleExtractor` |
| URL scraping | 1160–1428 | Puppeteer, direct fetch, Gemini grounding fallback | `UrlIngestionService`, `ScrapeStrategy` adapters |
| Error/static handling | 1445–1457 | Global error response, SPA serving, listen | `errorHandler`, `staticServer`, `main` |

## 4. Target architecture

Use a feature-oriented frontend and a layered backend. Both sides should have a composition root where dependencies are assembled once.

```text
Browser
  └── React AppShell
      ├── AuthProvider
      ├── WorkspaceProvider
      ├── feature pages/hooks
      └── typed api client
             │
             ▼
HTTP API
  └── Express composition root
      ├── middleware
      ├── route adapters/controllers
      ├── application use cases
      ├── domain contracts/policies
      └── infrastructure adapters
          ├── Firebase Admin
          ├── PostgreSQL/Drizzle repositories
          ├── Gemini/OpenAI providers
          ├── PDF/DOCX parsers
          ├── Puppeteer/HTTP fetchers
          └── filesystem/logger
```

### Dependency direction

Dependencies flow inward:

```text
UI components → feature hooks → api client → HTTP API
HTTP routes → controllers → use cases → domain ports
infrastructure adapters → domain/application ports
composition roots → everything
```

The following dependencies are prohibited after the refactor:

- A presentational component importing `firebase`, `fetch`, or a database type.
- `App.tsx` importing `geminiService`, `firebaseService`, or route-specific API details directly.
- A route handler importing `GoogleGenAI`, `OpenAI`, `puppeteer`, `pdf-parse`, or Drizzle table definitions.
- A repository returning Express `Request`/`Response` objects.
- A provider adapter deciding whether a user owns a script or has quota.
- A database module deciding how an HTTP error should be phrased in Burmese.

## 5. Target frontend structure

```text
client/
├── app/
│   ├── App.tsx                 # Composition only; target <100 lines
│   ├── AppShell.tsx            # Authenticated application shell
│   ├── routes.ts               # Tab/page registry
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── WorkspaceProvider.tsx
│   │   └── AppProviders.tsx
│   └── modalRegistry.ts
├── components/
│   ├── ui/                     # Button, Dialog, Field, Select, Banner, Spinner
│   └── layout/                 # Sidebar, TopBar, MobileNav, ContentFrame
├── features/
│   ├── auth/
│   │   ├── auth.types.ts
│   │   ├── auth.api.ts
│   │   ├── useAuth.ts
│   │   ├── AuthGate.tsx
│   │   └── AuthPanel.tsx
│   ├── workspace/
│   │   ├── workspace.types.ts
│   │   ├── workspace.reducer.ts
│   │   ├── workspace.selectors.ts
│   │   ├── useWorkspaceInput.ts
│   │   ├── useGenerationWorkflow.ts
│   │   ├── WorkspacePage.tsx
│   │   ├── InputPanel.tsx
│   │   ├── InputModeRouter.tsx
│   │   ├── GenerationControls.tsx
│   │   ├── GenerationStatus.tsx
│   │   ├── ResultWorkspace.tsx
│   │   └── WorkspaceModals.tsx
│   ├── library/
│   │   ├── library.types.ts
│   │   ├── library.api.ts
│   │   ├── useLibrary.ts
│   │   └── LibraryPage.tsx
│   ├── corrections/
│   │   ├── corrections.types.ts
│   │   ├── corrections.api.ts
│   │   ├── useCorrections.ts
│   │   └── CorrectionsPage.tsx
│   ├── admin/
│   │   ├── admin.types.ts
│   │   ├── admin.api.ts
│   │   ├── useAdminVocabulary.ts
│   │   └── AdminVocabularyPage.tsx
│   ├── settings/
│   │   ├── settings.types.ts
│   │   ├── useSettings.ts
│   │   └── SettingsDialog.tsx
│   └── guide/
│       ├── GuidePage.tsx
│       ├── PolicyDialog.tsx
│       └── ModuleTipsDialog.tsx
├── lib/
│   ├── api/
│   │   ├── apiClient.ts
│   │   ├── apiErrors.ts
│   │   └── endpoints.ts
│   ├── auth/
│   ├── cache/
│   └── download/
├── services/
│   ├── geminiService.ts        # Temporary compatibility facade
│   ├── firebaseService.ts      # Temporary compatibility facade
│   └── sheetsService.ts
└── shared/
    ├── contracts/
    ├── domain/
    └── localization/
```

During migration, these folders can live under the current repository root rather than physically moving every file at once. The important first step is ownership and import direction.

## 6. Frontend state architecture

### 6.1 State ownership rules

Use three state categories:

1. **Session state:** current Firebase user, server profile, role, quota summary, provider preferences. Owned by `AuthProvider` and `useAccount`.
2. **Workspace state:** selected input mode, source fields, style settings, current generated result, proofread result, SEO/category data, generation status. Owned by a workspace reducer/provider and feature hooks.
3. **Server collections:** saved scripts, corrections, and admin vocabulary. Owned by their respective hooks and loaded on demand by page activation.

Do not put server collections into the global workspace provider. Do not put modal visibility, sidebar collapse, or dropdown state into server/session state.

### 6.2 Replace scattered `useState` calls with typed reducers

The current workspace state has many related fields that can become inconsistent. Introduce a reducer with explicit actions:

```ts
export type WorkspaceAction =
  | { type: 'inputModeChanged'; mode: InputMode }
  | { type: 'sourceUpdated'; source: WorkspaceSource }
  | { type: 'styleUpdated'; patch: Partial<WorkspaceStyle> }
  | { type: 'generationStarted'; requestId: string }
  | { type: 'generationSucceeded'; result: GeneratedScriptResponse }
  | { type: 'generationFailed'; error: UiError }
  | { type: 'proofreadStarted' }
  | { type: 'proofreadSucceeded'; content: string }
  | { type: 'outputsReset'; keepError: boolean };
```

Keep transient input state separate from result state. This prevents `resetOutputs()` from accidentally clearing the source form and makes “open from library” an explicit `loadDraft` action.

### 6.3 Create a typed API client

`client/lib/api/apiClient.ts` should own:

- Firebase ID-token acquisition.
- `fetch` defaults and request ID propagation.
- JSON parsing and content-type checks.
- Conversion of `{ code, message, requestId }` into a typed `ApiError`.
- Cancellation via `AbortController`.
- Optional retry only for safe GET/status calls.

Feature hooks call endpoint functions such as:

```ts
libraryApi.listScripts()
libraryApi.createScript(command)
libraryApi.deleteScript(id)
generationApi.generateScript(command, signal)
generationApi.getQueueStatus(signal)
```

No component should construct `/api/...` URLs or manually attach `Authorization` headers.

### 6.4 Extract feature hooks in dependency order

1. `useAuth`: move the Firebase listener and sign-in/out actions.
2. `useAccountSettings`: move provider/model settings and profile refresh.
3. `useLibrary`: move profile/library fetches, save, delete, open, and CSV export.
4. `useCorrections`: move corrections collection actions.
5. `useAdminVocabulary`: move admin collection actions and role guard.
6. `useWorkspaceInput`: move input fields and validation.
7. `useGenerationWorkflow`: move generation, queue polling, cooldown, proofread, keywords, SEO, category, and cache coordination.
8. `useNavigation`: move active tab/sidebar/mobile layout state.

Each hook should return a stable view model rather than exposing internal setter functions:

```ts
return {
  state,
  actions: {
    submit,
    reset,
    setInputMode,
    setStyle,
    proofread,
  },
  canGenerate,
};
```

### 6.5 Component extraction order

Extract presentational components only after the associated hook exists:

1. `AppShell`, `Sidebar`, `TopBar`, and mobile navigation.
2. `WorkspacePage` and `InputPanel`.
3. `InputModeRouter`, preserving existing `FileInput`, `UrlInput`, `ReportInput`, and `TextAreaInput`.
4. `GenerationControls` for length/tone/type/SEO settings.
5. `GenerationStatus` for loading, queue, cooldown, and error messages.
6. `ResultWorkspace` around the existing `ScriptDisplay` and `ProofreadDiffView`.
7. `LibraryPage`, `CorrectionsPage`, `GuidePage`, and `AdminVocabularyPage`.
8. `ModalHost` and the settings/policy/tips dialogs.

The final `App.tsx` should only compose providers, the auth gate, and `AppShell`:

```tsx
export default function App() {
  return (
    <AppProviders>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </AppProviders>
  );
}
```

## 7. Target backend structure

```text
server/
├── main.ts                         # process entrypoint; calls createApp()
├── app.ts                          # Express composition root
├── config.ts                       # validated environment configuration
├── http/
│   ├── requestContext.ts           # request ID, safe request metadata
│   ├── errorHandler.ts
│   ├── notFound.ts
│   ├── response.ts                 # response/error helpers
│   └── routeTypes.ts
├── middleware/
│   ├── auth.ts                     # Firebase token verification adapter
│   ├── roles.ts                    # requireRole / requireOwner helpers
│   ├── rateLimit.ts
│   ├── bodyLimits.ts
│   └── logging.ts                  # redacted structured logging
├── modules/
│   ├── profile/
│   │   ├── profile.routes.ts
│   │   ├── profile.controller.ts
│   │   ├── profile.service.ts
│   │   └── profile.repository.ts
│   ├── library/
│   │   ├── library.routes.ts
│   │   ├── library.controller.ts
│   │   ├── library.service.ts
│   │   └── library.repository.ts
│   ├── dictionary/
│   │   ├── dictionary.routes.ts
│   │   ├── dictionary.controller.ts
│   │   ├── dictionary.service.ts
│   │   └── dictionary.repository.ts
│   ├── admin/
│   │   ├── admin.routes.ts
│   │   ├── vocabulary.controller.ts
│   │   ├── vocabulary.service.ts
│   │   └── vocabulary.repository.ts
│   ├── feedback/
│   └── generation/
│       ├── generation.routes.ts
│       ├── generation.controller.ts
│       ├── generation.service.ts
│       ├── generation.types.ts
│       ├── promptBuilder.ts
│       ├── glossary.service.ts
│       ├── quota.service.ts
│       └── queue.service.ts
├── ingestion/
│   ├── ingestion.routes.ts
│   ├── file.controller.ts
│   ├── fileExtraction.service.ts
│   ├── url.controller.ts
│   ├── urlIngestion.service.ts
│   ├── articleExtractor.ts
│   ├── urlPolicy.ts
│   └── strategies/
│       ├── browserStrategy.ts
│       ├── httpStrategy.ts
│       └── groundedSearchStrategy.ts
├── providers/
│   ├── ai/
│   │   ├── aiProvider.ts
│   │   ├── aiOrchestrator.ts
│   │   ├── geminiProvider.ts
│   │   ├── openAiProvider.ts
│   │   ├── providerErrors.ts
│   │   └── responseSchemas.ts
│   ├── firebase/
│   │   ├── firebaseAdmin.ts
│   │   └── firebaseAuthProvider.ts
│   ├── documents/
│   │   ├── pdfParser.ts
│   │   └── docxParser.ts
│   └── web/
│       ├── browserClient.ts
│       └── httpClient.ts
├── db/
│   ├── client.ts
│   ├── schema.ts
│   ├── migrations/
│   └── repositories/
└── shared/
    ├── contracts/
    ├── errors/
    └── validation/
```

The existing `src/db`, `src/lib`, and `src/middleware` can be moved gradually. Avoid a large path-only move in the same commit as behavior changes.

## 8. Backend extraction design

### 8.1 Introduce `createApp()` before moving routes

The first server change should turn the current startup into a testable composition root:

```ts
export type AppDependencies = {
  auth: AuthVerifier;
  db: Database;
  ai: AiOrchestrator;
  ingestion: IngestionService;
  logger: Logger;
  config: RuntimeConfig;
};

export function createApp(deps: AppDependencies): Express {
  const app = express();
  registerMiddleware(app, deps);
  registerRoutes(app, deps);
  registerErrorHandling(app, deps);
  return app;
}
```

`main.ts` should load configuration, create real adapters, call `createApp`, and listen. This separates process lifecycle from HTTP behavior and enables Supertest-style tests.

### 8.2 Extract middleware and cross-cutting helpers

Move these first because every route depends on them:

- `requestId` middleware.
- Redacted structured logger. Never serialize full `req.headers`; explicitly allow method, path, status, duration, request ID, and safe user ID.
- JSON/body limits by route class.
- CORS policy.
- Firebase auth middleware.
- Role middleware.
- Error normalization and final error handler.
- Health/readiness endpoint.

Preserve the existing `AuthRequest` concept temporarily, but replace it with a typed request context attached by middleware:

```ts
type RequestContext = {
  requestId: string;
  principal?: Principal;
  dbUser?: AppUser;
};
```

Controllers should read `req.context`, not Firebase implementation details.

### 8.3 Extract AI provider infrastructure

Move lines 161–330 into a provider layer with this contract:

```ts
export interface AiProvider {
  generate(input: AiGenerationInput): Promise<AiGenerationOutput>;
  supports(operation: AiOperation): boolean;
}

export interface AiOrchestrator {
  run(input: OrchestratedGenerationInput): Promise<NormalizedGenerationResult>;
}
```

Responsibilities:

- `geminiProvider.ts`: only Google SDK request construction and response conversion.
- `openAiProvider.ts`: only OpenAI SDK request construction and response conversion.
- `aiOrchestrator.ts`: model selection, bounded retry, timeout, provider fallback policy, and normalized errors.
- `providerErrors.ts`: maps provider-specific failures into stable internal codes such as `AI_QUOTA_EXCEEDED`, `AI_UNAVAILABLE`, `AI_INVALID_REQUEST`, and `AI_AUTH_FAILED`.
- `responseSchemas.ts`: runtime validation for report and SEO JSON output.

The generation service should not know SDK types. The provider should not know authenticated users, quota, or database tables.

### 8.4 Extract queueing

Move `GenerationQueue` into `queue.service.ts` behind an interface:

```ts
export interface GenerationExecutor {
  run<T>(key: string, task: () => Promise<T>): Promise<T>;
  status(key: string): QueueStatus;
}
```

Use the current in-memory implementation first to preserve behavior. Add a clear limitation in configuration: it is single-process only. Later, replace it with a database/Redis-backed coordinator without changing generation routes.

The queue key should be a stable authenticated user ID, not email, and anonymous requests should be rate-limited separately. Queue status must not reveal another user’s email or task details.

### 8.5 Extract glossary and prompt construction

Move `getDictionaryInstructions` into `glossary.service.ts`, then split it into:

- `PersonalCorrectionRepository.listEnabled(userId)`.
- `GlobalVocabularyRepository.listActive()`.
- `GlossaryService.buildContext(userId)`.
- `PromptBuilder.buildScriptPrompt(command, glossaryContext)`.

The prompt builder receives a domain command and returns a provider-neutral instruction object. It should not read `req`, `res`, or environment variables.

### 8.6 Extract route modules

Each route module follows this pattern:

```ts
export function createLibraryRouter(deps: LibraryModuleDeps): Router {
  const router = Router();
  router.get('/news-scripts', requireAuth, controller.list);
  router.post('/news-scripts', requireAuth, controller.create);
  router.delete('/news-scripts/:id', requireAuth, controller.remove);
  return router;
}
```

Controllers should be thin:

1. Read and validate request input.
2. Call one use-case/service method.
3. Map the result to a response DTO.
4. Pass failures to the shared error handler.

They must not construct SQL queries or provider clients.

#### Library module

Extract the current `/api/news-scripts` and profile usage behavior. Correct the delete query as part of the move so it filters by both script ID and current user ID. Move retention/pruning into a service or scheduled cleanup path rather than performing destructive cleanup during every profile read.

#### Dictionary module

Extract personal correction list/create/update/delete. Add uniqueness behavior for duplicate terms and preserve the current enabled flag semantics.

#### Admin module

Extract global vocabulary routes and enforce role middleware for both GET and mutations. The route must not rely on the client’s `isSuperAdmin` boolean.

#### Generation module

Create one command model for each operation:

- `GenerateScriptCommand`
- `GenerateReportCommand`
- `TranslateCommand`
- `ProofreadCommand`
- `GenerateSeoCommand`
- `CategorizeNewsCommand`

A shared `GenerationService` applies auth context, glossary, queue, quota, provider orchestration, request persistence, and result normalization. Operation-specific prompt builders remain small and testable.

#### Ingestion module

Move file parsing and URL scraping out of `server.ts` completely. `FileExtractionService` selects a parser by validated MIME/extension. `UrlIngestionService` composes strategy adapters and returns a provenance-rich result.

Before extraction, add a URL policy boundary that validates scheme, blocks private IPs, bounds redirects/timeouts/body size, and revalidates every redirect destination. The URL controller should never launch Puppeteer directly.

## 9. Shared contracts and compatibility strategy

Create `shared/contracts` for request/response shapes shared by client and server. Use a runtime validator such as Zod or an equivalent schema library; the current TypeScript types alone do not validate JSON received over HTTP.

Example generation contract:

```ts
export type GenerateScriptRequest = {
  inputMode: InputMode;
  text?: string;
  sourceUrl?: string;
  scriptLength: ScriptLength;
  scriptTone: ScriptTone;
  scriptType: ScriptType;
  targetLanguage?: 'Burmese' | 'English';
  useSeo?: boolean;
};

export type GenerationResult = {
  id: string;
  script: string;
  sources: GroundingChunk[];
  intermediateTranslation?: string;
  seoData?: SEOData;
  category?: string;
  statistics?: ReportStatistic[];
  chartData?: ReportChartData[];
  provenance?: {
    extractionMethod?: string;
    warning?: string;
  };
};
```

Keep the existing endpoint paths as compatibility adapters during migration. New internal controllers can serve the old paths first. Introduce `/api/v1` only after the frontend has moved to the typed client.

## 10. Incremental migration sequence

### Milestone A — Baseline and guardrails

- Record current `npm run lint` and `npm run build` results.
- Add a small smoke test for app startup and `GET /healthz`.
- Add import-boundary conventions and a CI check for forbidden imports.
- Add request IDs and redacted logging before moving behavior.
- Do not change UI or API behavior.

**Rollback:** revert the middleware-only commit; no data migration is involved.

### Milestone B — Frontend API facade

- Add `client/lib/api/apiClient.ts` and endpoint wrappers.
- Convert `geminiService.ts`, library calls, corrections calls, and admin calls to use the facade.
- Keep the existing components and handlers temporarily.
- Add typed DTOs and error handling.

**Exit condition:** `App.tsx` no longer constructs raw API URLs or manually attaches auth headers.

### Milestone C — Frontend session and shell extraction

- Create `AuthProvider`, `AuthGate`, `AppShell`, `Sidebar`, `TopBar`, and `ModalHost`.
- Move authentication and navigation state out of `App.tsx`.
- Keep workspace rendering in place until the shell is stable.

**Exit condition:** `App.tsx` contains only provider/shell composition plus temporary workspace wiring.

### Milestone D — Frontend collection features

Extract `useLibrary`/`LibraryPage`, `useCorrections`/`CorrectionsPage`, and `useAdminVocabulary`/`AdminVocabularyPage` one at a time. After each extraction, run typecheck and manually verify the corresponding tab.

**Exit condition:** collection-specific state and handlers are absent from `App.tsx`.

### Milestone E — Frontend workspace reducer and workflow

- Introduce workspace domain types and reducer.
- Move input state and validation.
- Move generation/proofreading/SEO/category/queue handling into `useGenerationWorkflow`.
- Wrap existing input and result components without rewriting their internal UI.

**Exit condition:** `App.tsx` is a composition file and `WorkspacePage` owns the editorial workflow.

### Milestone F — Backend composition root

- Create `server/config.ts`, `server/app.ts`, and `server/main.ts`.
- Move middleware and error handling.
- Keep old route implementations in a temporary `legacyRoutes.ts` mounted from `app.ts`.
- Add dependency injection types and a test app factory.

**Exit condition:** `npm run dev` and `npm start` use the new composition root, with identical endpoint behavior.

### Milestone G — Backend infrastructure adapters

Extract AI provider orchestration, queue service, glossary service, file parsers, article extractor, and URL strategies. `legacyRoutes.ts` should call application services rather than contain SDK/SQL logic.

**Exit condition:** no provider SDK, Puppeteer, parser, or Drizzle table import remains in route files.

### Milestone H — Backend route modules

Move library/profile, dictionary, feedback, admin, generation, and ingestion routes into module routers. Mount them at the old paths first. Remove each corresponding block from `legacyRoutes.ts` only after its integration tests pass.

**Exit condition:** `server.ts` is deleted or reduced to a compatibility entrypoint that imports `server/main.ts`; no business logic remains there.

### Milestone I — Contract versioning and cleanup

- Switch the frontend fully to `/api/v1` typed endpoints.
- Remove compatibility facades and legacy route registration.
- Remove old service imports and dead handlers.
- Add database migration documentation and production deployment files.
- Update the route manifest.

**Exit condition:** all imports follow the dependency rules and the old monolith files are no longer part of the build.

## 11. Testing strategy by boundary

### Frontend tests

- Reducer tests for workspace transitions: reset, mode change, generation success/failure, proofread, and library load.
- Hook tests with mocked endpoint functions, not mocked `fetch` in every test.
- Component tests for input validation, queue status, error recovery, role-gated admin UI, and mobile navigation.
- A single app-shell smoke test proving unauthenticated and authenticated composition.

### Backend unit tests

- `PromptBuilder` output for every input mode, tone, length, and script type.
- Provider error mapping and retry policy.
- Queue ordering, cancellation, and per-user status.
- URL policy for schemes, redirects, DNS/IP blocks, timeouts, and body limits.
- Article extraction with HTML fixtures.
- Quota reservation and refund rules.
- Ownership and role policies.

### Backend integration tests

Use a test app created by `createApp()` with fake dependencies:

- Library CRUD cannot access another user’s script.
- Admin vocabulary GET and mutations reject non-admin principals.
- Generation routes validate input before invoking the AI provider.
- Provider failures return stable error contracts.
- File and URL ingestion return provenance and bounded errors.
- Health endpoint is unauthenticated and stable.

### End-to-end smoke paths

Keep the first end-to-end suite small:

1. Sign in and load workspace.
2. Paste text and generate a script.
3. Save it, open Library, reload it, and delete only the owner’s script.
4. Add and toggle a personal correction.
5. Verify admin vocabulary is hidden and rejected for a normal user.
6. Submit a blocked/private URL fixture and verify safe rejection.

## 12. Risk controls and rollback

### Risk: behavior changes during extraction

Use characterization tests around current services before moving them. Keep endpoint responses backward-compatible and migrate one feature at a time.

### Risk: circular imports

Feature modules may depend on `shared` and `lib/api`, but `shared` must never import feature modules. The backend domain/application layer must not import Express. Run a dependency-cycle check in CI.

### Risk: hidden state coupling in `App.tsx`

Before extraction, document handler preconditions and side effects. The current `handlePerformTransaction`, `resetOutputs`, auth/profile effects, and `fetchUserProfileData` are high-coupling points. Extract them last within their respective feature and expose explicit commands.

### Risk: duplicate requests after hook extraction

Use one query owner per collection and cancel obsolete requests on tab/user changes. Preserve the current on-demand loading behavior rather than adding global eager fetching.

### Risk: server startup regression

Keep `main.ts` responsible for listening and expose `createApp()` for tests. Run both `npm run dev` and the production build after each backend milestone.

### Rollback method

Every milestone should be one focused commit or small commit series:

- `refactor(client): add typed api facade`
- `refactor(client): extract auth shell`
- `refactor(server): add createApp composition root`
- `refactor(server): extract ai adapters`
- `refactor(server): move library routes`

Do not combine security policy changes, database migrations, and broad UI extraction in one irreversible commit. Preserve compatibility route adapters until the new path is proven.

## 13. Final target responsibilities

### `App.tsx`

Only provider and shell composition. No API calls, Firebase calls, database models, feature-specific state, or route-specific rendering.

### `server.ts`

Ideally removed. If retained, it should contain only a short backward-compatible process entrypoint such as:

```ts
import { startServer } from './server/main.js';

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### Success criteria

The refactor is complete when:

- A developer can locate a feature’s UI, hook, API client, server controller, use case, repository, and tests without searching a monolithic file.
- The frontend can render a feature with mocked hooks and API functions.
- The backend can test a route with fake auth, database, AI, and ingestion dependencies.
- No route imports a provider SDK or database table directly.
- No presentational component performs authentication or raw HTTP requests.
- Existing user workflows remain functional throughout the migration.
- The resulting architecture leaves room for later security fixes, quota centralization, background jobs, and multi-instance deployment without another monolithic rewrite.

## References

[1]: https://github.com/vipguy7/MZM-News-Translator "MZM News Translator repository"
[2]: https://github.com/vipguy7/MZM-News-Translator/blob/main/App.tsx "Current frontend entrypoint"
[3]: https://github.com/vipguy7/MZM-News-Translator/blob/main/server.ts "Current backend entrypoint"
[4]: https://github.com/vipguy7/MZM-News-Translator/blob/main/src/db/schema.ts "Current database schema"
