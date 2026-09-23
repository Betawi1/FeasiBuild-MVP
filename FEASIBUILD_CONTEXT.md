# FeasiBuild — Permanent Project Context

> **Source of truth** for product identity, architecture, AI integration, financial engine rules, and jurisdiction logic.  
> Derived from the codebase (`finmodel-app-v2`) and established product conventions. Update this file when architecture or calculation rules change.

---

## 1. Project Identity & User Profile

| Field | Value |
|--------|--------|
| **Name** | FeasiBuild |
| **Purpose** | Web3 investment platform targeting individual investors for digital assets. This is **explicitly not** an RWA (Real World Asset) project. |
| **Repo / app** | Next.js financial modeling application (`finmodel-app-v2`) that produces project cash-flow models and AI-assisted feasibility study decks used in the FeasiBuild workflow. |
| **User profile** | C-level finance expert with ~30 years ASEAN / Middle East project finance experience. Prefers **step-by-step guidance** and **foundational explanations** (not jargon-first dumps). |
| **UX implication** | Wizards, docs, and AI copy should teach *why* a step exists before *how* to fill it; keep labels plain and progressive. |
| **Payment structures** | Native presets for Dubai Law No. 8, Malaysia HDA and Australia's 10/90 — plus a configurable payment-structure engine (no escrow, custom splits like 20/80 or 30/70, staged escrow with custom retentions) for any location on earth. Pin-drop sets the country; user sets the rules. AI market research is tailored to the pin-dropped location, reverting to the nearest city when hyper-local data is thin. **NEVER pair UK with 10/90 — UK does not use it. Australia only.** |
| **Funnel** | LinkedIn posters → blog depth → FAQ (AI-search citations) → Vault (email capture) → Explorer → $99 lifetime. Forums/Reddit = expert value comments (9:1 value-to-link ratio, disclosed affiliation) linking to blog articles. |

---

## 2. App Architecture & Core Workflow

### 2.1 Two streams

FeasiBuild runs **two parallel financial streams**, selected from the dashboard. Each has its own route tree, layout (forces `assetType` on the shared store), and scenario / feasibility path.

| Stream | Entry | Intent | Asset types |
|--------|--------|--------|-------------|
| **Operational** | `/operational` → `/operational/cash-outflows` | Hold / income-producing assets | Hotel, Retail (mall), Office, Residential BTR, Warehouse, **Data Centre** (`data_centre` / enrich key `datacentre`) |
| **Sale** | `/sale` → `/sale/cash-outflows` | Build-to-sell developments | Residential landed / high-rise, Commercial landed / strata office, **Commercial strata warehouse** (`commercial_strata_warehouse`) |

**Key routing / layout**

