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
- Product docs: `src/app/docs/operational-stream/`, `src/app/docs/sale-stream/`

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
**C6** applies base / downside / upside shocks and re-runs C1–C5 engines.

### 2.3 Four core cash-flow tables

Wizard inputs land in Zustand (`useFinModelStore`) and profile builders; preview pages render the four core tables:

| # | Table | Meaning | Operational preview | Sale preview | Primary builders / engines |
|---|--------|---------|---------------------|--------------|----------------------------|
| **1. Costs** | Development / capital outflows (land, construction, soft costs, POWC, FF&E), monthly S-curve | `/operational/preview/cash-outflows` | `/sale/preview/cash-outflows` | Store `buildCashOutflowProfile`; timing helpers `cash-outflow-powc-timing.ts`, `cash-outflow-ffe-timing.ts`; sale `sale-cash-preview-profile.ts` (warehouse CapEx breakdown + FF&E) |
| **2. Income** | Ops: recurring P&L; Sale: sales proceeds schedule | `/operational/preview/pnl` | `/sale/preview/cash-inflows` | `operational-pnl.ts` + asset P&L tables; sale C2 schedules in store |
| **3. Pre-financing Project Cash Flows** | Unlevered NCF → Project IRR | `/operational/preview/project-irr` | `/sale/preview/project-irr` (+ graphs on `/sale/project-irr`) | **Single NCF source:** `buildSalePreFinancingCashFlows()` in `sale-cash-preview-profile.ts` (warehouse includes land + CC + soft + POWC + FF&E). Used by cash-inflows preview, project-irr preview, and C3 Step 1 graphs — **do not recalculate NCF separately**. |
| **4. Post-financing Project Cash Flows** | Debt draws, IDC, equity gap-fill, waterfall, levered equity CF | `/operational/preview/financing` | `/sale/preview/financing` | Ops: `c4.levered.engine.ts` + waterfall libs; Sale: `sale-financing-engine.ts`, `financing-engine/generate-cash-flow.ts`, financing bridge. Warehouse sale: optional monthly **`ffe`** in engine `monthlyCosts` + conditional FF&E row in MY/UAE/AU tables. |

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
| **Sale financing UI** | `src/app/sale/preview/financing/` (bridge, MY/UAE/AU tables, export) |
| **Sale feasibility stream config** | `src/lib/feasibility/sale/sale-stream-config.ts` — `SALE_CONFIG` + `SUBTYPE_TO_CONFIG_KEY` (includes **`Commercial-Strata-Warehouse`** ↔ `commercial_strata_warehouse`); drives title, market slide titles, commentary asset label via `getSaleStreamConfig` |
| **Sale feasibility generators** | `src/lib/feasibility/sale/generate-sale-report.ts`, `enrich-sale-slides-puter.ts`, `create-sale-puter-prompts.ts`, `build-sale-financial-data.ts`, `sale-context.ts` |
| **State** | `src/store/useFinModelStore.ts`, `useSaleModelStore.ts`, `useScenarioStore.ts`, `useFeasibilityStore.ts`, `useAuditStore.ts` |
| **Calculation engine** | `src/lib/irr-calculations.ts`, `equity-irr.ts`, `operational-pnl.ts`, `operational-project-irr-pnl.ts`, `sale-financing-engine.ts`, `financing-engine/generate-cash-flow.ts`, `src/app/operational/engine/c4.levered.engine.ts`, `c5.equity.engine.ts` |
| **Report generator** | `src/lib/feasibility/**`, `src/types/feasibility.ts`, `src/components/feasibility/**`, `src/app/api/feasibility/**`, `src/lib/pdf-export.ts` |
| **Shared UI helpers** | `src/components/ui/AiInput.tsx` (override / reset baseline; avoid `string === number` comparisons under TS strict narrowing) |

**Sale feasibility deck rules (presentation, not engine math)**

- Title / market templates resolve from `buildingSubType` via `sale-stream-config.ts`. Unknown subtypes still default to **Residential-High-Rise** — always map new subtypes explicitly.
- **`sale-escrow` slide** (“Escrow Withdrawal Configuration”) is included **only** when `buildingSubType` includes `"residential"`. Commercial / warehouse decks skip it (HDA / Schedule H is residential-only in the report).
- Development Assumptions for warehouse uses CapEx lines from `buildSaleCashflowDetailProfile` → `warehouseCostLines` on `SaleDevelopmentCostsSlide`.

---

## 3. AI Functionalities

