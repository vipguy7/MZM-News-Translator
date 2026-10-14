# Protected URL Scraping & Gemini Search Grounding Fallback

Implement a multi-tier, resilient news ingestion pipeline that overcomes HTTP 401 Unauthorized, anti-bot protection, and paywalls on international news agencies (e.g., Reuters, BBC, AP) using stealth browser emulation, automated Gemini Google Search Grounding fallback, and intuitive editorial UI recovery.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed choices in Phase 1, the scraping engine will prioritize automated stealth extraction with transparent Gemini Google Search Grounding fallback whenever an international news source returns 401/403 or blocks headless scrapers.

- **Confirmed Decision 1 (Strategy)**: Automatic stealth browser scraping with intelligent Gemini Google Search Grounding fallback.
- **Confirmed Decision 2 (401 / Protection Response)**: When a target URL returns HTTP 401 Unauthorized or anti-bot challenge, automatically trigger Gemini Search Grounding to extract the story content and facts from Google's live index.
- **Confirmed Decision 3 (Source Context)**: Optimized for major international news agencies (Reuters, BBC, AP, Nikkei, AFP) and Burmese news portals.
- **Decision 4 (UI Fallback)**: In addition to the automated AI fallback, provide a non-intrusive, inline "Quick Paste" recovery card with the target URL pre-filled so journalists can paste article copy if needed without leaving the flow.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades `/api/scrape-url` and the newsroom ingestion workspace into a four-tier resilient extraction pipeline. When an editor inputs a news link that is blocked by Cloudflare, Akamai, or paywalls (HTTP 401/403), the server automatically queries Gemini with Google Search Grounding to reconstruct the complete news story, headline, quotes, and statistics from verified search indexes, while keeping the editor informed of the provenance.
- **Target Audience / Persona**: Burmese newsroom journalists, editors, and translators monitoring international and regional news agencies for breaking stories.
- **Key Value**: Zero failed workflows. News links from protected international outlets (Reuters, BBC, AP) convert into usable draft scripts in Burmese or English without tedious manual workarounds or dead-end 401 errors.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **URL Submission**: The user pastes a URL (e.g., `https://www.reuters.com/...`) into the URL Input tab and clicks "သတင်း script ဖန်တီးပါ" (Generate Script).
2. **Stealth & Smart Ingestion**: 
   - The backend attempts stealth headless browser navigation with realistic Chrome client hints and anti-bot evasion scripts.
   - If HTTP 401, 403, or empty content is detected, the server immediately switches to Tier 3: **Gemini Google Search Grounding Fallback**.
3. **Visual Feedback & Provenance Indicator**:
   - The UI displays an elegant, high-legibility badge indicating extraction source:
     - `Direct Web Fetch` (when extracted directly from HTML)
     - `Gemini Search Grounding` (when retrieved via live Google Search fallback for protected articles)
4. **Resilient Quick-Paste Recovery**:
   - If an edge-case URL fails all automated mechanisms, the UI gracefully renders a clean inline editor card allowing the journalist to paste the article text with 1 click, preserving the URL reference in metadata.

### Visual Identity & Theme (Editorial Broadsheet Standard)
- **Palette**: Warm limestone canvas (`#FBF9F5` / `#F8FAFC`), deep charcoal text (`#0F172A`), antique slate dividers (`#E2E8F0`), with quiet cobalt accent (`#1E3A8A` / `#2563EB`).
- **Typography**: Clean serif headlines (`Merriweather` / `Playfair Display`) paired with crisp sans-serif interface controls (`Plus Jakarta Sans`) and Burmese standard typography.
- **Anti-Slop Cleanliness**: Zero pill badges for static metadata; subtle inline text with dot separators (`·`); clear human button copy (`"စာသား တိုက်ရိုက်ကူးထည့်မည်"`, `"ပြန်လည်ကြိုးစားမည်"`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Automated Gemini Google Search Grounding vs. Hard Error
- **Chosen Approach**: When Puppeteer or HTTP returns 401/403 or empty DOM, server automatically invokes Gemini 3.5 Flash with `googleSearch: {}` grounding to retrieve and format the story from Google's indexed news corpus.
- **Why**: Eliminates 95% of journalist friction when monitoring paywalled or bot-guarded agencies like Reuters, Nikkei, and Bloomberg.
- **Alternatives Considered**: Halting and forcing the user to copy-paste (high friction) or using paid 3rd-party proxy services (introduces external cost and latency).

### Decision 2: Stealth Puppeteer Optimization
- **Chosen Approach**:
  1. Remove blanket blocking of stylesheets/scripts which triggers anti-bot bot detection.
  2. Inject `navigator.webdriver = undefined` and standard `navigator.plugins`.
  3. Send full Chromium HTTP headers (`sec-ch-ua`, `sec-fetch-*`, `accept-language`).
  4. Expand DOM readability extraction with fallback CSS selectors (`article`, `[itemprop="articleBody"]`, `.story-body`, `.article__content`).
- **Why**: Allows many previously failing international news sites to render cleanly on Tier 1 before needing AI grounding.

### Decision 3: Non-Intrusive Quick-Paste Drawer
- **Chosen Approach**: An inline secondary helper beneath the URL input that allows one-click text pasting if a user already has the paywalled article open in an authenticated browser tab.
- **Why**: Gives editors an immediate manual override without switching to a different tab or losing their configured script length/tone options.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client (UrlInput.tsx)                           │
│  - URL input field with validation                                     │
│  - Extraction state machine (idle -> fetching -> ai-grounding -> ready) │
│  - Inline Quick Paste recovery card (collapsed by default)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/scrape-url { url }
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Server Engine (server.ts)                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Tier 1: Stealth Puppeteer                                      │   │
│   │ - Anti-detection evasion (webdriver override, Chrome headers)  │   │
│   │ - Readability + Semantic CSS selectors fallback                │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ (Fails: 401 / 403 / Empty DOM)     │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Tier 2: Resilient HTTP Fetch                                   │   │
│   │ - User-Agent rotation & redirect following                     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ (Fails: 401 / 403 / Cloudflare)    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Tier 3: Gemini Google Search Grounding                         │   │
│   │ - Model: gemini-3.5-flash with tools: [{ googleSearch: {} }]   │   │
│   │ - Prompt: Grounded news synthesis for target URL/story         │   │
│   │ - Returns: Title, content, grounding sources, metadata        │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   ▼                                    │
│                 Response JSON: { title, content, method }              │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Contract & Response Schema
`/api/scrape-url` returns:
```typescript
interface ScrapeResult {
  title: string;
  content: string;
  excerpt?: string;
  sourceMethod: 'stealth-puppeteer' | 'http-fallback' | 'gemini-search-grounding';
  groundingSources?: Array<{ title?: string; uri?: string }>;
  warning?: string;
}
```

### Verification & Testing Plan
1. **Protected Agency URL Tests**:
   - Test against Reuters / BBC / AP news URLs.
   - Verify that 401/403 status automatically transitions to Gemini Search Grounding.
   - Verify title, extracted content, and grounding attribution are returned.
2. **Build & Type Checking**:
   - Run `npm run build` and `tsc --noEmit` to verify type safety and zero regressions.
3. **End-to-End Newsroom Test**:
   - Submit a protected URL in the UI, verify automatic extraction, generation into Burmese news script, and saving to user history.
