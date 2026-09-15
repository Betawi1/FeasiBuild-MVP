export type Faq = {
    group: "Basics" | "Metrics" | "Comparisons" | "Product";
    question: string;
    answer: string;
    link?: { href: string; label: string };
  };
  
  export const faqs: Faq[] = [
    {
      group: "Basics",
      question: "What is a real estate development feasibility study?",
      answer: "A real estate development feasibility study is a structured analysis of whether a proposed project works before capital is committed: project assumptions, market demand, financial model, financing plan, risk analysis and executive summary. Its output is a bankable document lenders and investment committees rely on to approve or decline capital.",
      link: { href: "/blog/how-to-write-a-real-estate-feasibility-study", label: "Full guide: How to Write a Real Estate Feasibility Study" },
    },
    {
      group: "Basics",
      question: "What are the essential components of a feasibility study?",
      answer: "Six: project assumptions, market study, financial model (cashflows and equity waterfalls), financing plan, risk and sensitivity analysis, and an executive summary. Miss one and the report isn't bankable. Committees read the summary; everything else is evidence supporting it. FeasiBuild's output follows exactly this skeleton.",
      link: { href: "/blog/how-to-write-a-real-estate-feasibility-study", label: "Full guide: The six components, in order" },
    },
    {
      group: "Basics",
      question: "What are the key steps in conducting a real estate feasibility study?",
      answer: "Site and zoning check, market research, assumptions, financial model, scenario stress-tests, financing and risk analysis, then a compiled report with a go/no-go recommendation. Done manually this takes weeks; a guided engine compresses it to hours while keeping the same discipline and order.",
      link: { href: "/blog/how-to-write-a-real-estate-feasibility-study", label: "Full guide: Step by step" },
    },
    {
      group: "Basics",
      question: "How much does a feasibility study cost?",
      answer: "Consultant-produced studies commonly run $10,000–$50,000+ depending on asset complexity, with every revision billed separately. Spreadsheet templates cost little but consume dozens of analyst hours. FeasiBuild prices differently: $99 lifetime access plus per-report credits, first report free — cost follows usage, not calendars.",
      link: { href: "/blog/best-feasibility-study-software-2026", label: "Full guide: The pricing math nobody shows you" },
    },
    {
      group: "Metrics",
      question: "What is DSCR and why do lenders care?",
      answer: "The Debt Service Coverage Ratio divides cash available for debt service by total principal and interest payments. Lenders typically require 1.20–1.35x or better; below 1.0x the asset cannot cover its own loan. It is usually the first number a credit committee reads.",
      link: { href: "/blog/dscr-explained-for-real-estate-developers", label: "Full guide: DSCR explained for developers" },
    },
    {
      group: "Metrics",
      question: "IRR vs equity multiple — which matters more?",
      answer: "Neither alone. IRR rewards speed of return; equity multiple rewards total cash returned. Quick flips flatter IRR; long holds flatter the multiple. Institutional committees require both side by side, with downside cases, because each metric hides what the other reveals.",
      link: { href: "/blog/irr-vs-equity-multiple-explained", label: "Full guide: IRR vs equity multiple" },
    },
    {
      group: "Metrics",
      question: "What is a cash flow waterfall in real estate?",
      answer: "The contractual order in which project cash is distributed: senior debt service first, then return of investor capital, preferred returns, and finally promote splits to the sponsor. Sequence changes outcomes — two deals with identical profits can pay parties very differently.",
      link: { href: "/blog/real-estate-development-financial-model", label: "Full guide: The development financial model" },
    },
    {
      group: "Comparisons",
      question: "Feasibility study vs appraisal — what's the difference?",
      answer: "An appraisal is an opinion of an asset's value at a point in time, prepared by a licensed valuer. A feasibility study tests whether a proposed development will work — costs, timing, financing, returns, risk. Lenders need both: feasibility to judge viability, appraisal to set loan size.",
      link: { href: "/blog/feasibility-study-vs-appraisal", label: "Full guide: Feasibility vs appraisal" },
    },
    {
      group: "Comparisons",
      question: "AI vs Excel for real estate proformas — which should I use?",
      answer: "Both, at different stages. Excel gives control and auditability; AI engines give speed, payment-structure logic and instant scenario recalculation. The professional hybrid: engine drafts and stress-tests, Excel or an auditable export handles final tuning. Demand visible assumptions, exportable models and data ownership from any tool.",
      link: { href: "/blog/ai-vs-excel-real-estate-proforma", label: "Full guide: The 2026 verdict" },
    },
    {
      group: "Product",
      question: "Which countries and payment structures does FeasiBuild support?",
      answer: "Any location on earth via pin-drop. Native presets cover Dubai Law No. 8, Malaysia HDA and Australia's 10/90; everywhere else uses the configurable payment-structure engine — no escrow, custom progress splits like 20/80 or 30/70, or staged escrow with custom retentions. AI research falls back to the nearest city when hyper-local data is thin.",
      link: { href: "/blog/feasibuild-vs-the-market-2026", label: "Full guide: FeasiBuild vs the market" },
    },
    {
      group: "Product",
      question: "Is my project data safe with AI tools?",
      answer: "With most tools, unclear. FeasiBuild is zero-knowledge by design: your project data stays encrypted in your own Puter cloud — our servers never see it — and you choose which AI engine runs the analysis (Qwen, Claude, OpenAI or DeepSeek). Confidentiality treated as fiduciary, not technical.",
      link: { href: "/blog/ai-tools-for-real-estate-underwriting", label: "Full guide: The buyer's checklist" },
    },
    {
      group: "Product",
      question: "Can I put my own firm's logo on FeasiBuild reports?",
      answer: "Yes. White-label PDF export is available on the advisory tiers, so boutique consultancies and independent valuers can present institutional-grade feasibility studies under their own brand — charts, tables, narrative and all. Your client sees your logo, not ours. It's the two-person firm presenting like a forty-person consultancy.",
      link: { href: "/blog/feasibuild-vs-the-market-2026", label: "Full guide: Ownership economics" },
    },
  ];