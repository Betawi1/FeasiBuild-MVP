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
  slug: "why-i-charge-dollar99-for-lifetime-access",
  title: "Why I Charge $99 for Lifetime Access — Instead of $500/Month",
  excerpt: "Two traps own this industry: the consultant ransom and the SaaS subscription. Here's the pricing philosophy behind paying once, owning the engine, and never being billed for silence.",
  category: "Features",
  persona: "All",
  jurisdictions: [],
  tags: ["Pricing Philosophy", "Lifetime Access", "Report Credits", "No Subscription", "Ownership"],
  keywords: ["feasibility study software pricing", "lifetime access vs subscription", "real estate feasibility study cost", "saas subscription trap", "own your software"],
  date: "2026-10-19",
  readTime: "2 min read",
  author: "Rashdan",
  poster: "/blog/why-i-charge-dollar99-for-lifetime-access/poster.png",
  deckPdf: "/blog/why-i-charge-dollar99-for-lifetime-access/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "Every pricing decision is a philosophy decision. After 30 years in real estate finance, here is mine — and the two traps it refuses to repeat." },
    { type: "h2", text: "Trap #1: The Consultant Ransom" },
    { type: "p", text: "After 30 years in real estate finance, I've watched consultants turn a single decision into a recurring revenue stream for themselves — not for you." },
    { type: "ul", items: [
      "$15,000 study fee — pay upfront for a feasibility model; one deliverable, one price tag",
      "Pay again to change — want to adjust the unit mix? That's another invoice; every revision costs extra",
      "You own nothing — the model lives with them; you're always one change request away from another bill"
    ]},
    { type: "h2", text: "Trap #2: The SaaS Subscription Trap" },
    { type: "p", text: "SaaS companies charge you every month just to keep your account open — even if you only run one feasibility model per year." },
    { type: "ul", items: [
      "$500/month × 12 = $6,000/year — just to keep the door unlocked; no usage required",
      "Dormant months still bill — skip a quarter? You still paid $1,500 for nothing"
    ]},
    { type: "h2", text: "The FeasiBuild Model: Pay Once. Own the Engine." },
    { type: "p", text: "No expiration. No renewal reminders. No account suspension for inactivity." },
    { type: "ul", items: [
      "$99 one-time fee — lifetime access to the full AI feasibility engine; no monthly charge, no credit card on file",
      "0 monthly subscriptions — if you don't use the tool for 3 months, you pay nothing",
      "30+ years in the industry — built by someone who's been on both sides of the table, and chose to fix it"
    ]},
    { type: "quote", text: "We don't bill you for silence." },
    { type: "h2", text: "You Only Pay When You Build" },
    { type: "p", text: "Report credits — pay per export. Need a clean PDF for a lender or investor? Buy credits only when you're ready to export." },
    { type: "ul", items: [
      "Single report — $49 for one professional PDF export",
      "50-pack — bulk discount for frequent users",
      "Unlimited pack — running models weekly? $2,400/year covers unlimited exports for a full 12 months; no per-report fees, set it and forget it"
    ]},
    { type: "h2", text: "Zero Rent-Seeking. By Design." },
    { type: "p", text: "Most tools are designed to make you dependent. FeasiBuild is designed to set you free." },
    { type: "ul", items: [
      "No hostage pricing — your models, your data, your access; nothing held back behind a renewal wall",
      "Inactivity costs nothing — take 3 months off, take a year; when you come back, your access is still there",
      "Aligned incentives — we only make money when you're actively building; that's the point"
    ]},
    { type: "h2", text: "Stop Paying Rent on Your Own Tools" },
    { type: "p", text: "Try it free. Upgrade when you're ready. No pressure, no countdown timers." },
    { type: "ul", items: [
      "Explorer tier — free; explore the platform at zero cost before committing a dollar",
      "Lifetime access — from $99 one-time; own the engine forever, no subscription required"
    ]},
    { type: "p", text: "Try the free Explorer tier at feasibuild.app — and keep whatever you build, forever." }
  ],
},

  {
  slug: "seven-escrow-regimes-one-cashflow-engine",
  title: "Seven Escrow Regimes. One Cashflow Engine.",
  excerpt: "How FeasiBuild models off-plan buyer-payment rules natively — from Dubai's Law No. 8 to India's RERA 70/30. One engine. Every jurisdiction.",
  category: "Jurisdiction",
  persona: "All",
  jurisdictions: ["AU", "CN", "IN", "MY", "SA", "AE"],
  tags: ["Escrow", "Off-Plan", "RERA", "HDA", "Payment Structures", "Project Finance"],
  keywords: ["escrow rules real estate", "off-plan payment structures", "dubai law 8 escrow", "rera 70/30", "hda progress drawdown", "10/90 rule"],
  date: "2026-10-19",
  readTime: "3 min read",
  author: "Rashdan",
  poster: "/blog/seven-escrow-regimes-one-cashflow-engine/poster.png",
  deckPdf: "/blog/seven-escrow-regimes-one-cashflow-engine/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "Seven escrow regimes. Six countries. One cashflow engine. Most proformas treat off-plan buyer payments as a single inflow line — but every jurisdiction runs its own legal machine. Here is how each one works, and how FeasiBuild models it natively." },
    { type: "h2", text: "Australia — 10/90 Rule" },
    { type: "p", text: "10% deposit at contract, 90% at completion. No project escrow — the deposit is held under state conveyancing trust rules, and the developer carries interest on equity until settlement." },
    { type: "ul", items: [
      "Governing law: Conveyancing Act 1919 (NSW) · Property Law Act 1974 (Qld) · Sale of Land Act 1962 (Vic)",
      "Retention: none — no escrow account exists",
      "In FeasiBuild: 10/90 timing + interest carry; splits editable (20/80, 30/70)"
    ]},
    { type: "h2", text: "China — Closed-Loop Escrow Rule" },
    { type: "p", text: "Pre-sale proceeds enter government-supervised bank accounts; withdrawals are ring-fenced to construction of that project and released node by node." },
    { type: "ul", items: [
      "Governing law: Urban Real Estate Administration Law (PRC) · MOHURD Measures · municipal pre-sale funds supervision measures",
      "Retention: 3% of building works retained from the main contractor for 24 months post-completion",
      "In FeasiBuild: node-gated releases; zero free cash before certification"
    ]},
    { type: "h2", text: "India — Proportionate Escrow Rule" },
    { type: "p", text: "70% of every buyer payment is locked in the designated account; 30% is immediate free cash. Withdrawals equal certified completion % × permitted cost, and the lender sweep is locked ON." },
    { type: "ul", items: [
      "Governing law: RERA 2016 s.4(2)(l)(D) & s.4(3) · State RERAs (MahaRERA, TS RERA…)",
      "Retention: none — the five-year structural defect liability is a separate legal obligation",
      "In FeasiBuild: 70% split and sweep locked for India; editable elsewhere"
    ]},
    { type: "h2", text: "Malaysia — Progress Drawdown Rule" },
    { type: "p", text: "Payments enter the statutorily controlled Housing Development Account; withdrawals only per certified Schedule of Progress stages." },
    { type: "ul", items: [
      "Governing law: Housing Development (Control and Licensing) Act 1966 (Act 118) + Regulations 1989 · KPKT",
      "Retention: 5% of GDV — 2.5% released after 8 months, remaining 2.5% after 24 months",
      "In FeasiBuild: stage-based drawdown curve, native"
    ]},
    { type: "h2", text: "Saudi Arabia — Milestone & Retention Escrow Rule" },
    { type: "p", text: "Payments enter supervised escrow; certified milestone releases apply with a 20% completion floor (locked), and the lender sweep is locked ON." },
    { type: "ul", items: [
      "Governing law: Off-Plan Sale & Lease Law + Implementing Regulations (Wafi programme) · REGA",
      "Retention: 20% completion floor (locked) + 5% held for 12 months after completion",
      "In FeasiBuild: floor and sweep locked for KSA"
    ]},
    { type: "h2", text: "UAE · Abu Dhabi — Project Guarantee Account Rule" },
    { type: "p", text: "Buyer payments enter a project guarantee account; developer access only against certified project progress." },
    { type: "ul", items: [
      "Governing law: Abu Dhabi Law No. 3 of 2015 · DMT — Real Estate Regulatory Committee",
      "Retention: 5% held for 12 months after project completion",
      "In FeasiBuild: native preset in the cashflow engine"
    ]},
    { type: "h2", text: "UAE · Dubai — Staged Escrow Rule" },
    { type: "p", text: "Payments are locked in project escrow, released at certified construction milestones, with retention held to handover." },
    { type: "ul", items: [
      "Governing law: Law No. 8 of 2007 · Dubai Land Department (DLD) / RERA",
      "Retention: 5% of GDV held for 12 months after completion",
      "In FeasiBuild: milestone releases + retention, automatic"
    ]},
    { type: "h2", text: "Everywhere Else" },
    { type: "p", text: "Market not on the list? Pin-drop any country: choose the No-Escrow Rule, or adopt and edit any of the seven regimes — split %, certification cadence, sweep, retention, horizon. The mechanism is not a country label." },
    { type: "p", text: "Run your first study free on the Explorer tier — and watch your jurisdiction's rules drive the cashflow. feasibuild.app" }
  ],
},
{
  slug: "your-job-is-to-break-it",
  title: "The Base Case Always Works. Your Job Is to Break It.",
  excerpt: "Every developer submits a perfect model. Every credit officer's job is to find where it fails — before the bank commits capital. A 22% IRR, 1.3x DSCR submission, shocked in one click.",
  category: "Case Study",
  persona: "Auditor",
  jurisdictions: [],
  tags: ["Downside Shock", "DSCR", "Stress Testing", "Credit Risk", "Zero-Knowledge"],
  keywords: ["downside scenario real estate", "dscr covenant breach", "credit officer feasibility", "construction loan stress test", "zero knowledge financial modeling"],
  date: "2026-10-19",
  readTime: "2 min read",
  author: "Rashdan",
  poster: "/blog/your-job-is-to-break-it/poster.png",
  deckPdf: "/blog/your-job-is-to-break-it/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "Every developer submits a perfect model. Every credit officer's job is to find where it fails — before the bank commits capital." },
    { type: "h2", text: "The Developer's Submission: 22% IRR. 1.3x DSCR. Looks Perfect." },
    { type: "p", text: "Developers submit their best-case scenario — and it always looks clean. The numbers are internally consistent. The returns are attractive. The risk ratios appear conservative." },
    { type: "ul", items: [
      "22% IRR — compelling on paper",
      "1.3x DSCR — comfortably above the 1.2x covenant",
      "70% LTC — within standard underwriting limits"
    ]},
    { type: "h2", text: "The Reality: In 30 Years, No Project Has Gone Exactly to Plan" },
    { type: "p", text: "The Base Case assumes perfect execution. Reality doesn't cooperate. These are the three stressors that break deals — and they happen more often than developers admit:" },
    { type: "ul", items: [
      "Hard costs +10% — material and labor overruns are routine, not exceptional; contingency buffers get consumed fast",
      "Rates +150 bps — a mid-construction rate hike reshapes debt service obligations and compresses margins",
      "Sales delayed 3 months — absorption slows, carrying costs accumulate, and cashflow timing breaks the model"
    ]},
    { type: "h2", text: "One Click. Instant Downside Shock." },
    { type: "p", text: "FeasiBuild doesn't require manual scenario modeling. With a single click, the platform shocks the developer's Base Case against a predefined downside scenario — and recalculates every metric instantly. Import base. Apply shock. No spreadsheet manipulation. No manual recalculation. The model breaks itself — in seconds, not hours." },
    { type: "h2", text: "The Result: DSCR Drops to 0.9x. The Loan Is Underwater." },
    { type: "p", text: "Under the downside scenario, DSCR falls below the 1.2x covenant floor — triggering a technical default before construction even completes." },
    { type: "ul", items: [
      "Debt service obligations exceed available cashflow",
      "Equity cushion is insufficient to absorb cost overruns",
      "The deal requires restructuring — or should not be funded"
    ]},
    { type: "quote", text: "A Base Case DSCR of 1.3x provides only 0.1x buffer above covenant. This is not a margin of safety — it's a margin of error." },
    { type: "h2", text: "Your Data Never Leaves Your Infrastructure" },
    { type: "p", text: "BYO-infrastructure — zero-knowledge security. FeasiBuild is built for institutions that cannot compromise on data sovereignty. Sensitive financial models and deal data reside exclusively in your private cloud — never on our servers." },
    { type: "ul", items: [
      "Zero-knowledge architecture — we process calculations without ever accessing your raw financial data",
      "Bank-grade compliance — designed to meet institutional security and regulatory requirements",
      "Private cloud deployment — deploy on your infrastructure; full data ownership, always"
    ]},
    { type: "p", text: "Break your own model before a credit officer breaks it for you — first scenario free on the Explorer tier. feasibuild.app" }
  ],
},
{
  slug: "i-ran-a-stress-test-on-a-200-unit-residential-deal",
  title: "I Ran a Stress Test on a 200-Unit Residential Deal — Here's What Happened",
  excerpt: "An 18% base IRR on a 200-unit Malaysian residential project. Two 5% assumption shifts — price down, costs up — and the margin was gone. What the tornado chart saw coming.",
  category: "Case Study",
  persona: "Closer",
  jurisdictions: ["MY"],
  tags: ["Stress Testing", "Sensitivity Analysis", "Tornado Chart", "IRR", "Risk"],
  keywords: ["real estate stress test", "irr sensitivity analysis", "tornado chart real estate", "feasibility downside case", "residential development malaysia"],
  date: "2026-10-19",
  readTime: "2 min read",
  author: "Rashdan",
  poster: "/blog/i-ran-a-stress-test-on-a-200-unit-residential-deal/poster.png",
  deckPdf: "/blog/i-ran-a-stress-test-on-a-200-unit-residential-deal/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "What looked like a home run on paper turned into something very different when the numbers were pushed. This is what happened — and why it matters for every developer running feasibility on a new project." },
    { type: "h2", text: "The Base Case: 18% IRR. Looks Like a Home Run." },
    { type: "p", text: "A 200-unit residential project in Malaysia. On paper, the assumptions were aggressive but believable — strong sales velocity, fat margins, clean returns." },
    { type: "ul", items: [
      "200 units — residential development",
      "18% base IRR — projected return on equity",
      "5% price drop — the stress scenario trigger"
    ]},
    { type: "h2", text: "The Question Nobody Asks: What If the Market Softens Right at Launch?" },
    { type: "p", text: "Most feasibility models stop at the base case. The real risk hides in the assumptions that feel safe — until they're not. Two variables were stress-tested simultaneously:" },
    { type: "ul", items: [
      "Selling price −5% — market softens just as the sales gallery opens",
      "Construction costs +5% — material and labor inflation hits mid-build"
    ]},
    { type: "h2", text: "The Tornado Chart: Mapping the Exact Risk Vectors" },
    { type: "p", text: "A tornado chart ranks risk factors by impact — showing which assumptions move the needle most. In this case, selling price sensitivity dominated, with construction cost inflation compounding the damage: price −5% alone dragged IRR to 13%; costs +5% alone to 15% — against the 18% base case as the reference line." },
    { type: "quote", text: "This is the difference between a back-of-the-napkin model and an institutional-grade feasibility study. You don't just calculate the upside — you map the landmines." },
    { type: "h2", text: "The Shock: IRR Collapsed from 18% to 4.2%" },
    { type: "p", text: "The profit margin vanished. The developer was essentially working for free — generating just enough to cover the bank's interest." },
    { type: "ul", items: [
      "Base case: 18% IRR — strong returns, attractive to equity partners",
      "Stress case: 4.2% IRR — margin evaporated, project barely covers debt service",
      "The gap: 13.8 points — wiped out by two 5% assumption shifts"
    ]},
    { type: "h2", text: "It Doesn't Just Break the Math — It Writes the Advisory" },
    { type: "p", text: "FeasiBuild didn't output a broken spreadsheet. The AI generated a 2-page scenario analysis & IRR sensitivity — explaining exactly the factors why the project was vulnerable and what to do about it." },
    { type: "ul", items: [
      "Diagnosed the vulnerability — identified price sensitivity as the primary risk driver",
      "Recommended a fix — build a 10% contingency into the equity stack",
      "Institutional-grade output — ready to share with lenders, partners, and stakeholders"
    ]},
    { type: "p", text: "Run your own stress test before the market runs it for you — first scenario free on the Explorer tier. feasibuild.app" }
  ],
},
{
  slug: "why-standard-templates-fail-in-australia",
  title: "Why Standard Templates Fail in Australia",
  excerpt: "Most feasibility models assume standard progress payments. In Australia, off-the-plan sales run on 10/90 — and that difference can quietly destroy your project's cashflow.",
  category: "Jurisdiction",
  persona: "All",
  jurisdictions: ["AU"],
  tags: ["10/90", "Off-the-Plan", "Interest Reserve", "Construction Loan", "Excel Templates"],
  keywords: ["10/90 rule australia", "off the plan settlement cashflow", "australian development feasibility", "interest reserve construction loan", "excel template australia"],
  date: "2026-10-19",
  readTime: "2 min read",
  author: "Rashdan",
  poster: "/blog/why-standard-templates-fail-in-australia/poster.png",
  deckPdf: "/blog/why-standard-templates-fail-in-australia/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "Most feasibility models are built for standard progress payment structures. In Australia, off-the-plan sales work differently — and that difference can quietly destroy your project's cashflow." },
    { type: "h2", text: "The 10/90 Rule: How Settlement Actually Works" },
    { type: "p", text: "In Australia, off-the-plan buyers pay just 10% at contract. The remaining 90% isn't due until practical completion — often 2 to 3 years later." },
    { type: "ul", items: [
      "10% — Day 1: buyer deposit on exchange of contracts",
      "90% — Completion: balance due at practical completion (2–3 years later)"
    ]},
    { type: "h2", text: "The Trap: Front-Loaded Equity & Heavy Interest Carry" },
    { type: "ul", items: [
      "Equity is front-loaded — without the 90% settlement, developer equity must cover far more of the construction cost upfront; standard templates underestimate this dramatically",
      "Interest accrual is heavier — construction loan interest compounds over the full build period with no offsetting settlement receipts; the carry is much larger than generic models predict",
      "Loan sizing is off — if your model doesn't account for delayed receipts, your construction loan will be undersized from the outset"
    ]},
    { type: "h2", text: "A 3-Month Delay Can Blow Up Your Interest Reserve" },
    { type: "p", text: "In a 10/90 structure, the 10% deposit is kept in escrow and you don't receive both the 10% deposit and the 90% settlement capital until completion. A delay doesn't just push your timeline — it extends your interest-bearing period with zero offsetting income." },
    { type: "quote", text: "A 3-month delay doesn't just cost time. It compounds interest on the full loan balance, with no settlement receipts to offset it. Your interest reserve can be exhausted before completion." },
    { type: "p", text: "On-time completion: interest reserve intact, 90% received at practical completion, project viable. Three months late: interest reserve blown, no 90% receipt, cashflow crisis at Month 18." },
    { type: "h2", text: "How Generic Excel Templates Get It Wrong" },
    { type: "p", text: "Standard feasibility templates assume standard progress payment cashflows — staged receipts throughout construction. They do not model the 10/90 structure natively." },
    { type: "ul", items: [
      "Assume staged settlement receipts — templates treat buyer payments as evenly distributed, not deferred to completion",
      "Understate the construction loan — without the correct cashflow timing, loan sizing is optimistic and equity gaps appear mid-build",
      "Miss the interest reserve risk — delays are treated as minor, not as events that can exhaust your entire interest reserve"
    ]},
    { type: "h2", text: "FeasiBuild: Native 10/90 Cashflow Waterfalls" },
    { type: "p", text: "FeasiBuild is built for the Australian market. The 10/90 structure isn't a workaround — it's the default." },
    { type: "ul", items: [
      "Automatic 90% deferral — the cashflow waterfall delays the 90% receipt to practical completion, no manual adjustments required",
      "Correct interest carry — construction loan interest is calculated on the true outstanding balance, reflecting the delayed settlement reality",
      "Proper loan sizing — your construction loan is sized to the actual equity gap, not an optimistic template assumption"
    ]},
    { type: "p", text: "Run your first Australian scenario free on the Explorer tier — and see what your template has been hiding. feasibuild.app" }
  ],
},
  {
  slug: "which-actually-makes-more-money",
  title: "Ambient Warehouse vs. Cold Storage: Which Actually Makes More Money?",
  excerpt: "A live scenario test on a designated Dubai industrial plot — same land, same building code, same financing. Only the product format changed. The math decided.",
  category: "Case Study",
  persona: "Closer",
  jurisdictions: ["UAE"],
  tags: ["Logistics", "Cold Storage", "Highest & Best Use", "Scenario Testing", "Industrial"],
  keywords: ["ambient warehouse vs cold storage", "cold storage investment returns", "highest and best use dubai", "industrial feasibility study", "construction loan drawdown modeling"],
  date: "2026-10-19",
  readTime: "2 min read",
  author: "Rashdan",
  poster: "/blog/which-actually-makes-more-money/poster.png",
  deckPdf: "/blog/which-actually-makes-more-money/deck.pdf",
  slides: [],
  body: [
    { type: "p", text: "In the UAE, the master developer dictates your land use. Your job as a developer is to figure out how to maximize the yield within the permitted use and the plot's building code." },
    { type: "p", text: "This week, I ran a live scenario test on a designated Dubai industrial plot using FeasiBuild to see which product format actually penciled out best:" },
    { type: "ul", items: [
      "Scenario A: Grade-A Ambient Logistics Warehouse",
      "Scenario B: Chilled / Cold Storage Facility"
    ]},
    { type: "p", text: "I kept the land cost, plot size, and financing terms identical. Only the product format changed." },
    { type: "h2", text: "Scenario A: Grade-A Ambient Logistics Warehouse" },
    { type: "ul", items: [
      "Lower capex — standard MEP fit-out, no refrigeration infrastructure; construction costs stay lean from day one",
      "Faster build timeline — simpler systems mean shorter construction periods and earlier lease-up",
      "Lower peak equity — less capital tied up during construction; the loan drawdown curve stays manageable"
    ]},
    { type: "h2", text: "Scenario B: Chilled / Cold Storage Facility" },
    { type: "ul", items: [
      "Massive rental yield — cold storage commands premium rents; the yield advantage over ambient is significant",
      "Brutal MEP costs — refrigeration plant, insulated panels and specialized fit-outs hammer the capex budget",
      "Higher peak equity — heavier construction loan drawdowns spike the interest reserve; cashflow pressure is real"
    ]},
    { type: "h2", text: "The Results in 30 Minutes" },
    { type: "p", text: "Cold storage wins massively on rental yield… but the ambient warehouse crushed it on Development IRR and required far less peak equity. Refrigeration capex and MEP fit-outs are brutal on the cashflow." },
    { type: "h2", text: "The Kicker: Automated Loan Drawdown Modeling" },
    { type: "p", text: "FeasiBuild didn't just compare static returns — it automatically adjusted construction loan drawdowns and milestone-based cashflows for the heavier MEP costs in the cold storage scenario, surfacing exactly when the interest reserve would peak." },
    { type: "p", text: "The result: a precise view of when and how much equity each scenario demands — not just what the IRR looks like on paper." },
    { type: "h2", text: "Highest & Best Use, Master-Planned Edition" },
    { type: "quote", text: "You don't guess the format. You let the math prove it." },
    { type: "p", text: "In master-planned markets, highest and best use analysis isn't about rezoning — it's about stress-testing every permitted product format against real construction costs, financing structures, and lease assumptions." },
    { type: "ul", items: [
      "Same plot — identical land cost & building code",
      "Different formats — ambient vs. cold storage",
      "One winner — the IRR and equity story decides"
    ]},
    { type: "h2", text: "Run Your Own Scenario in 30 Minutes" },
    { type: "p", text: "FeasiBuild automates the highest and best use work that institutional developers and lenders need — from construction loan drawdowns to development IRR — without a spreadsheet in sight." },
    { type: "ul", items: [
      "Try the free Explorer tier — run your first scenario at no cost, and see how the math works before you commit",
      "Lifetime access from $99 — full modeling power for a single investment; no subscription, no surprises"
    ]}
  ],
},
  {
    slug: "go-no-go-in-hours-not-weeks",
    title: "Go / No-Go in Hours, Not Weeks",
    excerpt: "In acquisitions, speed isn't an advantage. It's the whole game. Here is the 48-hour underwriting workflow.",
    category: "Persona",
    persona: "Scout",
    jurisdictions: ["UAE", "MY", "AU"],
    tags: ["Land Acquisition", "Deal Sourcing", "Private Equity", "Underwriting"],
    keywords: ["real estate acquisition", "land residual value", "48 hour underwriting", "real estate scout"],
    date: "2026-09-24",
    readTime: "2 min read",
    author: "Rashdan",
    poster: "/blog/go-no-go-in-hours-not-weeks/poster.png",
    deckPdf: "/blog/go-no-go-in-hours-not-weeks/deck.pdf",
    slides: [],
    body: [
      { type: "p", text: "The most expensive mistake in development isn't buying a bad deal." },
      { type: "p", text: "It's being slow on a good one." },
      { type: "p", text: "While you wait 3 weeks for a feasibility model, the land parcel you spotted has already been bought by a developer who decided in 48 hours." },
      { type: "p", text: "In acquisitions, speed isn't an advantage. It's the whole game." },
      { type: "h2", text: "The Cost of Slow" },
      { type: "p", text: "I've sat on both sides of the table for 30 years — structuring the financing and chasing the deals. The pattern is always the same:" },
      { type: "ul", items: [
        "Wait 3 weeks for the consultant's model",
        "By then, the land price has moved",
        "Or a competitor has already signed"
      ]},
      { type: "h2", text: "The 48-Hour Underwriting Workflow" },
      { type: "p", text: "So I built FeasiBuild for the Scout:" },
      { type: "ul", items: [
        "Pin-drop the parcel",
        "Get the Residual Land Value in minutes",
        "Shock the downside before you offer",
        "Walk into Monday's meeting with a Go / No-Go"
      ]},
      { type: "p", text: "Same rigor. A fraction of the time." },
      { type: "p", text: "The question isn't 'is this a good deal?' It's 'can you answer before the market moves?'" }
    ],
  },
  {
    slug: "a-user-asked-me-to-keep-his-name-secret",
    title: "A User Asked Me to Keep His Name Secret",
    excerpt: "When a user refuses to give a testimonial because they don't want competitors knowing their edge, you know the tool works.",
    category: "Case Study",
    persona: "All",
    jurisdictions: ["UAE"],
    tags: ["Competitive Advantage", "Zero-Knowledge", "Data Privacy", "Founder Story"],
    keywords: ["real estate competitive advantage", "zero knowledge data privacy", "AI feasibility tool"],
    date: "2026-09-24",
    readTime: "2 min read",
    author: "Rashdan",
    poster: "/blog/a-user-asked-me-to-keep-his-name-secret/poster.png",
    deckPdf: "/blog/a-user-asked-me-to-keep-his-name-secret/deck.pdf",
    slides: [],
    body: [
      { type: "p", text: "One of my first users declined to provide a testimonial." },
      { type: "p", text: "Not because he's unhappy. The opposite." },
      { type: "p", text: "He's a Dubai realtor using FeasiBuild to generate feasibility studies for the land plots he is pitching to investors — and he doesn't want his competitors knowing how he produces his institutional-grade reports." },
      { type: "p", text: "I respect that. And honestly? It's the best feedback I've ever received." },
      { type: "h2", text: "An Edge, Not Just a Tool" },
      { type: "p", text: "Because it means the tool isn't just useful. It's an edge. And people protect their edges." },
      { type: "quote", text: "Our promise to every FeasiBuild user: your data lives in your own private cloud (we couldn't see it if we tried), and your secrets stay yours." },
      { type: "p", text: "We'll keep building. You keep winning. Quietly." }
    ],
  },
  {
    slug: "are-you-a-valuer-or-an-excel-mechanic",
    title: "Are You a Valuer, or an Excel Mechanic?",
    excerpt: "Most valuers and consultants are secretly overworked Excel mechanics. Here is how to get your weekends back and explode your margins.",
    category: "Persona",
    persona: "Workhorse",
    jurisdictions: ["UAE", "MY", "AU"],
    tags: ["Valuation", "RICS", "BOVAEP", "Financial Modeling", "Consulting"],
    keywords: ["real estate valuer", "RICS valuation", "BOVAEP", "real estate financial modeling", "excel proforma alternative"],
    date: "2026-09-24",
    readTime: "2 min read",
    author: "Rashdan",
    poster: "/blog/are-you-a-valuer-or-an-excel-mechanic/poster.png",
    deckPdf: "/blog/are-you-a-valuer-or-an-excel-mechanic/deck.pdf",
    slides: [],
    body: [
      { type: "p", text: "Most valuers and consultants are secretly overworked Excel mechanics." },
      { type: "p", text: "You charge for your expertise, your judgment, and your market knowledge. But what do you actually spend 80% of your time doing?" },
      { type: "ul", items: [
        "Fixing broken circular references",
        "Formatting PDF charts to look \"professional\"",
        "Manually updating generic templates for new jurisdictions",
        "Starting the model over when the client changes their mind on the unit mix"
      ]},
      { type: "h2", text: "The 80/20 Problem" },
      { type: "p", text: "The dirty secret of the industry: Clients pay for the final 20% (the analysis). But you are burning your weekends doing the first 80% (the formatting)." },
      { type: "h2", text: "The Workhorse's New Workflow" },
      { type: "p", text: "I built FeasiBuild specifically for the Workhorse." },
      { type: "p", text: "You input the raw assumptions and the capital stack. The platform handles the jurisdiction logic (HDA, 10/90, Escrow), builds the dynamic financial waterfall, and auto-generates the bankable PDF report." },
      { type: "p", text: "You get your weekends back. Your clients get faster turnaround. Your margins explode." }
    ],
  },
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