Two AI layers; both are **Qwen-family via Puter.js** on the client (no OpenAI/Anthropic usage in `src/`). Optional server Qwen via env for some API routes.

### 3.1 Market research during Costs & Income (C1 / C2)

| Item | Detail |
|------|--------|
| **Hook** | `src/hooks/useAiResearch.ts` → `performResearch()` |
| **API** | Client `puter.ai.chat` (script: `https://js.puter.com/v2/` in `src/app/layout.tsx`) |
| **Model** | User-selectable via Puter KV (`src/lib/puter-models.ts`); default `qwen/qwen3.7-plus` (`getPreferredModel`) |
| **Options** | `stream: true`, `temperature: 0.1`, `max_tokens: 8000` |
| **Prompts** | `src/lib/constants/aiPrompts.ts` — `getSystemPrompt`, `buildUserPrompt`, `normalizeAiResearchData`, per-asset `AI_PROMPTS` |
| **Auth / status** | `src/lib/puter-auth.ts`, `src/lib/cache-service.ts` (`checkPuterStatus`) |
| **UI** | `BenchmarkProfile.tsx`, `BenchmarkHeader.tsx`; fills C1/C2 fields from structured JSON |

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
- Retail / office / BTR often **two-phase** (C1 first; C2 after GLA / config is set)
- Warehouse C2 schema + helpers: `src/lib/warehouse-ai-c2.ts`; UI `c2s1`–`c2s4` under `operational/cash-inflows/components/`

### 3.2 Market research & content for the Feasibility Study report

| Item | Detail |
|------|--------|
| **Client path (primary)** | `src/lib/ai-service.ts` — `getPreferredModel()` (default `qwen/qwen3.7-plus`), temp `0.6`, max tokens `6000`, streaming preferred |
| **Ops enrich** | `src/lib/feasibility/enrich-operational-slides-puter.ts` → asset generators (`generate-hotel-report.ts`, `generate-shopping-mall-report.ts`, `generate-office-report.ts`, `generate-btr-report.ts`, `generate-warehouse-report.ts`, **`generate-data-centre-report.ts`**) |
| **Sale enrich** | `src/lib/feasibility/sale/enrich-sale-slides-puter.ts`, `generate-sale-report.ts`, `create-sale-puter-prompts.ts` (warehouse-aware prompts when `assetLabel` is warehouse/industrial) |
| **Sale subtype → deck template** | `sale-stream-config.ts` — e.g. `commercial_strata_warehouse` → `"Commercial-Strata-Warehouse"` / asset label `"Commercial - Strata Warehouse"` |
| **Data bundle** | `data-aggregator.ts` (`getFeasibilityProjectBundle`), sale `sale/sale-context.ts` |
| **Commentary helpers** | `generate-*-commentary.ts`, `clean-ai-content.ts`, `commentary-prompt-utils.ts`; warehouse ops: `generate-warehouse-commentary.ts`, `build-warehouse-market-data.ts`; **data centre ops:** `generate-data-centre-commentary.ts`, `build-data-centre-market-data.ts`, `data-centre-context.ts` (hard DO NOT warehouse/BTR/retail/hotel; cache keys scoped by `buildingType`); sale fallbacks: `generate-sale-commentary.ts` |
| **Operational AI charts** | See modules below — wired from `enrich-operational-slides-puter.ts` with Puter + cache + static fallbacks |
| **Server optional** | `src/lib/feasibility/qwen-commentary.ts` + `src/app/api/feasibility/*` using `FEASIBILITY_AI_URL` / `FEASIBILITY_AI_API_KEY` / `FEASIBILITY_AI_MODEL` (default `qwen-plus`) |
| **Deck sections** | Title → Executive (A) → Project (B) → Market (C) → Financial (D); editable in `useFeasibilityStore`; export via `pdf-export.ts` |

**Puter streaming resilience (`ai-service.ts`)**

- Puter streams typed chunks (`type: "text" | "reasoning" | "error" | …`). Answer text comes from `type:"text"`; reasoning is skipped for slides (last-resort only if no text arrives).
- Empty stream → retry with `stream: false`; still empty → throw with prompt preview logging.
- Sale commentary (`generateSaleCommentary`) catches AI failures and uses `generateSaleCommentaryFallback` so the deck still builds.

**Operational AI chart modules**