- `src/app/operational/layout.tsx`, `src/app/sale/layout.tsx`
- `src/lib/stream-path.ts` — `withStreamPrefix`, `useStreamPrefix`
- Dashboard: `src/app/dashboard/` — projects home + **`/dashboard/settings`** (AI model preference + **Get help** Telegram link)
- Product docs: `src/app/docs/operational-stream/`, `src/app/docs/sale-stream/`
- Marketing: landing (`src/app/page.tsx`) includes **`#pricing`** (`PricingSection`); landing comparison is `/comparison` (anonymous category names only — no real competitor brands). Content: `/blog` (nav label **Learn**), `/faq`, `/vault` (gated sample library). Named competitors belong only on branded blog comparison articles (#9–#10), with the verify-before-claim rule.
- Legal: `/terms` (`src/app/terms/page.tsx`), `/refund-policy` (`src/app/refund-policy/page.tsx`), `/privacy-policy`. Legacy `/terms-of-service` **redirects** to `/terms`. Footer + `UpgradeModal` link to Terms and Refund Policy.
- **Clerk waitlist is DISABLED** — open sign-ups.

### 2.2 Six Component wizards (data input & selection)

The “6 steps” are **six top-level Components** per stream (each Component may contain an inner multi-step wizard). Feasibility Study is the **culminating deliverable** after Component 6.

| # | Component | Operational route | Sale route |
|---|-----------|-------------------|------------|
| **C1** | Costs / Cash Outflows | `/operational/cash-outflows` | `/sale/cash-outflows` |
| **C2** | Income / Cash Inflows | `/operational/cash-inflows` | `/sale/cash-inflows` |
| **C3** | Project IRR (unlevered / pre-financing) | `/operational/project-irr` | `/sale/project-irr` |
| **C4** | Financing | `/operational/financing` | `/sale/financing` |
| **C5** | Equity Returns (levered) | `/operational/equity-returns` | `/sale/equity-returns` |
| **C6** | Scenario Analysis | `/operational/scenario-analysis` | `/sale/scenario-analysis` |
| — | **Feasibility Study** (report) | `/operational/feasibility-study` | `/sale/feasibility-study` |

Each Component ends with a **preview** (“Generate Model”) that materializes the corresponding cash-flow / P&L / financing table before the user advances.

#### Inner wizards (high level)

**C1 Cash Outflows (~13 UI steps, both streams)**  
Project Location → Currency → Asset / Building Type → Segmentation → Building Configuration → Construction Costs → Contingency → Soft Costs / POWC / FF&E → Land → Construction Period → Phasing (S-curve) → Review → Generate Model.

- Ops page: `src/app/operational/cash-outflows/page.tsx` (+ `steps/`, warehouse- and **data-centre**-specific steps)
- Sale page: `src/app/sale/cash-outflows/page.tsx` (+ **Sale warehouse Path A** steps under `src/app/sale/cash-outflows/steps/`)
- Shared UI: `src/components/cash-outflows/`
- Step name maps: `src/lib/operational-audit-fields.ts`, `src/lib/sale-audit-fields.ts`
- Sale warehouse types: `src/types/sale-warehouse-config.ts`

**Operational Data Centre C1 steps (gated by `buildingType === "data_centre"`)**

| Step | Component |
|------|-----------|
| Segmentation | `DataCentreSegmentationStep.tsx` |
| Building config | `DataCentreBuildingConfigStep.tsx` |
| Construction costs | `DataCentreConstructionCostsStep.tsx` |
| Phasing | `DataCentreConstructionPhasingStep.tsx` |
| Review | `DataCentreReviewSummaryStep.tsx` |

Costs preview: `src/app/operational/preview/cash-outflows/components/cash-outflows-table-data-centre.tsx`.

**Sale warehouse C1 steps (gated by `buildingSubType === "commercial_strata_warehouse"`)**

| Step | Component |
|------|-----------|
| Segment & grade | Inline on `sale/cash-outflows/page.tsx` (Step 4) |
| Building config | `SaleWarehouseBuildingConfigStep.tsx` |
| Construction costs | `SaleWarehouseConstructionCostsStep.tsx` |
| Phasing (4 S-curves) | `SaleWarehouseConstructionPhasingStep.tsx` |
| Review | `SaleWarehouseReviewSummaryStep.tsx` |

Warehouse CapEx lives in store `cashOutflows.warehouseCosts` / `warehousePhasing` (shared shape with Ops) plus flat sale rates (`warehouseBuildingRate`, FF&E %, etc.). Saleable ratio forced to **100%** for warehouse.

**C2 Cash Inflows**  
- Operational: 4–5 steps by asset (hotel 5; retail / office / BTR / warehouse / **data centre** 4) → preview P&L  
- Sale: 8 steps (Saleable BUA → ASP → Cash / Mortgage buyers → Uptake → Mix & deductions → Defaults & bulk → Launch timing) → preview sales CF  
- Warehouse sale: C2 shows conditional **FF&E** between Construction and Soft Costs in pre-financing cash-flow preview  
- **Data Centre C2 UI:** `c2s1`–`c2s4` under `operational/cash-inflows/components/` (`*-data-centre.tsx`); P&L series `src/lib/data-centre-pnl-series.ts`; table `DataCentrePnlTable.tsx`; AI helpers `src/lib/data-centre-ai.ts`

**C3–C5** mostly configure or review engines already fed by C1/C2 (+ financing inputs in C4).

**Sale C4** is **one 8-step wizard for every sale asset class** (`src/app/sale/financing/residential-wizard.tsx`): 1 Project Summary → 2 Debt Sizing (LTC & LTV) → 3 Land Ownership & Equity → 4 Preference Shares → 5 Escrow Withdrawal Config → 6 Drawdown Structure → 7 Interest, IDC & Escrow Income → 8 Sales & Escrow Recycling. Location + asset class only **pre-select** the escrow default; all four rules stay selectable. Projects saved without an escrow rule pick up the current location/class default on next open.

**C4 timing (both streams):** construction end = last non-zero month of the C1 S-curve (`resolveActualConstructionEndMonth` in `src/lib/construction-end.ts`) — the **same source as C3**. `operationsStart = actualConstructionEnd + 6-month pre-op buffer + 1`. Never derive the month grid from `financing.constructionPeriodMonths`. That field is **initialized from C1** on project create/load (and when C1 period is saved); the user may still override the stored field, but preview/engine calendars follow the S-curve. C3 and C4 pre-operating bands and operations-start month must stay identical for the same project.

**C6** applies base / downside / upside shocks and re-runs C1–C5 engines. Operational C6 uses `ASSET_SPECIFIC_FACTORS` in `src/app/operational/scenario-analysis/config/shockFactors.ts` keyed by `buildingType` (hotel, retail, office, BTR, **warehouse**, **data_centre**). Unmapped assets show **Common Factors only** — they must not silently fall back to Hotel. Warehouse shocks: base rent psf, occupancy, rent escalation, lease-up. Data Centre shocks: power lease rate, white-space rent, utilization/occupancy, PUE. Delay shocks add months to **C1 `constructionPeriod`**, then copy into financing.

### 2.3 Four core cash-flow tables

Wizard inputs land in Zustand (`useFinModelStore`) and profile builders; preview pages render the four core tables:

| # | Table | Meaning | Operational preview | Sale preview | Primary builders / engines |
|---|--------|---------|---------------------|--------------|----------------------------|
| **1. Costs** | Development / capital outflows (land, construction, soft costs, POWC, FF&E), monthly S-curve | `/operational/preview/cash-outflows` | `/sale/preview/cash-outflows` | Store `buildCashOutflowProfile`; timing helpers `cash-outflow-powc-timing.ts`, `cash-outflow-ffe-timing.ts`; sale `sale-cash-preview-profile.ts` (warehouse CapEx breakdown + FF&E) |
| **2. Income** | Ops: recurring P&L; Sale: sales proceeds schedule | `/operational/preview/pnl` | `/sale/preview/cash-inflows` | `operational-pnl.ts` + asset P&L tables; sale C2 schedules in store |
| **3. Pre-financing Project Cash Flows** | Unlevered NCF → Project IRR | `/operational/preview/project-irr` | `/sale/preview/project-irr` (+ graphs on `/sale/project-irr`) | **Single NCF source:** `buildSalePreFinancingCashFlows()` in `sale-cash-preview-profile.ts` (warehouse includes land + CC + soft + POWC + FF&E). Used by cash-inflows preview, project-irr preview, and C3 Step 1 graphs — **do not recalculate NCF separately**. |
| **4. Post-financing Project Cash Flows** | Debt draws, IDC, equity gap-fill, waterfall, levered equity CF | `/operational/preview/financing` | `/sale/preview/financing` | Ops: `c4.levered.engine.ts` + waterfall libs; Sale: `sale-financing-engine.ts`, `financing-engine/generate-cash-flow.ts`, financing bridge. Display rows from **horizon-aligned arrays** (`src/lib/financing-preview-rows.ts`) — same series as totals/NCF (no post-completion remainder plug). Dev asserts `row.length === horizon` and `sum(row) === displayed total`. Warehouse sale: optional monthly **`ffe`** in engine `monthlyCosts` + conditional FF&E row in MY/UAE/AU tables. **HDA construction deposit** (`capitalHdaDeposit`) is computed in `generate-cash-flow.ts` and shown on the Malaysia/progress table + Excel export **only** for Malaysian residential for-sale; commercial cumulative capital = land + cash injection only. |

Feasibility builders reuse the same series:

- `src/lib/feasibility/build-operational-cash-flow-data.ts`
- `src/lib/feasibility/build-post-financing-cash-flow-data.ts`
- `src/lib/feasibility/sale/build-sale-financial-data.ts`

### 2.4 End-to-end flow

```text
Dashboard → pick Operational | Sale
  → C1 Costs wizard → Costs table
  → C2 Income wizard → Income / P&L table
  → C3 Project IRR → Pre-financing Project Cash Flows
  → C4 Financing → Post-financing Project Cash Flows
  → C5 Equity Returns (levered metrics)
  → C6 Scenario Analysis (base / downside / upside shocks)
  → Feasibility Study (AI slide deck + PDF export)
```

Scenario engines:

- Operational: `src/app/operational/engine/buildOperationalScenarioEngines.ts`, `src/store/useScenarioStore.ts`
- Sale: `src/app/sale/engine/buildSaleScenarioEngines.ts`

### 2.5 Main directories & key files

| Concern | Paths |
|---------|--------|
| **Frontend wizards** | `src/app/operational/**`, `src/app/sale/**`, `src/components/cash-outflows/`, `src/components/BenchmarkProfile.tsx`, `src/components/PreviewFloatingBar.tsx` |
| **Ops warehouse C1** | `src/app/operational/cash-outflows/steps/Warehouse*.tsx` |
| **Ops data centre C1** | `src/app/operational/cash-outflows/steps/DataCentre*.tsx` |
| **Ops data centre C2 / P&L** | `operational/cash-inflows/components/c2s*-data-centre.tsx`, `src/lib/data-centre-ai.ts`, `src/lib/data-centre-pnl-series.ts`, `preview/pnl/components/DataCentrePnlTable.tsx` |
| **Ops data centre feasibility** | `src/lib/feasibility/data-centre-context.ts`, `build-data-centre-market-data.ts`, `generate-data-centre-commentary.ts`, `generate-data-centre-report.ts`; slides `src/components/feasibility/slides/DataCentre*.tsx`; enrich router key **`datacentre`** in `enrich-operational-slides-puter.ts` (**resolve DC before BTR** to avoid wrong-asset decks) |
| **Sale warehouse C1** | `src/app/sale/cash-outflows/steps/SaleWarehouse*.tsx`, `src/types/sale-warehouse-config.ts` |
| **Sale cash / NCF** | `src/lib/sale-cash-preview-profile.ts` (`buildSaleCashflowDetailProfile`, `buildSalePreFinancingCashFlows`) |
| **Sale financing UI** | `src/app/sale/preview/financing/` (bridge, MY/UAE/AU tables, export). HDA deposit row is gated in the Malaysia table + Excel export; no new modules. |
| **Sale feasibility stream config** | `src/lib/feasibility/sale/sale-stream-config.ts` — `SALE_CONFIG` + `SUBTYPE_TO_CONFIG_KEY` (includes **`Commercial-Strata-Warehouse`** ↔ `commercial_strata_warehouse`); drives title, market slide titles, commentary asset label via `getSaleStreamConfig` |
| **Sale feasibility generators** | `src/lib/feasibility/sale/generate-sale-report.ts`, `enrich-sale-slides-puter.ts`, `create-sale-puter-prompts.ts`, `build-sale-financial-data.ts`, `sale-context.ts` |
| **State** | `src/store/useFinModelStore.ts`, `useSaleModelStore.ts`, `useScenarioStore.ts`, `useFeasibilityStore.ts`, `useAuditStore.ts`, `useAnalystStore.ts` (AI Analyst UI/chat — not financial data) |
| **Calculation engine** | `src/lib/irr-calculations.ts`, `equity-irr.ts`, `operational-pnl.ts`, `operational-project-irr-pnl.ts`, `sale-financing-engine.ts`, `financing-engine/generate-cash-flow.ts`, `src/lib/construction-end.ts` (C3/C4 construction-end month), `src/lib/financing-preview-rows.ts` (horizon-aligned C4 display rows), `src/app/operational/engine/c4.levered.engine.ts`, `c5.equity.engine.ts` |
| **Report generator** | `src/lib/feasibility/**`, `src/types/feasibility.ts`, `src/components/feasibility/**` (`FitSlide.tsx` auto-fit 16:9 wrapper), `src/app/api/feasibility/**`, `src/lib/pdf-export.ts` |
| **User AI preference (Puter KV)** | `src/lib/puter-models.ts` (Qwen default, Claude Sonnet 4.6, GPT-4o), `src/lib/puter-kv-preferences.ts` (logical key `user_preferences` via Secure KV), `src/lib/puter-chat.ts` (`chatWithPuterFallback`: selected → Qwen), `src/components/settings/AIModelSelector.tsx`, `src/app/dashboard/settings/page.tsx`; compact selector also in `src/components/dashboard/Header.tsx` |
| **AI Analyst (advisory drawer)** | `src/store/useAnalystStore.ts` (UI/chat only — never writes `useFinModelStore`), `src/lib/constants/aiAnalystPrompts.ts`, `src/lib/analyst-doc-routes.ts`, `src/lib/analyst-research-snapshot.ts` (component-scoped snapshot + stored `reasoning_notes`), `src/lib/doc-text-extractor.ts`, `src/hooks/useAnalystContext.ts`, `src/components/ai-analyst/AIAnalystDrawer.tsx` (footer: “Still stuck? Talk to a human on Telegram”), `GET /api/analyst-context?stepId=` (live `fs` read of `src/app/docs/**/page.tsx`); mounted in operational/sale layouts; hidden on Dashboard, Settings, and Feasibility Study |
| **Support Telegram links** | `src/lib/constants/support.ts` (`SUPPORT_TELEGRAM_URL` = `https://t.me/FeasiBuild_Support_Bot`, `buildSupportLink`, `buildWizardSupportContext` e.g. `ops-C1-S6`), `src/hooks/useSupportWizardContext.ts`, `src/components/support/WizardSupportButton.tsx` (lifebuoy next to Audit trail on ops/sale layouts) |
| **Customer support agents** | Telegram Concierge: `POST /api/support/telegram` (`src/app/api/support/telegram/route.ts`). Priority email: `POST /api/support/email` (`src/app/api/support/email/route.ts`) + `src/lib/entitlements.ts` + `src/lib/support-resend.ts`. Ops Discord: `src/lib/ops-monitor.ts` (`sendOpsAlert`). |
| **Monetization / PayPal** | `src/lib/pricing.ts` (`ONE_TIME_PRODUCTS`), `src/lib/subscription-metadata.ts`, `src/lib/validity.ts` (`effectiveCredits`, `isUnlimitedActive`), `src/lib/paypal.ts`, `src/app/api/paypal/create-order/route.ts`, `capture-order/route.ts`, `src/app/api/webhooks/paypal/route.ts`, `src/components/ui/UpgradeModal.tsx`, `LowCreditBanner.tsx` |
| **Entitlements / report gating** | `src/lib/entitlements.ts` (`getCustomerTier`, `hasWhiteLabelAccess`). Report/export: `src/lib/report-entitlements.ts` (`evaluateExport`, `recordExport`, `canCreateProject`); credit consume `src/app/api/subscription/consume-credit/route.ts`. Hooks: `useReportExportGate`, `useCanCreateProject`, `useSubscription`. |
| **White-label logo** | `src/lib/brand-logo.ts` (Secure KV `brand_logo` + `brand_logo_height`, 40–200px default 64). UI: `LogoUploadControl.tsx` on the title slide (Unlimited Pack always; Professional only with 100-Pack). |
| **Feasibility chrome** | `SlideHeader.tsx` (page numbers via `SlidePaginationProvider`); `SlideWatermark.tsx` (Explorer only); `FitSlide.tsx` (overflow scale-to-fit); `ReportUpgradeModal.tsx`; PDF capture hides upload/upsell via `data-pdf-hide`. |
| **Landing / pricing / comparison / legal** | `src/components/landing/PricingSection.tsx` (`#pricing`); `src/components/landing/Footer.tsx`; `src/components/landing/TechnologySection.tsx` (“AI Engine (Qwen, Claude & OpenAI)”); `src/app/comparison/page.tsx` (Legacy Desktop Suite / Regional Cloud SaaS / AI Consultancy — no named vendors); navbar `/#pricing`; legal pages `/terms`, `/refund-policy`, `/privacy-policy`; `UpgradeModal` purchase disclaimer |
| **Learn / FAQ / Vault** | `src/app/blog/**`, `src/content/blog/**`, `src/components/blog/**`; `src/app/faq/**`, `src/content/faq/faqs.ts`; `src/app/vault/**`, `src/content/vault/studies.ts`, `src/components/vault/VaultLibrary.tsx`; PDFs `public/vault/*.pdf` |
| **Maps (Leaflet)** | `src/components/LocationMapPicker.tsx`, `src/components/feasibility/slides/ProjectLocationMap.tsx` — import `leaflet/dist/leaflet.css`; single-host OSM tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; `invalidateSize()` on mount/resize. |
| **Field source tagging** | `src/lib/field-value-source.ts` (`ai` / `override` / `default`); `src/components/ui/AiInput.tsx` (blue AI / orange user-typed only / grey default; local string state while focused). |
| **Secure Puter KV (Clerk isolation)** | `src/lib/secure-puter-kv.ts` — **only** module that calls `puter.kv.*`. Keys: `feasi_build_{clerkUserId}_{logicalKey}`. Strips legacy `feasibuild_{userId}_` / double prefixes via `toLogicalKvKey`. Retries get/set/del (3×, 1s→2s backoff). `SecureKvUserBinder` + `getSecureKvUserId()` for lib callers. Auth probe: `probePuterKvAccess`. |
| **KV migration** | `src/lib/migrate-puter-kv.ts` — `migrateOldPuterKeys` + `PuterKvMigrationTrigger` (once per signed-in session). Copies legacy / double-prefixed keys → namespaced, then deletes old. Mounted in `src/app/layout.tsx`. |
| **Project storage** | `src/lib/puter-storage.ts` (local-first write via `writeLocalKvValue`, then Secure KV), `src/lib/project-save.ts` (`buildAndSaveProject`, `saveProjectToKV`) |
| **Optimistic save UI** | `src/hooks/useOptimisticProjectSave.ts`, `src/hooks/useNetworkStatus.ts`, `src/components/header/SaveProjectButton.tsx` (nav-bar only — no duplicate C1 page button). States: Saved Locally (≥500ms) → Syncing → Synced / Retry; auto-retry on reconnect. |
| **JSON sanitizer (verbose LLMs)** | `src/lib/extract-json-from-claude.ts` — used by `useAiResearch.ts` and chart parsing in `ai-service.ts`. Unwraps double-serialized / quoted JSON, repairs truncated payloads; error copy is model-agnostic (“Model returned non-JSON…”). |
| **Shared UI helpers** | `src/components/ui/AiInput.tsx` (source badges + focused local string — no mid-typing reverts; avoid `string === number` comparisons under TS strict narrowing) |

### 2.6 BYO Puter storage & save UX

- **Isolation:** Every Puter KV read/write for projects, AI caches, hashes, and preferences goes through `secureKv` with the Clerk `userId`. Do **not** call `window.puter.kv` outside `secure-puter-kv.ts` (except migration raw helpers exported from that same module).
- **Key shape:** Logical keys from `puter-storage` / cache / preferences are cleaned then stored as `feasi_build_{userId}_{cleanKey}` (e.g. `proj_…`, `user_preferences`, `feasibuild_cache_…`).
- **Optimistic save:** Persist to `localStorage` first (`{userId}:{key}`), show **Saved Locally**, then background sync to Puter with Secure KV retries. Failed syncs show **Retry Save** and retry when `navigator.onLine` returns.
- **Single Save control (Operational):** Only `SaveProjectButton` in `operational/layout.tsx` / `sale/layout.tsx`. In-page save on `cash-outflows` was removed to prevent duplicate project IDs.
- **Auto-save on study & export:** `buildAndSaveProject` runs automatically (both streams) when the feasibility deck first builds successfully and again before PDF export. Reuses the optimistic save pipeline (local-first → Secure KV); reuses the session project id, mints `proj_…` only when none exists; minting a **new** id is gated by `canCreateProject` (Explorer lock); one toast per project (“Project saved — it now appears on your dashboard”); nav-bar `SaveProjectButton` reflects the auto-save state.

**Sale feasibility deck rules (presentation, not engine math)**

- Title / market templates resolve from `buildingSubType` via `sale-stream-config.ts`. Unknown subtypes still default to **Residential-High-Rise** — always map new subtypes explicitly.
- **`sale-escrow` slide** (“Escrow Withdrawal Configuration”) is included **only** when `buildingSubType` includes `"residential"`. Commercial / warehouse decks skip it. Headings use the selected rule name (not country/RERA labels).
- **HDA construction deposit (Component 4 table):** `hdaDepositApplies()` in `generate-cash-flow.ts` + `hdaDepositEnabled` in `financing-cash-flow-engine-bridge.ts`. Applies only when rule = `progress` **and** jurisdiction = `MALAYSIA` **and** `financingModel !== "commercial"`. Preview (`cash-flow-table-malaysia.tsx`) and Excel export (`build-financing-cash-flow-export.ts`) hide the **Capital—HDA deposit** row otherwise. Malaysian residential is unchanged.
- Development Assumptions for warehouse uses CapEx lines from `buildSaleCashflowDetailProfile` → `warehouseCostLines` on `SaleDevelopmentCostsSlide`.

### 2.7 Customer support (Telegram + priority email)

Two agents share the founder’s Telegram bot (`@FeasiBuild_Support_Bot`) as the human-review console. **No financial engines are involved.** Clerk does not protect `/api/support/*`.

| Agent | Who | Path | Behavior |
|-------|-----|------|----------|
| **Agent 2 — Telegram Concierge** | All users (free) | `POST /api/support/telegram` | Webhook secret `x-telegram-bot-api-secret-header` / `…-secret-token` vs `TELEGRAM_WEBHOOK_SECRET`. Dedupes last 100 `update_id`s. `/start` [payload] maps `ops-C1-S6` → “Operational · Component 1 · Step 6” (`describeSupportStartPayload`); stores `came_from` per chat for Discord escalations. FAQ via **server Puter** JSON triage (`BUG` / `BILLING` / `FEATURE` / `FAQ`). Founder-only `/reply <chat_id> <text>` (`FOUNDER_TELEGRAM_ID`). Always 200 to Telegram after the secret check. |
| **Priority Email (Pro / Unlimited Pack)** | Paying tiers | `POST /api/support/email` | Resend `email.received` is **metadata only** — fetch body via `GET /emails/receiving/{id}` (`src/lib/support-resend.ts`). `getCustomerTier(email, subscription)` (`src/lib/entitlements.ts`): Clerk `publicMetadata.subscription` first; unknown → **`explorer`**. Explorer auto-replies pointing at Telegram. Pro / Unlimited Pack: server Puter draft (`gpt-4o-mini`, 60s timeout) → founder Telegram block with `---DRAFT---` / `---END---`. Founder **must Reply** to that message: `/send`, edited text, or `/reject`. Bare `/send` without Reply is **not** triaged — bot explains the Reply gesture. Outbound from `FeasiBuild Support <owner@feasibuild.app>` with `In-Reply-To` / `References`. |

**Env:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `FOUNDER_TELEGRAM_ID`, `PUTER_AUTH_TOKEN`, `RESEND_API_KEY`, `VAULT_NOTIFY_EMAIL`, `GOOGLE_SHEET_WEBHOOK_URL`, `DISCORD_OPS_WEBHOOK_URL`.

**Discord ops alerts:** `sendOpsAlert` renders `user_context` as clickable `https://t.me/username` (never `tg://`). No username → instruct `/reply <chat_id> <message>`. Sources `Support Bot Escalation` / `Support Bot Feature Request` skip Puter summarization.

### 2.8 Feasibility study branding, pagination, and export gating

Applies to **both** Operational and Sale 16:9 decks. **No financial engines or `useFeasibilityStore` data shape.**

| Rule | Behavior |
|------|----------|
| **White-label logo** | Unlimited Pack: always. Professional: 100-Pack (`whiteLabel` on grant, or `PRO_LOGO_PACK_ALLOWLIST`). Explorer: never (upsell in edit mode). Logo data URL + height in Secure KV (`brand_logo`, `brand_logo_height`). Title slide: centred above the main title; slider 40–200px (default 64). |
| **Page numbers** | Title slide (index 0) has none. Slide 2 of N is `Page 1 of N-1`. Number sits on the subtitle row, top-right, via `SlideHeader` + `SlidePaginationProvider`. |
| **FitSlide** | `src/components/feasibility/FitSlide.tsx` scales overflowing body (text, charts, tables) into the 16:9 canvas; PDF export uses the same scaled layout. |
| **Charts** | Data-reactive — remount when series arrive (fixes first-run empty charts). `generateChartData` never fails the deck. |
| **No source footers** | Prompts include `NO_SOURCE_ATTRIBUTION_CONSTRAINT`; parser/display strip lines starting with `Source:` / `Sources:` (`clean-ai-content.ts`). |
| **Clear cache copy** | “Clear AI Cache & Regenerate” dialog text is **dynamic per asset class** — never hardcode Data Centre. |
| **Explorer watermark** | Diagonal “FeasiBuild · Free Preview” + footer banner on every slide (incl. title). `pointer-events-none`. Present in PDF. Professional (credits) / Unlimited Pack: clean. |
| **Export / credits** | **Clean PDF requires a credit (`effectiveCredits > 0`) or an active Unlimited Pack.** Explorer: one watermarked PDF (`fs_exports_used`), then lock. Unlimited Pack: never consumes credits. Failed PDF jobs do not consume. |
| **Explorer dashboard lock** | After the free report is consumed, **no new project creation** (dashboard buttons, sidebar “New … Study”, minting a new `proj_…` on save). Existing projects stay openable / editable / regenerable. |

### 2.9 Monetization & pricing

One-time PayPal products only. **There is no monthly subscription SKU.**

| Product | Price | What it unlocks |
|---------|--------|-----------------|
| **Explorer** | Free | 1 watermarked report; then dashboard lock |
| **Professional** | **$99 one-time lifetime** | Unlocks pack / Unlimited Pack purchases; unlimited projects |
| **1 / 10 / 50 / 100 credit packs** | **$49 / $390 / $1,450 / $1,900** | 12-month validity; **one active pack at a time**. 100-Pack includes logo branding |
| **Unlimited Pack** | **$2,400 / 12 months** | Unlimited clean reports + white-label for 12 months from purchase |

**Strict repurchase:** no pack or Unlimited Pack purchase while `effectiveCredits > 0`. Enforced in `create-order`, `capture-order`, **and** the PayPal webhook. Expired pack → `effectiveCredits = 0` (auto-unlocks repurchase). A new pack **replaces** the expired balance — never adds.

**Clerk `publicMetadata.subscription`:** `{ plan, lifetime, unlimited, whiteLabel, reportCredits, packPurchasedAt, unlimitedPurchasedAt, processedOrderIds }`. ISO timestamps **must use uppercase `Z`** (Safari rejects lowercase `z`). `Date.toISOString()` is correct.

**UI:** `UpgradeModal` amber lock + “Current pack expires on …” + disabled pack/Unlimited buttons when credits > 0. Low-balance banner at **1–2 credits** (`LowCreditBanner`, session-dismissible **per credit count**). Navbar badge: **`Pro • N credits`** / **`Advisory • Unlimited`** (display label for an active Unlimited Pack — not a separate SKU).

**Code note:** `getCustomerTier` may return `"advisory"` meaning **active Unlimited Pack**. Do not add a monthly billing product.

### 2.10 Content, SEO & lead capture (16 Sep 2026)

**Payment structures (copy + research):** Native presets for Dubai Law No. 8, Malaysia HDA and Australia's 10/90 — plus a configurable payment-structure engine (no escrow, custom splits like 20/80 or 30/70, staged escrow with custom retentions) for any location on earth. Pin-drop sets the country; user sets the rules. AI market research is tailored to the pin-dropped location, reverting to the nearest city when hyper-local data is thin.

⚠️ **NEVER pair UK with 10/90 — UK does not use it. Australia only.** Do not use UK as a 10/90 example in articles, FAQ, decks, or defaults.

**Funnel:** LinkedIn posters → blog depth → FAQ (AI-search citations) → Vault (email capture) → Explorer → $99 lifetime. Forums/Reddit = expert value comments (9:1 value-to-link ratio, disclosed affiliation) linking to blog articles.

#### `/blog` (nav label “Learn”)

10 long-form articles, markdown-based (`src/content/blog/articles/<slug>.md`), searchable index, related-cards auto-rendered. Page-level conversion = author-free CTA button **“Try FeasiBuild free”** (bio line removed by owner's choice).

| # | Slug | Voice |
|---|------|--------|
| 1 | `how-to-write-a-real-estate-feasibility-study` | Neutral — no product mentions in body |
| 2 | `dscr-explained-for-real-estate-developers` | Neutral |
| 3 | `irr-vs-equity-multiple-explained` | Neutral |
| 4 | `feasibility-study-vs-appraisal` | Neutral |
| 5 | `ai-vs-excel-real-estate-proforma` | Neutral |
| 6 | `real-estate-development-financial-model` | Neutral |
| 7 | `how-to-present-to-an-investment-committee` | Neutral |
| 8 | `ai-tools-for-real-estate-underwriting` | Neutral |
| 9 | `best-feasibility-study-software-2026` | Openly branded comparison |
| 10 | `feasibuild-vs-the-market-2026` | Openly branded comparison |

**Voice rule:** articles #1–#8 are written as if the author does not know FeasiBuild; no product mentions in body. #9–#10 are openly branded comparison pages. Conversion lives at page level only.

#### `/faq`

12 snippet-length (40–60 word) answers in 4 groups (Basics, Metrics, Comparisons, Product). FAQPage JSON-LD schema. Each answer links to its blog deep-dive. Source: `src/content/faq/faqs.ts`.

#### `/vault`

Gated sample library. 3 watermarked PDFs at `/public/vault/`:

| File | Stream | Notes |
|------|--------|--------|
| `residential-rak-uae.pdf` | Sale | High-rise, Ras Al Khaimah |
| `residential-dongguan-china.pdf` | Sale | Pin-drop proof (no native preset) |
| `datacentre-penang-malaysia.pdf` | Operational | Tier IV colocation |

**Ladder:** email gate → view all in-browser + download **ONE**; free Explorer account unlocks all downloads. Australia office study exists but is **withheld** (reserve asset).

#### Competitor set (comparisons only)

Pricing as of **Sep 2026**. **Verify-before-claim** — do not invent or round numbers in copy.

| Name | Pricing (Sep 2026) |
|------|---------------------|
| ARGUS | (verify before claim) |
| EstateMaster | $500–3K/mo |
| AIRE | ~$7K/study |
| Feasibility.pro | $99/mo |
| Buildora IQ | $69/mo |
| Feasly | $49/mo |
| Archistar | from ~$63/mo |

**DealCheck excluded by owner's decision.** Named brands belong on blog #9–#10 only. Landing `/comparison` stays anonymous (Legacy Desktop Suite / Regional Cloud SaaS / AI Consultancy).

#### Lead capture

Vault gate POSTs to `/api/vault-lead` → Resend email to `owner@feasibuild.app` (`VAULT_NOTIFY_EMAIL`; Reply-To = lead's email); fail-open UX with `localStorage` pending-lead retry (`fb_pending_leads`); honeypot field `hp`. Optional sheet POST when `GOOGLE_SHEET_WEBHOOK_URL` is set. **Phase 2 (not built):** Zoho Campaigns list + nurture sequence.

### 2.11 Payments (PayPal LIVE)

- **One-time orders only** (`intent: CAPTURE`). No PayPal subscription plans.
- **Env (all live):** `PAYPAL_MODE`, `NEXT_PUBLIC_PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- **CRITICAL — webhook URL:** register **`https://www.feasibuild.app/api/webhooks/paypal`** (www). The apex host 308-redirects; PayPal does **not** follow redirects (that produced `FAIL_SOFT` deliveries).
- **Event:** `PAYMENT.CAPTURE.COMPLETED`. Idempotent grants via `processedOrderIds` (+ private `paypalGrantedOrders`).
- Checkout return/cancel: `src/lib/paypal.ts` (`PAYPAL_RETURN_URL` / `PAYPAL_CANCEL_URL`).
- Legal: `/terms` + `/refund-policy` live; landing footer + upgrade modal.

---

## 3. AI Functionalities

Two AI layers on the **client via Puter.js** (script: `https://js.puter.com/v2/` in `src/app/layout.tsx`). The user picks the LLM; FeasiBuild never holds vendor API keys (BYO Puter). Optional server Qwen via env for some API routes.

### 3.1 Market research during Costs & Income (C1 / C2)

| Item | Detail |
|------|--------|
| **Hook** | `src/hooks/useAiResearch.ts` → `performResearch()` |
| **API** | Client `puter.ai.chat` (script: `https://js.puter.com/v2/` in `src/app/layout.tsx`) |
| **Model** | User-selectable via Secure Puter KV (`getPreferredModel()` → logical key `user_preferences`); catalog in `src/lib/puter-models.ts`. Provider-prefixed ids: default **`qwen/qwen3.7-plus`** (keep the working id), `anthropic/claude-sonnet-4-6`, `openai/gpt-4o-2024-08-06`. Unknown / failed / retired KV ids → Qwen. Fallback chain: **selected model → Qwen** (`chatWithPuterFallback`) with a user-facing notice banner. **Public copy** (docs Getting Started, landing Technology Stack, privacy policy, comparison BYO-AI row) must list **Qwen (default), Claude, or OpenAI via Puter** — never a fourth vendor. |
| **Extraction** | Puter `response.message.content`; strip markdown fences; `extractJsonFromClaudeResponse` for JSON. Research **skips `type:"reasoning"` stream chunks**. Unparseable stream → retry `stream: false`. |
| **Options** | `stream: true`, `temperature: 0.1`, `max_tokens: 8000` (Claude **12000**). Claude also sends `response_format: { type: "json_object" }` when Puter forwards it. |
| **Prompts** | `src/lib/constants/aiPrompts.ts` — `getSystemPrompt(assetType, model?)` appends **Claude-strict JSON rules** when the id contains `claude`; plus `buildUserPrompt`, `normalizeAiResearchData`, per-asset `AI_PROMPTS`. Commentary/prompts include `NO_SOURCE_ATTRIBUTION_CONSTRAINT` (no “Source: …” footers). |
| **JSON parse** | `extractJsonFromClaudeResponse` — strips `<reasoning>`, fenced ```json```, brace-balanced objects. |
| **Auth / status** | `src/lib/puter-auth.ts`, `src/lib/cache-service.ts` (`checkPuterStatus` → `probePuterKvAccess`). AI caches / slide hashes also go through Secure KV when a Clerk user is bound. |
| **UI** | `BenchmarkProfile.tsx`, `BenchmarkHeader.tsx`; fills C1/C2 fields from structured JSON via `applyAIValues` / `fieldSources`: **`ai`** (blue badge), **`override`** (orange, **user-typed only**), **`default`** (grey). `AiInput` keeps a local string while focused so research refresh cannot revert mid-typing. |

**Sale asset → AI type map (`SALE_SUBTYPE_TO_AI_ASSET` in `sale/cash-outflows/page.tsx`)**

| `buildingSubType` | `AiAssetType` |
|-------------------|---------------|
| `residential_landed` | `sale-residential-landed` |
| `residential_high_rise` | `sale-residential-highrise` |
| `commercial_landed` | `sale-commercial-landed` |
| `commercial_strata_office` | `sale-commercial-strata` |
| `commercial_strata_warehouse` | **`sale-warehouse`** |

- **`sale-warehouse`** uses warehouse industrial system prompt + dedicated `buildSaleWarehouseUserPrompt` (warehouse C1 rates + `c2_sales`, not high-rise schema).
- Warehouse rates land in `warehouseCosts` and flat fields (`warehouseBuildingRate`, dock/parking/specialised rates, `ffePercent`, etc.).
- Step 8 SC/POWC/**FF&E** share benchmark override detection + “Reset to benchmark” for warehouse.

**Typical JSON (`AiResearchResult`)**

- Required: `fx_rate_to_usd`, `c1_development` (rates, soft costs, land, construction period, breakdowns)
- Optional: `c2_operational` / `c2_sales`, `hints`, `guardrails`
- Optional per phase: `reasoning_notes?: Record<string, string>` on `c1_development`, `c2_operational`, and `c2_sales` (4–6 field→sentence rationales, max 25 words, market-specific). Travels inside the existing research JSON — **no new Puter KV keys**. `normalizeAiResearchData` preserves notes when present and must not drop other fields when they are absent (legacy caches/projects).
- Retail / office / BTR often **two-phase** (C1 first; C2 after GLA / config is set)
- Warehouse C2 schema + helpers: `src/lib/warehouse-ai-c2.ts`; UI `c2s1`–`c2s4` under `operational/cash-inflows/components/`

### 3.2 Market research & content for the Feasibility Study report

| Item | Detail |
|------|--------|
| **Client path (primary)** | `src/lib/ai-service.ts` — `getPreferredModel()` (default `qwen/qwen3.7-plus`); commentary temp `0.6` (Claude `0.3`); JSON/chart temp `0.1` + `response_format` json_object; max tokens `6000`; streaming preferred |
| **Ops enrich** | `src/lib/feasibility/enrich-operational-slides-puter.ts` → asset generators (`generate-hotel-report.ts`, `generate-shopping-mall-report.ts`, `generate-office-report.ts`, `generate-btr-report.ts`, `generate-warehouse-report.ts`, **`generate-data-centre-report.ts`**) |
| **Sale enrich** | `src/lib/feasibility/sale/enrich-sale-slides-puter.ts`, `generate-sale-report.ts`, `create-sale-puter-prompts.ts` (warehouse-aware prompts when `assetLabel` is warehouse/industrial) |
| **Sale subtype → deck template** | `sale-stream-config.ts` — e.g. `commercial_strata_warehouse` → `"Commercial-Strata-Warehouse"` / asset label `"Commercial - Strata Warehouse"` |
| **Data bundle** | `data-aggregator.ts` (`getFeasibilityProjectBundle`), sale `sale/sale-context.ts` |
| **Commentary helpers** | `generate-*-commentary.ts`, `clean-ai-content.ts` (`NO_SOURCE_ATTRIBUTION_CONSTRAINT` + `stripSourceAttributionLines`), `commentary-prompt-utils.ts`; warehouse ops: `generate-warehouse-commentary.ts`, `build-warehouse-market-data.ts`; **data centre ops:** `generate-data-centre-commentary.ts`, `build-data-centre-market-data.ts`, `data-centre-context.ts` (hard DO NOT warehouse/BTR/retail/hotel; cache keys scoped by `buildingType`); sale fallbacks: `generate-sale-commentary.ts` |
| **Operational AI charts** | See modules below — wired from `enrich-operational-slides-puter.ts` with Puter + cache + static fallbacks |
| **Server optional** | `src/lib/feasibility/qwen-commentary.ts` + `src/app/api/feasibility/*` using `FEASIBILITY_AI_URL` / `FEASIBILITY_AI_API_KEY` / `FEASIBILITY_AI_MODEL` (default `qwen-plus`) |
| **Deck sections** | Title → Executive (A) → Project (B) → Market (C) → Financial (D); editable in `useFeasibilityStore`; export via `pdf-export.ts` |

**Puter streaming resilience (`ai-service.ts` + `useAiResearch.ts`)**

- Puter streams typed chunks (`type: "text" | "reasoning" | "error" | …`). Answer text comes from `type:"text"`; reasoning is skipped for slides and for C1/C2 JSON (last-resort only if no text arrives).
- Empty stream → retry with `stream: false`; still empty → throw with prompt preview logging.
- Chart JSON uses `extractJsonFromClaudeResponse` (unwrap quoted/double-serialized JSON, salvage truncated payloads). **`generateChartData` is quiet:** extraction is wrapped in try/catch with `extractJsonFromClaudeResponse(content, { quiet: true })`; any failure (parse or Puter) → a **single** `console.warn` `"[generateChartData] chart JSON unavailable — skipping chart."` and `return null`. Never throws, never `console.error`s. Callers skip or keep static fallbacks so the deck still builds and exports.
- `extractJsonFromClaudeResponse` accepts `{ quiet?: boolean }` (suppresses its `console.error`s; still throws) and an **S5** strategy: payload starts with `"` and contains `\"` → unescape (`\"` → `"`, `\n` → newline, `\\` → `\`), then truncation repair (string-aware scan; cut at last complete element; close open brackets) and `JSON.parse`; partial `charts` arrays accepted. Research / C1–C2 path is unchanged (non-quiet). Chart calls use compact-raw-JSON prompts and `max_tokens: 8000`.
- Sale commentary (`generateSaleCommentary`) catches AI failures and uses `generateSaleCommentaryFallback` so the deck still builds.

**Claude Sonnet 4.6 note:** Prefer the Puter id `anthropic/claude-sonnet-4-6` (hyphen). Sonnet often emits markdown CoT; never treat reasoning text as the research payload.

**Operational AI chart modules**

| Module | Role |
|--------|------|
| `src/lib/feasibility/operational-macro-chart.ts` | Operational-specific AI macro charts (GDP, Population, Inflation) with caching; Sale prompts copied without Sale imports |
| `src/lib/feasibility/operational-market-charts.ts` | Unified dynamic market charts for all Operational assets: Market Metrics, Supply Pipeline, Tenant Profile (retail / office / BTR / warehouse / datacentre) |
| `src/lib/feasibility/hospitality-market-charts.ts` | AI chart generation for 8 Hotel market slides: T&T Demand, Arrivals (historical / projected), ADR/Occupancy, Revenues, Supply, Guests, Length of Stay |

**Enrichment order (Operational Puter):** macro → (hotel hospitality charts when `assetType === "hotel"`) → market metrics → supply pipeline → tenant profile.

**Prompt patterns:** institutional tone, anti-placeholder rules, **no “Source:” attribution footers**, length caps (e.g. 5–6 bullets / ≤150 words for commentary), deterministic **fallback paragraphs** when Puter fails, slide cache keys via component hashes. “Clear AI Cache & Regenerate” copy is per asset class.

**Deck layout:** wrap overflowing slides in `FitSlide` so text/charts/tables scale into 16:9 (PDF parity). Charts remount when data arrives.

### 3.3 AI Analyst (advisory co-modeler)

Slide-out right drawer on C1–C6 wizard (and preview) pages. **Advisory only in V1** — it must not write into `useFinModelStore` / `useSaleModelStore`.

| Item | Detail |
|------|--------|
| **UI** | `AIAnalystDrawer` — bottom-right “Analyst” pill; ~400px right drawer. Hidden on Dashboard, Settings, and Feasibility Study. |
| **State** | `useAnalystStore` — `isOpen`, `messages`, `isLoading`, `contextKey`, `generation`. Isolated from the financial model store. Conversation is scoped to the live context: thread resets automatically on step / stream / asset-type change (`contextKey = stepId::stepNumber::assetType`); in-flight replies discarded via a generation guard; Tier-2 doc-text cache retained. |
| **Tier 1** | `getAnalystSystemPrompt(...)` — persona, AI-expectation defense (benchmarks are directional baselines, not live valuations), floor-counting, sqft/unit-agnostic, gap-fill, 1-month offset. When `sectionFound`, the prompt must answer **this step only**. If the research snapshot contains `ORIGINAL RESEARCH REASONING (stored verbatim):`, quote those notes verbatim then restate the directional-baseline reminder; if absent (pre-feature projects), reconstruct from hints/guardrails. |
| **Tier 2** | `useAnalystContext` builds `stepId` from pathname + live wizard step (`useReportWizardStep` / `?step=`) + asset type, fetches `GET /api/analyst-context?stepId=&stepNumber=`, caches per `stepId` + step number. API reads live `src/app/docs/**/page.tsx` via `fs`, strips with `extractDocText()`, then slices with `extractStepSection`. Inner C1–C6 steps map to the parent Component doc (no per-step MDX files exist). Full-doc fallback when `sectionFound` is false. |
| **Tier 3** | `buildResearchSnapshot` in `src/lib/analyst-research-snapshot.ts` (~2,000 char cap). C1 = cost-side; C2 = revenue-side only (C1 cost notes injected only on explicit cost-guardrail questions). Stored `reasoning_notes` are listed ahead of generic hints when truncating. |
| **Model** | `getPreferredModel()` (Secure KV). `puter.ai.chat` with `stream: true`; skip `type:"reasoning"` chunks; empty stream retries `stream: false`. |
| **Human escalate** | Drawer footer + wizard lifebuoy open `buildSupportLink(ops-C1-S6)` so `/start` carries wizard context. |

### 3.4 Support-bot server Puter (not BYO client)

Unlike C1/C2 research and the Analyst drawer, **support agents call Puter from the Next.js server** with `PUTER_AUTH_TOKEN` (`POST https://api.puter.com/drivers/call`, `stream: false`).

| Call | Model | Notes |
|------|--------|--------|
| Telegram FAQ triage | `DEFAULT_MODEL` (`qwen/qwen3.7-plus`) | JSON `{ intent, reply }`; tolerant brace extract |
| Priority email draft | **`gpt-4o-mini`** | Max 4 sentences; 60s abort; log `Puter draft took {ms}ms`; on failure the founder still gets the review block with “AI drafting unavailable — reply manually.” |

Do not use `window.puter` in these routes.

---

## 4. Core Financial Logic (The Calculation Engine)

### 4.1 Gap-Fill Rule (Equity)

**Rule:** Equity gap-fill covers **negative cash flows on the cumulative NCF (Post-Financing)** so that cumulative balance **never drops below 0**.

- Inject **only enough** cash equity to restore cumulative post-financing NCF to ≥ 0 (not a full upfront equity plug).
- Land equity (when configured) is applied first; remaining shortfall → cash equity injection.

**Canonical implementation (Operational C4):**  
`src/app/operational/engine/c4.levered.engine.ts`

```text
preEquityCumulative = prevCumNcfPost + ncfPre + loanDrawdown + debtService
afterLandEquity     = preEquityCumulative + landEquityInjection
if afterLandEquity < 0 → cashEquityInjection = |afterLandEquity|
cumulativeNcfPost   = afterLandEquity + cashEquityInjection   // ≥ 0
```

Mirrored in financing preview pages. Sale stream uses RCF / facility draws first where applicable, then **backstop equity** so cumulative NCF returns to 0 (`src/lib/financing-engine/generate-cash-flow.ts`).

**Sale (same module):** gap-fill runs over the **full horizon**, including the land-loan bullet month. Displayed cumulative NCF is a **continuous running sum** (never wiped by equity distributions). There is **no equity sweep while the land loan is outstanding**. Tail cash-equity injections (including a bullet-month shortfall plug) enter `capitalCash` / cumulative capital / `irrCashFlow` as **negatives**.

### 4.2 1-Month Offset Rule

Applied so interest and certain escrow movements use **prior-period balances** (or lag certification by one month):

| Item | Behavior | Where |
|------|----------|--------|
| **Escrow / trust interest income** | Month `m` interest on **prior** escrow/trust balance; typically `m > 0` | `generate-cash-flow.ts` |
| **Progress withdrawals (UAE/KSA)** | Certify on interval month; **withdraw the following month** | `applyUaeKsaEscrowLogic` |
| **Construction / RCF interest payments** | Interest at `M{t}` on balance at end of `M{t-1}` | Sale engine + ops `c4.levered.engine.ts` (IDC lag) |

### 4.3 Levered Equity IRR Solver Rules

**Negative cash flows (Equity Injection)**  
- Months with `equityInjection > 0` contribute **`-equityInjection`** to the levered equity IRR series.

**Positive cash flows (NCF Post-Financing)**  
- Headline C4 series (`c4.levered.engine.ts`): positive CF is typically the **terminal** cumulative NCF post-financing at exit / hold terminal month; intervening months without injection are `0`.
- Common-equity / Component 5 metrics (`equity-metrics.ts`, `true-common-distributions.ts`):
  - Cutoff = `max(last equity injection month, last negative NCF post month)`
  - Positive distributions = NCF Post-Financing at counted operating-year FYE months **strictly after** that cutoff through exit FYE
  - IRR series: `-equity` until distributions start; thereafter FYE NCF posts on counted months only

**Solvers**

- `src/lib/equity-irr.ts` — Newton-Raphson + multi-guess + bisection; `annualIrrPercentFromMonthlySeries`
- `src/lib/irr-calculations.ts` — `solveAnnualIRRPreferred` / shared points
- Sale engine also uses `solveIrrAndNpv` in `generate-cash-flow.ts`

### 4.4 Construction-end calendar (C3 = C4)

`actualConstructionEnd` = last non-zero month of the C1 construction S-curve (`src/lib/construction-end.ts`), else C1 `constructionPeriod`.

| Quantity | Formula | Example (28-mo hotel) | Example (24-mo) |
|----------|---------|------------------------|-----------------|
| Construction end | `actualConstructionEnd` | M28 | M24 |
| Pre-op buffer end | `actualConstructionEnd + 6` | M34 | M30 |
| Operations start | buffer end + 1 | M35 | M31 |

Revenue ramp, opex, working capital, renovation FYE columns, land-loan bullet (CP+6), retention/DLP, and terminal-value month all use this calendar. C3 and C4 month grids (pre-operating band + ops start) **must match**.

### 4.5 Horizon-aligned preview rows

C4 construction / land / FF&E / soft / POWC display rows are built with `src/lib/financing-preview-rows.ts` to the **same horizon** as totals. Construction cash lives on M0…M{constructionEnd} only — do not plug S-curve remainder into a post-completion cell. In development: `row.length === horizon` and `sum(row) === displayed total`.

---

## 5. Escrow Withdrawal Rules (mechanisms, not countries)

Canonical rule ids: `EscrowRuleId = 'ten_ninety' | 'staged' | 'progress' | 'none'` in
`src/lib/financing-engine/escrow-rules.ts`. Engine horizon and monthly router follow the
**selected rule**, never the country bucket.

Display names: **10/90 Rule**, **Staged Escrow Rule**, **Progress Drawdown Rule**, **No Escrow Rules**.

Escrow UI: `src/app/sale/financing/escrow-config/{Uae,Malaysia,Australia}EscrowConfig.tsx`
(panel titles are rule names). **One 8-step wizard** (`residential-wizard.tsx`) for **every** sale asset class:

1. Project Summary → 2. Debt Sizing (LTC & LTV) → 3. Land Ownership & Equity → 4. Preference Shares → 5. Escrow Withdrawal Config → 6. Drawdown Structure → 7. Interest, IDC & Escrow Income → 8. Sales & Escrow Recycling.

`JURISDICTION_RULES` + `defaultEscrowRuleForLocation`: location + asset class only **pre-select** a default; all four tabs remain selectable everywhere. Projects with no stored escrow rule pick up that default on next open.

**Location + asset-class defaults (never hard-linked in the engine)**

- Dubai/UAE → Staged Escrow Rule (all asset classes) (CP+12)
- Australia → 10/90 Rule (all asset classes) (CP+12)
- Malaysia residential → Progress Drawdown Rule (CP+24)
- Malaysia commercial → No Escrow Rules (CP+6)
- All other locations (KSA, Abu Dhabi, RAK, Sharjah, Ajman, Fujairah, Thailand, China, **UK**, …) → No Escrow Rules (CP+6)

**Backward compatibility:** stored modes `uae`/`malaysia`/`australia`/`none` map to the new ids.
Missing stored `escrowRule` → apply **location + asset-class default on open** (Dubai staged, AU 10/90, MY residential progress, MY commercial none, else none). Do not force `none` just because the field was empty.

### 5.1 Staged Escrow Rule (default: Dubai — all off-plan classes)

- Certification every 3/6 months during CP; withdrawal **+1 month** after certification.
- Retention % user-editable (default 5), held until practical completion + defect liability; residual sweep at **CP+12**. Horizon **CP+12**.
- Non-Dubai projects using this rule keep **unlocked** land equity; the land term loan rows (draw, interest, bullet) appear in the monthly projection under this rule like any other.

### 5.2 Progress Drawdown Rule (default: Malaysia residential)

- Milestone/S-curve drawdowns (HDA-style). Post-VP retention through VP+24 when this rule is selected. Horizon **CP+24**.
- **HDA construction deposit** (default 3% of construction cost at M0; interest with final release at **CP+24**) is **not** part of the progress-drawdown mechanism for every asset. It applies **only to Malaysian residential for-sale**. Warehouse, retail, office, hotel, and data centre never inject the deposit into equity capital / cumulative capital / M0 IRR, even if Progress Drawdown is selected.

### 5.3 10/90 Rule (default: Australia — all off-plan classes)

- Deposit % (default 10) / Balance % (default 90) user-editable, must sum to 100.
- Deposit to trust at **every** lock month; balance at settlement (CP locks at CP+1, post-CP same month); releases at settlement; residual sweep by **CP+12**; trust interest 1-month offset; ΣASP = Σlocked + net interest − fees.
- Gap-fill loan ≤ **70%** of cumulative locked sales. Horizon **CP+12**.
- ⚠️ **NEVER pair UK with 10/90.** UK does not use it. **Australia only.** Do not pre-select, example, or describe UK (or any non-AU market) as a 10/90 jurisdiction.

### 5.4 No Escrow Rules

- Direct sales − outflows; no escrow rows (`applyNonEscrowLogic`). Horizon **CP+6**.

### 5.5 Critical bug avoidance — column length & rule fallback

Rules are **mechanisms, not country labels**. Location + asset class only pre-select (AU → 10/90 all classes, MY residential → progress / MY commercial → none, UAE+Dubai → staged all classes, everyone else incl. KSA/other emirates → none with full choice). Engine routing and horizons follow the **SELECTED** rule. Land-equity **100% lock is Dubai-only**.

- Australia → 10/90 (`ten_ninety`) — all asset classes. **Never UK.**
- Malaysia residential → progress; Malaysia commercial → none
- UAE **and city Dubai** → staged — all asset classes
- **All other locations** (KSA, other emirates including Abu Dhabi / RAK / Sharjah / Ajman / Fujairah, Thailand, China, …) → `none` default with full choice

Engine routing and horizons follow the **selected** rule: staged +12, 10/90 +12, progress +24, none +6. Switching the selected rule must **never** overwrite the stored land equity %.

1. **Column lengths must be dynamic:** `lastMonth = resolveSaleHorizonLastMonth(inputs)` → columns = `lastMonth + 1` (M0 … last). Always derive from **CP + selected-rule offset**, never hard-code staged length for all countries.
2. **No country inherits staged logic by accident.** KSA and non-Dubai emirates default to `none`. Thailand / Vietnam / Indonesia / China bucket to `none` unless the user selects a rule.
3. Horizon follows the **selected C4 escrow tab**:
   - `staged` → CP+12
   - `ten_ninety` → CP+12
   - `progress` → CP+24
   - `none` → CP+6
   - **Missing stored rule:** apply location + asset-class default on open (not a silent `none` for every empty field). Legacy jurisdiction enums (`UAE_SA`/`MALAYSIA`/`AUSTRALIA`) still map when present.
4. Feasibility **sale-escrow** slide headings use the selected rule name (e.g. “Staged Escrow Rule Configuration”). Country regulators (RERA, HDA, state 10/90) appear only as local-regime notes when the project location’s default matches that rule — a China project on staged must **not** read “UAE — RERA”.
5. Preview tables (MY/UAE/AU variants) and exports follow the selected rule and read retention / deposit / balance from the store, never from constants.

---

## 6. Current Pending Tasks & Next Steps

Snapshot as of **16 Sep 2026**. Prefer editing this file over scattering architecture notes across chats.

### Just finished (16 Sep 2026) — Learn / FAQ / Vault + lead capture (no engine math)

- **`/blog` (nav: Learn):** 10 long-form articles in `src/content/blog/articles/<slug>.md`; searchable index; related cards; page-level “Try FeasiBuild free” CTA (no author bio). #1–#8 product-neutral body copy; #9–#10 branded comparisons.
- **`/faq`:** 12 answers, 4 groups, FAQPage JSON-LD, each links to a blog deep-dive.
- **`/vault`:** Gated sample library — RAK sale, Dongguan sale (pin-drop proof), Penang Tier IV data centre. Email gate → view all + keep one download; Explorer unlocks the rest. Australia office study withheld (reserve).
- **Lead capture:** `POST /api/vault-lead` → Resend to `owner@feasibuild.app` (Reply-To = lead); fail-open + `fb_pending_leads` retry; honeypot `hp`. Zoho nurture is Phase 2 (not built).
- **Copy invariants:** NEVER pair UK with 10/90 (Australia only). Named competitors only on blog #9–#10; verify-before-claim Sep 2026 pricing; DealCheck excluded. Funnel: LinkedIn posters → blog → FAQ → Vault → Explorer → $99 lifetime.

### Just finished (24 Aug → 1 Sep 2026) — PayPal live + engine/deck hardening

- **PayPal LIVE:** one-time orders (Professional $99 lifetime, credit packs, Unlimited Pack $2,400 / 12 months). Smoke-tested capture + webhook. **Webhook must stay on `https://www.feasibuild.app/api/webhooks/paypal`.**
- **Strict repurchase + 12-month expiry:** `effectiveCredits`; no pack/Unlimited while credits remain; expired pack = 0 (new purchase **replaces**, never stacks). Enforced in create-order, capture-order, and webhook.
- **ToS / Refund** pages live; footer + upgrade modal. Clerk **waitlist off** (open sign-ups).
- **HDA** equity row **residential-only**; commercial cumulative capital = land + cash injection.
- **Escrow defaults:** Dubai staged **all off-plan classes**; Australia 10/90 **all off-plan classes**; Malaysia Progress (residential) / No Escrow (commercial).
- **Sale C4:** one 8-step wizard for every asset class; missing stored rule → location/class default on open.
- **C4 timing:** ops start from C1 S-curve end + 6 + 1 (same as C3); `financing.constructionPeriodMonths` initialized from C1.
- **Phantom remainder plug:** horizon-aligned preview rows (`financing-preview-rows.ts`); C3/C4 grids identical.
- **LLM catalog:** Qwen (default), Claude, GPT only. Public copy: “Qwen, Claude & OpenAI via Puter”.
- **Deck:** `FitSlide` overflow scale; first-run charts remount on data; no “Source:” footers; cache-regenerate copy per asset class.

### Just finished (24 Aug 2026) — Legal pages + multi-model public copy (no engine math)

- **Terms of Service:** `src/app/terms/page.tsx` (`/terms`). Explorer / Professional / credits / Unlimited Pack, BYO Puter, PayPal, liability, contact `owner@feasibuild.app`. Last updated 24 Aug 2026.
- **Refund Policy:** `src/app/refund-policy/page.tsx` (`/refund-policy`). 7-day Professional refund only if no clean report; credits and Unlimited Pack non-refundable; PayPal dispute suspends the account.
- **Wiring:** Landing footer (`Footer.tsx`) → `/terms` and `/refund-policy`. `UpgradeModal` disclaimer under Unlimited Pack. Legacy `/terms-of-service` redirects to `/terms`.
- **Multi-model copy:** Docs Getting Started (BYO-AI bullet + “Which AI models power FeasiBuild?” card), landing Technology Stack (“AI Engine (Qwen, Claude & OpenAI)”), privacy policy. Comparison BYO-AI row: “Qwen, Claude, OpenAI via Puter”.

### Just finished (23 Aug 2026) — Sale C4 HDA deposit is Malaysia residential-only

Verified on the Labu Warehouse test project (Component 4 Monthly Cash Flow Projection).

- **Engine:** `hdaDepositApplies()` in `src/lib/financing-engine/generate-cash-flow.ts` — statutory HDA construction deposit only when `progress` + `MALAYSIA` + not commercial. Zeroes `capitalHdaDeposit` and excludes it from cumulative capital and M0 `irrCashFlow`.
- **Bridge:** `hdaDepositEnabled` in `financing-cash-flow-engine-bridge.ts` is `false` unless Malaysia **and** `isResidentialSaleProject`.
- **Preview / Excel:** Malaysia/progress table (`cash-flow-table-malaysia.tsx`) and `build-financing-cash-flow-export.ts` hide **Capital—HDA deposit** when it does not apply; EQUITY CAPITAL still starts at land injection.
- **PDF:** `sale-escrow` slide was already residential-only; post-financing PDF uses the same engine rows (no separate HDA line).
- **Unchanged:** Malaysian residential for-sale still lodges the 3% deposit at M0.
- **No new files.** Existing C4 engine, bridge, Malaysia table, Excel export, and preview page only.
- **Labu Warehouse check:** HDA row gone; cumulative capital = previous total − HDA (**12,011,423.04 − 428,613.12 = 11,582,809.92**).

### Just finished (19–20 Aug 2026) — Feasibility chrome, entitlements gating, chart salvage (no engine math)

- **White-label logo + size:** Title slide (both streams). `hasWhiteLabelAccess` (Unlimited Pack always; Pro + 100-Pack). Secure KV `brand_logo` / `brand_logo_height` (40–200px, default 64). Upload control hidden during PDF capture.
- **Page numbers:** `SlideHeader` + `SlidePaginationProvider` — title unnumbered; “Page k of N−1” top-right on the subtitle row.
- **Explorer watermark + 1-export cap:** `SlideWatermark` on every slide; `fs_exports_used`; first PDF succeeds then upsell; later downloads blocked (“Upgrade to Export”).
- **Professional exports:** `evaluateExport` / `recordExport` / `consume-credit` — clean PDF needs a credit or active Unlimited Pack; Unlimited Pack never consumes credits.
- **Explorer dashboard lock:** After the free report, `canCreateProject` disables New Operational / New Sale (dashboard + sidebar) and refuses minting a new project id on save. Existing projects remain editable.
- **Chart JSON salvage (v2):** `extract-json-from-claude.ts` unwraps quoted payloads and repairs truncated JSON. `generateChartData` is non-fatal (`null` + warn). Callers on both streams skip / static-fallback. Model-agnostic extract errors.

### Just finished earlier (17–19 Aug 2026) — Support agents + marketing

- **Agent 2 Telegram Concierge:** `POST /api/support/telegram` — webhook secret, `update_id` dedupe, `/start` + deep-link payload (`ops-C1-S6`), Puter FAQ triage, Discord escalate with clickable `https://t.me/…` (never `tg://`), founder `/reply <chat_id> <text>`.
- **In-app “Talk to a human”:** `support.ts` + wizard lifebuoy + Analyst footer + landing footer + Settings Get help. `/start` stores `came_from` for Discord.
- **Priority Email (Pro / Unlimited Pack):** `POST /api/support/email` — Resend inbound fetch, `extractEmailFromHeader` + `getCustomerTier`, Explorer auto-reply, Puter `gpt-4o-mini` draft (60s), founder **Reply-required** `/send` / edit / `/reject`. Bare `/send` no longer falls through to FAQ triage.
- **Ops monitor:** Support sources skip Discord AI summary; context rendered as markdown fields.
- **Landing `#pricing`:** Explorer / Professional (lifetime) / credit packs / Unlimited Pack + comparison table (`PricingSection.tsx`). Navbar Pricing link.
- **`/comparison`:** Anonymous categories only (Legacy Desktop Suite, Regional Cloud SaaS, AI Consultancy).

### AI Analyst (complete 15 Aug 2026)

- Non-obtrusive drawer in operational + sale layouts; strictly advisory (never writes financial stores).
- Knowledge: Tier 1 master prompt; Tier 2 live docs via `/api/analyst-context` + `doc-text-extractor.ts`; Tier 3 research snapshot (`analyst-research-snapshot.ts`, component-scoped; C1 cost notes only on explicit request).
- INVARIANT: doc step headings must keep the `"Step N: <Title>"` heading convention — the extractor regex slices by it. Reformatting headings breaks step-level answers.
- Extractor: heading regex requires `"Step N:"` / `"Tab N:"` (colon mandatory); a slice ends at the next different step/tab number.

### Prior completed this cycle (Secure KV isolation + optimistic save)

- **Secure Puter KV wrapper:** `src/lib/secure-puter-kv.ts` namespaces all keys with Clerk `userId` (`feasi_build_{userId}_…`), strips legacy/double prefixes, retries get/set/del with exponential backoff, and is the sole `puter.kv` call site (plus migration raw helpers).
- **Call-site migration:** `puter-storage.ts`, `cache-service.ts`, and `puter-kv-preferences.ts` use `secureKv` / bound Clerk id. Layout mounts `SecureKvUserBinder` + `PuterKvMigrationTrigger`.
- **Legacy key migration:** `migrate-puter-kv.ts` copies `feasibuild_{userId}_*` and double-prefixed keys into the new namespace, then deletes old keys (once per session).
- **Optimistic project save:** Local-first write → visible **Saved Locally** (≥500ms) → **Syncing** → **Synced** / **Retry Save**; reconnect auto-retry via `useNetworkStatus` + `useOptimisticProjectSave`.
- **Duplicate Save fix (Operational):** Removed in-page Save button from `operational/cash-outflows/page.tsx`; only nav-bar `SaveProjectButton` remains (avoids duplicate project IDs).

### Prior completed (still in the product)

- **User-selectable LLM + Claude JSON:** Curated Puter models, `/dashboard/settings` + header picker, `getPreferredModel()`, `extractJsonFromClaudeResponse`, research skips reasoning stream chunks.
- **Operational Data Centre:** C2 persist fix; full Feasibility Study deck; `datacentre` resolved before BTR; DC-only prompts; slide layout polish; `AiInput` TS hygiene.
- **Sale Warehouse / Path A:** `"Commercial-Strata-Warehouse"` stream config, Dev Assumptions CapEx, escrow slide residential-only, Puter stream resilience, C1–C4 + FF&E in NCF/financing.
- **Warehouse + Data Centre asset types** on Operational; warehouse on Sale.

### Next steps

1. **PayPal / credits E2E:** Pro + pack — export consumes 1 credit; Unlimited Pack exports never decrement. Repurchase blocked while `effectiveCredits > 0`; after 12-month expiry, new pack replaces balance.
2. **Webhook:** confirm live deliveries hit **www** (`PAYMENT.CAPTURE.COMPLETED`, idempotent `processedOrderIds`). Do not point the webhook listener at the apex host.
3. **C3 vs C4 calendar:** 28-mo hotel — C3 and C4 both show construction M28, pre-op M29–M34, ops M35. 24-mo → ops M31.
4. **Chart E2E:** regenerate a study on Qwen — charts remount when data arrives; PDF exports; no “Source:” footers.
5. **Support smoke (from 19 Aug):** Live priority email (`Reply` `/send` / `/reject`) and Telegram Concierge (`/start ops-C1-S6`).

### Still open / later
- **Manual isolation QA** (from 15 Aug): User A vs User B KV; Analyst still quotes `reasoning_notes`.
- **E2E QA — Operational Data Centre** and **Sale warehouse** C1→C6 + Feasibility (unchanged engine work).
- **Warehouse (Operational) polish:** Verify all AI schema fields (e.g. `free_rent_months`) are fully wired in UI consumers.
- **Data Centre polish:** Confirm all C1 AI research fields map cleanly into store / review; optional chart density tuning.
- **Scenario Analysis:** Some metric paths are still placeholder / UI-first (Hotel / BTR / Retail / Office factor sets were not changed).
- **Feasibility chrome:** Some preview chrome still shows Feasibility as “Coming Soon” when the study path is disabled.
- **Server AI:** Server Qwen routes no-op when `FEASIBILITY_AI_URL` / API key are missing — document env or fail loudly.
- **Financing wizard polish:** Some milestone auto-calc / toggles still marked placeholder and do not yet change modeled outputs.
- Clarify dual levered IRR definitions in UI.

---

## Quick reference — do not break these invariants

1. Equity gap-fill keeps **cumulative NCF Post-Financing ≥ 0**.  
2. Escrow interest, UAE progress withdrawals, and construction loan interest use the **1-month offset**.  
3. Levered equity IRR: **negatives = equity injections**; **positives = NCF post-financing after the funding gap closes** (see §4.3 for series variants).  
4. Sale CF columns = **CP + selected-rule offset** (staged +12, 10/90 +12, progress +24, none +6).  
5. No location inherits a rule or a land-equity lock by accident; defaults only pre-select; Dubai-only 100% lock. Unset/empty mode → `none` (CP+6). China + staged must not label the slide “UAE — RERA”.  
6. **Sale warehouse NCF:** Always use `buildSalePreFinancingCashFlows` (includes FF&E); never rebuild outflows from `detail.monthlyTotal` alone for warehouse.  
7. **Sale feasibility subtype map:** New sale `buildingSubType` values must be added to `sale-stream-config.ts` or they default to High-Rise Residential.  
8. **Sale escrow slide:** Report slide is residential-only; commercial/warehouse decks must not show it. Headings use the selected rule name. **HDA construction deposit** in C4 (engine + Malaysia table + Excel) is **Malaysia + residential for-sale only** — never warehouse / retail / office / hotel / data centre, even on Progress Drawdown.  
9. **Ops Data Centre enrich:** Resolve **`datacentre` before BTR**; never share unscoped `exec-1` commentary cache across asset types; DC prompts must not emit warehouse/residential/retail/hotel language.  
10. **User LLM preference:** Always resolve via `getPreferredModel()` (never hard-code a vendor id in research / commentary). Claude research must skip reasoning stream chunks and parse via `extractJsonFromClaudeResponse`. Public marketing/docs copy must list **Qwen (default), Claude, or OpenAI** — never imply Qwen-only. Retired vendor KV ids remap to Qwen.  
11. **Puter KV:** Never call `puter.kv` outside `secure-puter-kv.ts`; always namespace with Clerk `userId`. Prefer logical keys; let `toLogicalKvKey` strip legacy prefixes.  
12. **Project save UX:** One Save control per stream layout; optimistic local write before vault sync; auto-save on study generation and export reuses the same pipeline; Explorer lock still gates new-id minting.  
13. **AI Analyst:** Advisory only — never auto-write into `useFinModelStore`. Live docs are read server-side via `fs` (`/api/analyst-context`); skip Puter `reasoning` chunks; resolve the LLM via `getPreferredModel()`. Quote stored `reasoning_notes` verbatim when the snapshot header is present.  
14. **AI Analyst doc headings:** Keep the "Step N: <Title>" (or C5 "Tab N:") heading convention in `src/app/docs/**`. `extractStepSection` slices by that pattern (colon mandatory; slice ends at the next different number). Doc body prose must never begin a line with "Step N" / "Tab N" — colon-less mimicry previously truncated a slice and the model filled the gap with wrong-component content.  
15. **AI Analyst docs coupling:** docs keep the "Step N: <Title>" heading convention and mirror the live UI step structure per asset (C2: Hotel = 5 steps, others = 4). Update docs in the same release as any wizard change — Analyst quality = doc quality.  
16. **Reasoning-notes schema:** research prompts require `reasoning_notes`; `normalizeAiResearchData` must tolerate its absence (old caches/projects). No new Puter KV keys for notes.  
17. **Operational C6 shocks:** Use the asset’s own factor set from `ASSET_SPECIFIC_FACTORS`. Unmapped types show Common Factors only — never fall back to Hotel.  
18. **Support email review:** Founder `/send` / `/reject` / edited replies to priority drafts **must** be a Telegram **Reply** to the `---DRAFT---` message; a bare `/send` must not hit FAQ triage.  
19. **Entitlements (PayPal):** Clerk `publicMetadata.subscription` is source of truth after capture/webhook. Unknown / no metadata → Explorer. Parse inbound `From` via `extractEmailFromHeader` before any email allowlist fallback. ISO grant dates must use **uppercase `Z`**.  
20. **Public comparison copy:** Landing `/comparison` never names real competing products — use Legacy Desktop Suite / Regional Cloud SaaS / AI Consultancy. Named vendors (ARGUS, EstateMaster, AIRE, Feasibility.pro, Buildora IQ, Feasly, Archistar) are allowed **only** on blog articles #9–#10, with **verify-before-claim** Sep 2026 pricing. **DealCheck is excluded.**  
21. **10/90 copy:** Never pair UK with 10/90. Australia only. Pin-drop sets country; user sets rules; AI research follows the pin, falling back to the nearest city when hyper-local data is thin.  
22. **White-label logo:** Unlimited Pack always; Professional only with 100-Pack; Explorer never. Height 40–200px in Secure KV; title slide only.  
23. **Report exports:** Explorer — 1 watermarked PDF total, then lock new-project creation. Professional — clean PDF consumes 1 credit (or is blocked at 0). Unlimited Pack — unlimited, no watermark, never consumes credits. Failed PDFs do not consume.  
24. **Feasibility charts:** `generateChartData` must return `null` on parse/Puter failure — never fail the deck. Salvage quoted/truncated JSON in `extractJsonFromClaudeResponse`; salvage includes S5 unescape+repair for quoted/truncated payloads; `generateChartData` logs a warn only.  
25. **C3/C4 construction end:** Same source — last non-zero C1 S-curve month (`construction-end.ts`). Never use a financing factory default as the construction calendar. `operationsStart = actualConstructionEnd + 6 + 1`.  
26. **Pack repurchase:** Refuse pack and Unlimited Pack while `effectiveCredits > 0` (create-order, capture-order, **and** webhook). Expired pack = 0 credits; new purchase **replaces** the balance.  
27. **PayPal webhook host:** Listener is `https://www.feasibuild.app/api/webhooks/paypal` only. Apex 308-redirects; PayPal does not follow redirects (`FAIL_SOFT`).  
28. **Preview-row parity:** C4 display rows from `financing-preview-rows.ts` — `row.length === horizon` and `sum(row) === displayed total`. No remainder plug after construction end.  
29. **Deck copy:** No “Source: …” attribution footers; prompts forbid them; parser strips `Source:` lines. Overflowing slides use `FitSlide`.

---

*Last updated 16 Sep 2026 (Learn / FAQ / Vault, lead capture, payment-structure + UK/10/90 copy rules, funnel). Prefer editing this file over scattering architecture notes across chats.*
