export type BlogCategory =
  | "Launch"
  | "Persona"
  | "Jurisdiction"
  | "Case Study"
  | "Features"
  | "Streams";

export type BlogPersona =
  | "Closer"
  | "Scout"
  | "Workhorse"
  | "Auditor"
  | "Teacher"
  | "All";

export type BlogBodyBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  persona: BlogPersona;
  jurisdictions: string[];
  tags: string[];
  keywords: string[];
  date: string;
  readTime: string;
  author: "Rashdan";
  poster: string;
  deckPdf: string;
  slides?: string[];
  body: BlogBodyBlock[];
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  "Launch",
  "Persona",
  "Jurisdiction",
  "Case Study",
  "Features",
  "Streams",
];

function assets(slug: string) {
  return {
    poster: `/blog/${slug}/poster.png`,
    deckPdf: `/blog/${slug}/deck.pdf`,
  };
}

export const posts: BlogPost[] = [
  {
    slug: "Institutional-grade-feasibility-studies-in-minutes",
    title: "Institutional-grade feasibility studies in minutes",
    excerpt:
      "From assumptions to a bankable feasibility report — without the weeks, the consultants, or the $10K+ price tag. FeasiBuild is live.",
    category: "Launch",
    persona: "All",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["launch", "feasibility study", "AI", "underwriting"],
    keywords: [
      "feasibility study software",
      "AI real estate feasibility",
      "bankable feasibility report",
      "FeasiBuild launch",
      "development appraisal",
    ],
    date: "2026-09-10",
    readTime: "5 min read",
    author: "Rashdan",
    ...assets("Institutional-grade-feasibility-studies-in-minutes"),
    body: [
      {
        type: "p",
        text: "FeasiBuild is live. The promise is simple: take a development from raw assumptions to an institutional-grade feasibility study in minutes, not weeks — without a $10,000 consulting invoice sitting between the idea and the investment committee.",
      },
      {
        type: "h2",
        text: "What “bankable” actually means",
      },
      {
        type: "p",
        text: "A bankable study is not a pretty PDF. It is a consistent financial engine — cash outflows, inflows, financing, returns, and scenarios — wrapped in a narrative a lender, valuer, or IC can interrogate. Most teams still assemble that pack by hand: Excel for the numbers, Word for the story, PowerPoint for the deck, and a consultant to glue it together.",
      },
      {
        type: "p",
        text: "That workflow is slow by design. Change one absorption assumption and you are back in the model, then the memo, then the slides. FeasiBuild was built so the engine, the commentary, and the deck stay in one loop.",
      },
      {
        type: "h2",
        text: "What you get in minutes",
      },
      {
        type: "ul",
        items: [
          "Asset-specific cash flows for hold and sale developments — not a generic spreadsheet forced onto every building type.",
          "AI market commentary tied to city, segment, and positioning, written for investment committees rather than blog posts.",
          "A 30+ slide feasibility deck with charts, tables, and metrics in a consistent institutional format.",
          "Base / upside / downside scenarios so stakeholders see risk, not just a single IRR.",
        ],
      },
      {
        type: "quote",
        text: "From assumptions to a bankable feasibility report — without the weeks, the consultants, or the $10K+ price tag.",
      },
      {
        type: "h2",
        text: "Who this is for",
      },
      {
        type: "p",
        text: "Developers who need to test a site before they lock land. Agents who need numbers on the table to win a mandate. Valuers and financiers who want a structured pack they can stress, not a black box. Consultants who would rather spend time on judgment than rebuilding the same waterfall for the twentieth time.",
      },
      {
        type: "p",
        text: "The first report is free. Run a live project, export the deck, and decide whether the old three-week cycle still makes sense.",
      },
    ],
  },
  {
    slug: "What-Feasibuild-Actually-Does",
    title: "What FeasiBuild actually does",
    excerpt:
      "The AI financial engine for real estate development. You input your project data once. It handles the rest.",
    category: "Features",
    persona: "All",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["product", "AI engine", "workflow", "BYO infrastructure"],
    keywords: [
      "what is FeasiBuild",
      "AI financial engine",
      "real estate development software",
      "automated feasibility model",
      "Puter KV privacy",
    ],
    date: "2026-09-08",
    readTime: "6 min read",
    author: "Rashdan",
    ...assets("What-Feasibuild-Actually-Does"),
    body: [
      {
        type: "p",
        text: "FeasiBuild is not a chatbot that writes a memo about your site. It is a financial engine. You enter project data once — location, asset type, costs, revenues, financing — and the platform builds the cash flows, returns, scenarios, and narrative study from that single source of truth.",
      },
      {
        type: "h2",
        text: "One input. The rest is downstream.",
      },
      {
        type: "p",
        text: "In a conventional workflow, the model, the IC paper, and the slide deck are three different documents. They drift. FeasiBuild keeps them coupled. Change construction cost or ADR and the affected schedules, ratios, and commentary regenerate — you do not rebuild the pack by hand.",
      },
      {
        type: "ul",
        items: [
          "AI market intelligence: macro and micro commentary for your city, segment, and positioning.",
          "Institutional financial model: cash flows, waterfalls, debt schedules, IRR, NPV, DSCR.",
          "Bankable decks: a professionally formatted 30+ slide narrative with charts and tables.",
          "Scenario and sensitivity: base, upside, and downside with explicit drivers.",
          "Multi-asset support: hotel, mall, office, BTR, warehouse, data centre, and sale developments.",
        ],
      },
      {
        type: "h2",
        text: "Your data does not live on our servers",
      },
      {
        type: "p",
        text: "FeasiBuild runs a bring-your-own-infrastructure model. You connect your own AI via Puter and store encrypted project data in your own Puter KV cloud. The models stay in your private vault, accessible from any device, without FeasiBuild holding the books.",
      },
      {
        type: "quote",
        text: "You input your project data once. It handles the rest.",
      },
      {
        type: "p",
        text: "That is the product: an engine that turns a structured project into a study a lender can read — fast enough to iterate, rigorous enough to take to a credit committee.",
      },
    ],
  },
  {
    slug: "One-Engine-Eleven-Asset-Types-Two-Financial-Realities",
    title: "One engine. Eleven asset types. Two financial realities.",
    excerpt:
      "Most feasibility tools force every asset into the same spreadsheet. FeasiBuild doesn’t. Two distinct financial engines — built for the way each asset class actually performs.",
    category: "Streams",
    persona: "Workhorse",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["streams", "asset classes", "operational", "sale", "project finance"],
    keywords: [
      "sale vs operational feasibility",
      "build to hold vs build to sell",
      "hotel mall office warehouse data centre",
      "residential strata feasibility",
      "real estate financial engine",
    ],
    date: "2026-09-05",
    readTime: "7 min read",
    author: "Rashdan",
    ...assets("One-Engine-Eleven-Asset-Types-Two-Financial-Realities"),
    body: [
      {
        type: "p",
        text: "A hotel is not a landed housing scheme. A data centre is not a residential tower. Yet most feasibility tools still drop every project into one generic cash-flow sheet and hope the labels are close enough. Lenders notice. So do investment committees.",
      },
      {
        type: "h2",
        text: "Two financial realities",
      },
      {
        type: "p",
        text: "Hold assets earn through occupancy, rent, and operating margin over a hold period. Sale assets earn through absorption, payment plans, escrow, and net sales proceeds — usually with no terminal value. Those are different engines, not two tabs in the same workbook.",
      },
      {
        type: "ul",
        items: [
          "Operational Stream (build-to-hold): hotel, mall, office, build-to-rent residential, warehouse, data centre.",
          "Sale Stream (build-to-sell): residential high-rise, landed, commercial strata office, commercial strata warehouse, mixed-use.",
        ],
      },
      {
        type: "h2",
        text: "Why the split matters in underwriting",
      },
      {
        type: "p",
        text: "Operational studies need ADR or rent, vacancy, opex, depreciation, DSCR, and a going-in / exit yield logic. Sale studies need saleable BUA, ASP quartiles, buyer mix, progress payments, escrow withdrawal rules, and gap-fill equity. Force one onto the other and you get a number that looks precise and is structurally wrong.",
      },
      {
        type: "quote",
        text: "Most feasibility tools force every asset into the same spreadsheet. FeasiBuild doesn’t.",
      },
      {
        type: "p",
        text: "One product surface. Eleven asset types. Two engines that speak the language of the asset — which is the only way a feasibility study survives a credit paper.",
      },
    ],
  },
  {
    slug: "Six-Asset-Classes-Six-Languages",
    title: "Build to hold? Six asset classes. Six languages.",
    excerpt:
      "A hotel is not a mall. A mall is not a data centre. FeasiBuild’s Operational Stream models six income-producing asset classes — each with its own revenue logic, risk profile, and performance metrics.",
    category: "Streams",
    persona: "Workhorse",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA", "Oman"],
    tags: ["operational stream", "hotel", "mall", "office", "BTR", "warehouse", "data centre"],
    keywords: [
      "hotel feasibility study",
      "mall feasibility study",
      "data centre underwriting",
      "build to rent model",
      "warehouse development appraisal",
      "office yield analysis",
    ],
    date: "2026-09-03",
    readTime: "8 min read",
    author: "Rashdan",
    ...assets("Six-Asset-Classes-Six-Languages"),
    body: [
      {
        type: "p",
        text: "Build-to-hold is not one model with a dropdown. A hotel lives on occupancy and ADR. A mall lives on occupancy, turnover rent, and tenant mix. A data centre lives on IT load, PUE, and contracted MW. If your feasibility study does not speak those languages, it is a cost sheet with an IRR attached.",
      },
      {
        type: "h2",
        text: "The six languages",
      },
      {
        type: "ul",
        items: [
          "Hotel — room mix, occupancy, ADR, departmental profit, undistributed expenses.",
          "Mall / retail — GLA, occupancy, base and turnover rent, CAM, tenant mix.",
          "Office — NLA, vacancy, rents, incentives, lease-up, yield on cost.",
          "Build-to-rent residential — unit mix, lease-up, other income, opex per key or per unit.",
          "Warehouse — GLA, rents, WALE-style occupancy, logistics cost drivers.",
          "Data centre — IT load, colocation or wholesale structure, power and cooling opex.",
        ],
      },
      {
        type: "h2",
        text: "Same component path, different drivers",
      },
      {
        type: "p",
        text: "Every operational study still walks the same institutional path: cash outflows, cash inflows, financing, equity returns, scenario analysis, then the generated study. What changes is the segmentation and the revenue engine. That is how you keep IC-grade structure without flattening every asset into “rent × area”.",
      },
      {
        type: "quote",
        text: "A hotel is not a mall. A mall is not a data centre. And your financial model should know the difference.",
      },
      {
        type: "p",
        text: "If you are holding the asset, start in the Operational Stream and pick the language the building actually speaks.",
      },
    ],
  },
  {
    slug: "Build-to-Sell-Five-Ways-to-Do-It-Right",
    title: "Build to sell? Five ways to do it right.",
    excerpt:
      "Positioning isn’t a marketing word in a feasibility study — it’s a price quartile. And it changes every number downstream. FeasiBuild’s Sale Stream turns that insight into a structured underwriting engine.",
    category: "Streams",
    persona: "Workhorse",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["sale stream", "build to sell", "positioning", "absorption", "escrow"],
    keywords: [
      "residential development feasibility",
      "sales uptake schedule",
      "escrow drawdown",
      "price quartile positioning",
      "build to sell underwriting",
    ],
    date: "2026-08-28",
    readTime: "7 min read",
    author: "Rashdan",
    ...assets("Build-to-Sell-Five-Ways-to-Do-It-Right"),
    body: [
      {
        type: "p",
        text: "In a sale development, “luxury” is not a brand line. It is a price quartile, a buyer mix, and an absorption curve. Get the positioning wrong and every downstream number — GDV, peak funding, DSCR-equivalent cash coverage, equity cheques — is fiction.",
      },
      {
        type: "h2",
        text: "Five ways to underwrite a sale scheme properly",
      },
      {
        type: "ul",
        items: [
          "Treat positioning as a price quartile, not a brochure. ASP has to sit in a market band the city can actually absorb.",
          "Model payment plans and buyer mix. Cash buyers, mortgage buyers, and progress payments do not produce the same monthly cash.",
          "Align sales uptake with construction. Front-loaded, even, or back-loaded absorption changes peak funding more than a 2% cost tweak.",
          "Put escrow and gap-fill on the page. 10/90, staged escrow, or progress drawdown is a financing constraint, not a legal footnote.",
          "Stress discounts, commissions, VAT, and defaults before you lock land. Net sales proceeds — not headline GDV — pay the scheme.",
        ],
      },
      {
        type: "h2",
        text: "What the Sale Stream actually models",
      },
      {
        type: "p",
        text: "Residential towers, landed product, commercial strata, and mixed-use. Development costs, sales revenue, unlevered project IRR, financing with escrow logic, levered equity returns, then scenarios. Typically a development horizon with no terminal value — returns come from costs versus net proceeds, not an exit cap rate borrowed from a hold model.",
      },
      {
        type: "quote",
        text: "Positioning isn’t a marketing word in a feasibility study — it’s a price quartile. And it changes every number downstream.",
      },
    ],
  },
  {
    slug: "How-Agents-Win-Landowner-Mandates-in-2026",
    title: "How agents win landowner mandates in 2026",
    excerpt:
      "The market has shifted. The agents who close exclusive mandates aren’t the ones with the flashiest decks — they’re the ones who walk in with numbers on the table.",
    category: "Persona",
    persona: "Closer",
    jurisdictions: ["UAE", "Malaysia", "UK", "Hong Kong", "Australia"],
    tags: ["agents", "mandates", "landowners", "GDV", "exclusive listing"],
    keywords: [
      "win landowner mandate",
      "real estate agent feasibility",
      "residual land value",
      "exclusive listing 2026",
      "development site pitch",
    ],
    date: "2026-08-22",
    readTime: "6 min read",
    author: "Rashdan",
    ...assets("How-Agents-Win-Landowner-Mandates-in-2026"),
    body: [
      {
        type: "p",
        text: "Landowners in 2026 have seen every glossy masterplan. What they have not seen enough of is a residual land value they can trust, produced fast enough to still be relevant when the next offer lands. Exclusive mandates now go to the advisor who can put numbers on the table — not the one with the nicest render.",
      },
      {
        type: "h2",
        text: "What “numbers on the table” means",
      },
      {
        type: "ul",
        items: [
          "A use and product mix the planning envelope can actually carry.",
          "GDV by price quartile, not a single heroic ASP.",
          "Development cost and peak funding, so the landowner sees why the residual is the residual.",
          "A base / downside case — because the first question will be “what if sales slow?”",
        ],
      },
      {
        type: "h2",
        text: "Speed is part of the pitch",
      },
      {
        type: "p",
        text: "If it takes three weeks to produce a feasibility pack, you are pitching last month’s market. Agents who can turn a site into a structured study in a sitting — and iterate live when the landowner changes height, mix, or hold-versus-sell — win the room.",
      },
      {
        type: "quote",
        text: "The agents who close exclusive mandates aren’t the ones with the flashiest decks — they’re the ones who walk in with numbers on the table.",
      },
      {
        type: "p",
        text: "FeasiBuild was built for that meeting. Run the site, export the deck, leave the residual on the table. The first report is free.",
      },
    ],
  },
  {
    slug: "The-6-Components-of-an-Institutional-Grade-Feasibility-Study",
    title: "The 6 components of an institutional-grade feasibility study",
    excerpt:
      "What separates a professional study from a back-of-napkin calculation — and why it matters for every development decision you make.",
    category: "Features",
    persona: "Teacher",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["feasibility study", "components", "IRR", "scenarios", "IC pack"],
    keywords: [
      "institutional feasibility study",
      "cash outflows inflows financing",
      "project IRR DSCR",
      "scenario analysis real estate",
      "investment committee pack",
    ],
    date: "2026-08-15",
    readTime: "8 min read",
    author: "Rashdan",
    ...assets("The-6-Components-of-an-Institutional-Grade-Feasibility-Study"),
    body: [
      {
        type: "p",
        text: "A back-of-napkin residual is a conversation starter. It is not a study. Institutional underwriting has a shape: costs, revenues, capital structure, returns, risk, then a narrative that a third party can audit. Skip a layer and the IC will find it.",
      },
      {
        type: "h2",
        text: "The six components",
      },
      {
        type: "ul",
        items: [
          "Cash outflows — land, construction, soft costs, phasing. If the cost plan is vague, every return is theatre.",
          "Cash inflows — the asset’s actual revenue language: rooms, GLA, sales proceeds, payment plans.",
          "Financing — tranches, LTC/LTV, equity, preference shares, escrow, covenants. Capital structure is not a plug.",
          "Project and equity returns — unlevered and levered IRR, NPV, multiples, DSCR where it applies.",
          "Scenario analysis — base, upside, downside with named drivers, not a single “conservative” case.",
          "The study — market commentary, risks, and an executive pack that matches the engine, not a parallel Word file.",
        ],
      },
      {
        type: "h2",
        text: "Why the order is the product",
      },
      {
        type: "p",
        text: "Each component feeds the next. You cannot finance a scheme whose costs and revenues are still informal. You cannot stress IRR until the waterfall exists. FeasiBuild enforces that path so the generated deck is a view of the model, not a rewrite of it.",
      },
      {
        type: "quote",
        text: "What separates a professional study from a back-of-napkin calculation is structure you can interrogate.",
      },
    ],
  },
  {
    slug: "How-to-Evaluate-a-Real-Estate-Deal-in-30-Minutes-vs-3-Weeks",
    title: "How to evaluate a real estate deal in 30 minutes vs 3 weeks",
    excerpt:
      "The difference between old-school consulting and AI-powered analysis — and why it changes everything for developers, analysts, and decision-makers.",
    category: "Features",
    persona: "Scout",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK"],
    tags: ["deal screening", "speed", "AI analysis", "underwriting cycle"],
    keywords: [
      "evaluate real estate deal fast",
      "30 minute feasibility",
      "AI vs consulting feasibility",
      "deal screening workflow",
      "development site underwriting",
    ],
    date: "2026-08-08",
    readTime: "6 min read",
    author: "Rashdan",
    ...assets("How-to-Evaluate-a-Real-Estate-Deal-in-30-Minutes-vs-3-Weeks"),
    body: [
      {
        type: "p",
        text: "Most deals die in the screening pile, not at IC. The expensive mistake is spending three weeks on a site you should have killed in thirty minutes — or passing on a site because the consultant slot was next month.",
      },
      {
        type: "h2",
        text: "What the three-week cycle actually is",
      },
      {
        type: "ul",
        items: [
          "A week to assemble comparables and a first-cut Excel model.",
          "A week of comments, revised ASPs, and a second cost plan.",
          "A week to turn the model into a memo and a slide pack that no longer matches version 3 of the sheet.",
        ],
      },
      {
        type: "h2",
        text: "What a 30-minute pass should answer",
      },
      {
        type: "p",
        text: "Does the use make sense on this site? Does pricing sit in a real quartile? What is peak funding? What happens if absorption slips or construction runs 10% hot? If you cannot answer those before lunch, you do not have an engine — you have a project.",
      },
      {
        type: "quote",
        text: "The difference between old-school consulting and AI-powered analysis is not the prose. It is whether you can iterate before the market moves.",
      },
      {
        type: "p",
        text: "FeasiBuild is built for that first pass and the tenth. Screen in minutes. If the residual holds, deepen the same model — do not start a new engagement letter.",
      },
    ],
  },
  {
    slug: "Why-90percent-of-Developers-Overpay-for-Feasibility-Studies",
    title: "Why 90% of developers overpay for feasibility studies",
    excerpt:
      "The hidden costs of traditional consulting that nobody talks about — and what you can do instead.",
    category: "Case Study",
    persona: "Scout",
    jurisdictions: ["UAE", "KSA", "Malaysia", "UK", "Australia"],
    tags: ["consulting cost", "pricing", "ROI", "iteration"],
    keywords: [
      "cost of feasibility study",
      "real estate consulting fees",
      "overpay for feasibility",
      "feasibility study alternative",
      "pay per report",
    ],
    date: "2026-08-01",
    readTime: "6 min read",
    author: "Rashdan",
    ...assets("Why-90percent-of-Developers-Overpay-for-Feasibility-Studies"),
    body: [
      {
        type: "p",
        text: "The invoice is not the expensive part. A $7,000–$15,000 consulting study looks like a line item. The hidden cost is the three weeks you cannot iterate, the second fee when the landowner changes mix, and the sites you never tested because the budget only covered one shot.",
      },
      {
        type: "h2",
        text: "Where the money actually goes",
      },
      {
        type: "ul",
        items: [
          "Waiting — opportunity cost on land that is still in play.",
          "Version tax — every scenario is a variation order, not a toggle.",
          "Format tax — rebuilding Excel into Word into PowerPoint so the board can read it.",
          "Data gravity — your assumptions live on the consultant’s laptop, so the next study starts from zero.",
        ],
      },
      {
        type: "h2",
        text: "A better cost structure",
      },
      {
        type: "p",
        text: "Platform access should not cost what a mid-market consultant charges per month. FeasiBuild is $99 lifetime access, then pay-as-you-use per report — from $19 — with the first report free. You keep the engine. You buy the study when you need the pack.",
      },
      {
        type: "quote",
        text: "The hidden costs of traditional consulting that nobody talks about are time, iteration, and the deals you never ran.",
      },
      {
        type: "p",
        text: "Overpaying is not a moral failing. It is what happens when the only institutional-looking output on the market is a three-week engagement. That is no longer the only option.",
      },
    ],
  },
  {
    slug: "7-Signs-Your-Feasibility-Study-is-Outdated",
    title: "7 signs your feasibility study is outdated",
    excerpt:
      "If you’re still doing feasibility studies the old way, you’re losing time and money. Here’s how to spot the warning signs — and what to do about it.",
    category: "Features",
    persona: "Auditor",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["audit", "quality", "Excel", "governance", "risk"],
    keywords: [
      "outdated feasibility study",
      "Excel feasibility risks",
      "feasibility study checklist",
      "model governance real estate",
      "static vs dynamic underwriting",
    ],
    date: "2026-07-22",
    readTime: "7 min read",
    author: "Rashdan",
    ...assets("7-Signs-Your-Feasibility-Study-is-Outdated"),
    body: [
      {
        type: "p",
        text: "An outdated study can still look professional. The fonts are fine. The IRR is to two decimals. The problems are structural — and they show up the first time someone asks “what if?”",
      },
      {
        type: "h2",
        text: "The seven warning signs",
      },
      {
        type: "ul",
        items: [
          "The model and the deck disagree, because they were last reconciled last Tuesday.",
          "Every asset type uses the same revenue block with the labels crossed out.",
          "There is no named downside case — only a single “base” that is already optimistic.",
          "Financing is a plug, not a schedule with escrow, draws, and covenants.",
          "Market commentary could apply to any city in the region.",
          "Changing one assumption takes a day and a new PDF export from three tools.",
          "The file lives on one laptop, with no audit trail and no way to rerun it next quarter.",
        ],
      },
      {
        type: "h2",
        text: "What to do instead",
      },
      {
        type: "p",
        text: "Put the engine, the scenarios, and the narrative in one system. Keep data in your own vault. Regenerate the pack when the world moves — do not freeze a week-three PDF and hope the market waits.",
      },
      {
        type: "quote",
        text: "If you’re still doing feasibility studies the old way, you’re losing time and money — usually before you notice the IRR was stale.",
      },
    ],
  },
  {
    slug: "5-AI-Trends-Transforming-Real-Estate-Finance-in-2026",
    title: "5 AI trends transforming real estate finance in 2026",
    excerpt:
      "The industry is evolving fast. Are you keeping up? Five shifts that are already changing how developments get underwritten.",
    category: "Features",
    persona: "Teacher",
    jurisdictions: ["UAE", "Malaysia", "Australia", "Hong Kong", "UK", "KSA"],
    tags: ["AI", "2026", "trends", "proptech", "finance"],
    keywords: [
      "AI real estate finance 2026",
      "proptech underwriting",
      "generative AI feasibility",
      "AI market research real estate",
      "bring your own AI",
    ],
    date: "2026-07-12",
    readTime: "7 min read",
    author: "Rashdan",
    ...assets("5-AI-Trends-Transforming-Real-Estate-Finance-in-2026"),
    body: [
      {
        type: "p",
        text: "AI in real estate finance is no longer a demo. In 2026 it is showing up in screening, market narrative, and the production of IC packs. The firms that treat it as a cover page will lose to the ones that put it inside the engine.",
      },
      {
        type: "h2",
        text: "Five shifts that matter",
      },
      {
        type: "ul",
        items: [
          "From chat to engines — useful AI writes into a model with constraints, not a generic essay about “the market”.",
          "City-and-segment research on demand — directional baselines in minutes, then a human checks the judgment.",
          "Scenario as a product — toggling drivers is the workflow, not a paid variation.",
          "Privacy as a procurement item — credit committees ask where the data lives. BYO AI and BYO storage win RFPs.",
          "Deck production inside the model — the slide pack is an export of the numbers, not a weekend in PowerPoint.",
        ],
      },
      {
        type: "h2",
        text: "What does not change",
      },
      {
        type: "p",
        text: "Judgment. AI does not replace a 30-year view of how escrow, sukuk, or a mall tenant mix actually behaves. It removes the clerical drag so that judgment is spent on the decision, not on rebuilding the waterfall.",
      },
      {
        type: "quote",
        text: "The industry is evolving fast. Are you keeping up?",
      },
    ],
  },
  {
    slug: "30-Years-of-Real-Estate-Finance-Lessons-from-Dubai-Kuwait-and-Malaysia",
    title:
      "30 years of real estate finance: lessons from Dubai, Kuwait & Malaysia",
    excerpt:
      "What I learned structuring billions in deals across the Middle East and Southeast Asia — and what every serious developer and investor needs to hear.",
    category: "Jurisdiction",
    persona: "Teacher",
    jurisdictions: [
      "UAE",
      "Kuwait",
      "Malaysia",
      "KSA",
      "Oman",
      "Singapore",
    ],
    tags: ["lessons", "MENA", "Southeast Asia", "project finance", "sukuk"],
    keywords: [
      "Dubai real estate finance",
      "Kuwait development lessons",
      "Malaysia project finance",
      "sukuk construction finance",
      "Gulf feasibility study",
    ],
    date: "2026-07-01",
    readTime: "9 min read",
    author: "Rashdan",
    ...assets(
      "30-Years-of-Real-Estate-Finance-Lessons-from-Dubai-Kuwait-and-Malaysia"
    ),
    body: [
      {
        type: "p",
        text: "I have spent three decades structuring real estate finance across the Gulf and Southeast Asia — construction funds in Saudi, recoveries in Dubai, mall financing in Oman, a business trust in Singapore. The jurisdictions differ. The mistakes rhyme.",
      },
      {
        type: "h2",
        text: "What the cycles teach",
      },
      {
        type: "ul",
        items: [
          "Dubai — liquidity and narrative can outrun cash. Peak funding, escrow, and a real downside absorption case are not optional.",
          "Kuwait and the wider GCC — capital is relationship-driven, but the model still has to survive a credit paper. Structure beats a handshake when the cycle turns.",
          "Malaysia and Singapore — process and disclosure are tighter. A study that cannot explain its drivers does not get through.",
          "Saudi construction finance — Shari’ah structure is a first-class constraint. You model it, or you do not have a facility.",
        ],
      },
      {
        type: "h2",
        text: "What every developer should take from this",
      },
      {
        type: "p",
        text: "Jurisdiction is not a flag on the cover slide. It is escrow rules, tax, funding customs, and what a local IC will accept as evidence. A generic global template fails in Ras Al Khaimah the same way it fails in Johor — just for different reasons.",
      },
      {
        type: "quote",
        text: "What I learned structuring billions in deals is that the model has to speak the market’s language — or the financing will not.",
      },
      {
        type: "p",
        text: "FeasiBuild exists to put that jurisdictional discipline into software: city-aware research, asset-specific engines, and a pack you can actually take to a bank in Dubai, Kuala Lumpur, or London.",
      },
    ],
  },
  {
    slug: "The-Founders-Journey-From-Investment-Banking-to-AI-Startup",
    title: "The founder’s journey: from investment banking to AI startup",
    excerpt:
      "How 30 years of real estate finance across the Gulf and Southeast Asia led to building FeasiBuild — and why the industry will never be the same.",
    category: "Launch",
    persona: "All",
    jurisdictions: ["UAE", "KSA", "Kuwait", "Oman", "Malaysia", "Singapore"],
    tags: ["founder", "origin story", "investment banking", "AI startup"],
    keywords: [
      "FeasiBuild founder",
      "Rashdan Ibrahim",
      "real estate finance career",
      "AI startup real estate",
      "from banking to proptech",
    ],
    date: "2026-06-20",
    readTime: "8 min read",
    author: "Rashdan",
    ...assets("The-Founders-Journey-From-Investment-Banking-to-AI-Startup"),
    body: [
      {
        type: "p",
        text: "I did not leave investment banking because spreadsheets were hard. I left the old workflow because it was beneath the decisions it was meant to support. After 30 years — CFO, EVP, director seats, sukuk, project finance, recoveries after 2008 — the feasibility pack was still a manual craft.",
      },
      {
        type: "h2",
        text: "The problem I could not unsee",
      },
      {
        type: "p",
        text: "Smaller developers paid too much for a single shot at a professional study. Larger sponsors paid again every time the mix changed. Everyone rebuilt the same waterfalls. I described the missing tool as “an experienced finance professional who can run scenarios with you — anytime, anywhere.” Generic AI could not do that with IC-grade precision. That gap is FeasiBuild.",
      },
      {
        type: "h2",
        text: "What 30 years put into the product",
      },
      {
        type: "ul",
        items: [
          "AED 670M recovery and swap work on a Dubai masterplan — downside cases are not academic.",
          "USD 100M Shari’ah construction fund in Saudi — structure is a constraint, not a footnote.",
          "AED 150M UAE bank financing — lenders read schedules, not slogans.",
          "USD 50M Oman mall — retail has its own language.",
          "SGD 1B Singapore business trust advisory — disclosure quality is the product.",
        ],
      },
      {
        type: "quote",
        text: "I wanted the tool I wish I’d had throughout my career — institutional-grade, instant, and honest about risk.",
      },
      {
        type: "p",
        text: "FeasiBuild is that tool, now in the hands of developers, valuers, financiers, and consultants who should not need a three-week engagement to know whether a site works.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}

export function getPostsSorted(): BlogPost[] {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function searchPosts(
  query: string,
  category: BlogCategory | "All",
  collection: BlogPost[] = getPostsSorted()
): BlogPost[] {
  const needle = query.trim().toLowerCase();
  return collection.filter((post) => {
    if (category !== "All" && post.category !== category) return false;
    if (!needle) return true;
    const haystack = [
      post.title,
      post.excerpt,
      post.persona,
      post.category,
      post.author,
      ...post.tags,
      ...post.keywords,
      ...post.jurisdictions,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const scored = getPostsSorted()
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const samePersona = candidate.persona === post.persona;
      const jurisdictionOverlap = candidate.jurisdictions.filter((jurisdiction) =>
        post.jurisdictions.includes(jurisdiction)
      ).length;
      const score =
        (samePersona ? 2 : 0) +
        (jurisdictionOverlap > 0 ? 1 + jurisdictionOverlap * 0.1 : 0);
      return { candidate, samePersona, jurisdictionOverlap, score };
    })
    .filter((entry) => entry.samePersona || entry.jurisdictionOverlap > 0)
    .sort((a, b) => b.score - a.score || (a.candidate.date < b.candidate.date ? 1 : -1));

  return scored.slice(0, limit).map((entry) => entry.candidate);
}