| Module | Role |
|--------|------|
| `src/lib/feasibility/operational-macro-chart.ts` | Operational-specific AI macro charts (GDP, Population, Inflation) with caching; Sale prompts copied without Sale imports |
| `src/lib/feasibility/operational-market-charts.ts` | Unified dynamic market charts for all Operational assets: Market Metrics, Supply Pipeline, Tenant Profile (retail / office / BTR / warehouse / datacentre) |
| `src/lib/feasibility/hospitality-market-charts.ts` | AI chart generation for 8 Hotel market slides: T&T Demand, Arrivals (historical / projected), ADR/Occupancy, Revenues, Supply, Guests, Length of Stay |

**Enrichment order (Operational Puter):** macro → (hotel hospitality charts when `assetType === "hotel"`) → market metrics → supply pipeline → tenant profile.

**Prompt patterns:** institutional tone, anti-placeholder rules, length caps (e.g. 5–6 bullets / ≤150 words for commentary), deterministic **fallback paragraphs** when Puter fails, slide cache keys via component hashes.

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

---

## 5. Jurisdiction-Specific Cash Flow Rules

Canonical types and horizon: `Jurisdiction = 'UAE_SA' | 'MALAYSIA' | 'AUSTRALIA' | 'OTHER'` in  
`src/lib/financing-engine/generate-cash-flow.ts`.

Escrow UI: `src/app/sale/financing/escrow-config/{Uae,Malaysia,Australia}EscrowConfig.tsx`  
Wizard presets: `residential-wizard.tsx`, `commercial-wizard.tsx` (`JURISDICTION_RULES`).

### 5.1 UAE / KSA — Escrow model

- Certification every 3 or 6 months during CP; withdrawal **+1 month** after certification.
- Post-CP surplus release above retention floor; **final escrow release at CP + 12**.
- Loan draw often capped vs cumulative eligible costs (30/70-style).
- **Timeline / columns = Construction Period + 12 months.**

### 5.2 Malaysia — HDA / Non-escrow-adjacent staging

- HDA deposit at M0; stage releases tied to S-curve / HDA milestones; post-VP retention schedule through VP+24.
- HDA deposit interest credited at **CP + 24**.
- **Timeline / columns = Construction Period + 24 months.**

### 5.3 Australia — 10/90 retention model

- During CP: deposit % (default **10**) of locked sales → trust; **90%** balance settles post-CP / on ongoing sales rules.
- Trust retention / full release by **CP + 12**.
- Gap-fill: loan ≤ facility and often ≤ **70% of cumulative locked sales**; remainder equity.
- **Timeline / columns = Construction Period + 12 months.**

### 5.4 Commercial / explicit non-escrow

- Direct sales − outflows; no escrow rows (`applyNonEscrowLogic`).
- Commercial sale financing horizon: **CP + 6**.

### 5.5 Critical bug avoidance — column length & country fallback

1. **Column lengths must be dynamic:** `lastMonth = resolveSaleHorizonLastMonth(inputs)` → columns = `lastMonth + 1` (M0 … last). Always derive from **CP + jurisdiction offset**, never hard-code UAE length for all countries.
2. **Thailand / Vietnam / Indonesia / etc. bucket to `OTHER`** via `normalizeCountryHorizonBucket` — they must **not** silently run UAE escrow logic.
3. For `OTHER`, horizon follows **C4 escrow tab selection**:
   - `malaysia` → CP+24  
   - `australia` → CP+12  
   - `none` → CP+6  
   - **Unset model currently falls back to CP+12** in horizon code while the monthly router may call **non-escrow** — treat this mismatch as a known footgun; always set an explicit withdrawal mode for non–UAE/KSA/MY/AU countries.
4. Never assume Thailand “defaults to UAE escrow”; UI defaults should prefer `"none"` / user-selected model for TH/VN/OTHER.

---

## 6. Current Pending Tasks & Next Steps

Snapshot as of **5 Aug 2026** (Operational **Data Centre** — C2 stability, full Feasibility Study deck, slide layout / TS hygiene). Prefer editing this file over scattering architecture notes across chats.

### Completed this session (Operational Data Centre)

- **C2 React “update during render”:** Data Centre `c2s1`–`c2s3` no longer call `updateCashInflows` inside `setState` updaters; local state + `useEffect` persist (ref-safe) so overrides are not wiped.
- **Data Centre Feasibility Study:** Full deck path mirrored from warehouse — `data-centre-context.ts`, `build-data-centre-market-data.ts`, `generate-data-centre-commentary.ts`, `generate-data-centre-report.ts`, `DataCentre*Slide.tsx`, wired via `enrich-operational-slides-puter.ts` (`case "datacentre"`), `FeasibilitySlideView`, aggregator `dataCentreMetrics`.
- **Wrong-asset content guardrails:** Resolve **`datacentre` before BTR** in `resolveOperationalAssetType`; DC-only prompts with hard DO NOT (warehouse/BTR/retail/hotel); `assertDataCentreBundle`; reject wrong-asset AI → DC fallback; commentary cache keys / hashes scoped by `buildingType`; UI **Clear AI Cache & Regenerate**.
- **Slide layout polish:** `DataCentreOperationalAssumptionsSlide` — max 3 short bullets; `DataCentreCompetitiveAnalysisSlide` — **2+1 chart layout** (Pricing + PUE top, Latency centered below), max 2 brief bullets + dedicated commentary section `Market - Competitive Analysis (Pricing, PUE & Latency)`.
- **Build hygiene:** `AiInput.tsx` — removed invalid `originalValue === 0` after `!== ""` narrowing (TS2367); numeric `0` already passes `!== ""`.

### Prior completed (Sale Warehouse Feasibility / Path A)

- Sale `"Commercial-Strata-Warehouse"` stream config, Dev Assumptions CapEx, escrow slide residential-only, Puter stream resilience, C1–C4 Path A + FF&E in NCF/financing.

### Next Steps / Remaining — Data Centre & beyond

- **End-to-end QA (Ops Data Centre):** C1 → C2 → C3 → C4 → **Feasibility Study** with a real DC project; after upgrades, **Clear AI Cache & Regenerate** and confirm no warehouse/BTR wording on market / exec slides.
- **Visual QA:** Competitive Analysis (slide ~12) and Operational Assumptions fit 16:9 without overflow; remaining market slides if cramped.
- **Sale warehouse E2E:** Still worth a full C1→C6 + Feasibility pass on a live warehouse project (title, no escrow slide, Puter/fallback).
- **C5 Equity / C6 Scenarios** smoke-test for warehouse FF&E and data-centre series.

### Still open / fragile

- **Warehouse (Operational) polish:** Verify all AI schema fields (e.g. `free_rent_months`) are fully wired in UI consumers.
- **Data Centre polish:** Confirm all C1 AI research fields map cleanly into store / review; optional further chart density tuning on other DC market slides.
- **Scenario Analysis:** Operational / shared scenario pages still carry **placeholder / UI-first** metric paths in places; harden so C6 always re-runs full engines and feeds Feasibility consistently.
- **Feasibility chrome:** Some preview chrome still shows Feasibility as “Coming Soon” when the study path is disabled.
- **Jurisdiction / engine hygiene:** Fix **OTHER** horizon vs logic mismatch when `escrowWithdrawalMode` is unset; reduce debug `console.log` noise in `generate-cash-flow.ts`; clarify dual levered IRR definitions in UI.
- **Server AI:** Server Qwen routes no-op when `FEASIBILITY_AI_URL` / API key are missing — document env setup or fail loudly in admin tooling.
- **Financing wizard polish:** Some milestone auto-calc / toggles still marked placeholder and do not yet change modeled outputs.

---

## Quick reference — do not break these invariants

1. Equity gap-fill keeps **cumulative NCF Post-Financing ≥ 0**.  
2. Escrow interest, UAE progress withdrawals, and construction loan interest use the **1-month offset**.  
3. Levered equity IRR: **negatives = equity injections**; **positives = NCF post-financing after the funding gap closes** (see §4.3 for series variants).  
4. Sale CF column count = **CP + jurisdiction offset** (MY +24, UAE/KSA/AU +12, commercial non-escrow +6).  
5. **Thailand ≠ UAE** — `OTHER` must not inherit UAE escrow strategy by accident.  
6. **Sale warehouse NCF:** Always use `buildSalePreFinancingCashFlows` (includes FF&E); never rebuild outflows from `detail.monthlyTotal` alone for warehouse.  
7. **Sale feasibility subtype map:** New sale `buildingSubType` values must be added to `sale-stream-config.ts` or they default to High-Rise Residential.  
8. **Sale escrow slide:** Report slide is residential-only; commercial/warehouse decks must not show HDA/Schedule H escrow.  
9. **Ops Data Centre enrich:** Resolve **`datacentre` before BTR**; never share unscoped `exec-1` commentary cache across asset types; DC prompts must not emit warehouse/residential/retail/hotel language.

---

*Last updated 5 Aug 2026 (Operational Data Centre feasibility deck, C2 persist fix, competitive-analysis layout, AiInput TS fix). Prefer editing this file over scattering architecture notes across chats.*
