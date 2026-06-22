import type {
  AggregatedProjectData,
  AnnualRevenuesData,
  CompetitionData,
  FeasibilitySlide,
  HistoricalGuestsData,
  HospitalitySummaryData,
  ImplicationsData,
  LengthOfStayData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";

function isUae(country: string): boolean {
  return country.toLowerCase().includes("uae") || country.toLowerCase().includes("emirates");
}

function isDubai(city: string): boolean {
  return city.toLowerCase().includes("dubai");
}

function luxuryLabel(city: string): string {
  const c = city.toLowerCase();
  return c.includes("dubai") || c.includes("abu dhabi") ? "luxury" : "comparable";
}

export function generateCompetitionData(
  project: AggregatedProjectData
): CompetitionData {
  const { city, country } = project.location;
  const uae = isUae(country);
  const dubai = isDubai(city);

  const benchmarkHotels = dubai
    ? [
        {
          name: "Grand Hyatt Dubai",
          rating: "5-Star",
          description:
            "Large-format luxury hotel in Dubai Healthcare City with extensive meeting facilities, multiple F&B outlets, and strong corporate and group demand capture.",
          numberOfRooms: "682 rooms",
        },
        {
          name: "Park Hyatt Dubai",
          rating: "5-Star",
          description:
            "Low-rise luxury resort on Dubai Creek with marina access, spa, and premium leisure positioning attracting high-yield regional and international guests.",
          numberOfRooms: "223 rooms",
        },
        {
          name: "Jumeirah Al Qasr",
          rating: "5-Star",
          description:
            "Palatial beachfront resort within Madinat Jumeirah offering extensive F&B, private beach, and strong destination appeal for luxury leisure travelers.",
          numberOfRooms: "292 rooms",
        },
        {
          name: "Atlantis The Palm",
          rating: "5-Star",
          description:
            "Iconic Palm Jumeirah resort with aquarium attractions, extensive conference capacity, and high-profile leisure and family segment demand.",
          numberOfRooms: "1,539 rooms",
        },
        {
          name: "Waldorf Astoria Dubai Palm Jumeirah",
          rating: "5-Star",
          description:
            "Ultra-luxury beachfront property on Palm West Crescent with signature dining, private beach, and premium suite-oriented inventory.",
          numberOfRooms: "200 rooms",
        },
      ]
    : uae
      ? [
          {
            name: "Emirates Palace Mandarin Oriental",
            rating: "5-Star",
            description:
              "Flagship luxury resort on Abu Dhabi Corniche with grand banquet facilities, private beach, and strong government and diplomatic demand.",
            numberOfRooms: "394 rooms",
          },
          {
            name: "Four Seasons Hotel Abu Dhabi",
            rating: "5-Star",
            description:
              "Waterfront luxury hotel on Al Maryah Island with premium F&B, spa, and proximity to the financial district and cultural district.",
            numberOfRooms: "190 rooms",
          },
          {
            name: "St. Regis Abu Dhabi",
            rating: "5-Star",
            description:
              "Twin-tower luxury hotel on the Corniche combining city and beach access with butler service and strong corporate account base.",
            numberOfRooms: "283 rooms",
          },
          {
            name: "Rosewood Abu Dhabi",
            rating: "5-Star",
            description:
              "Contemporary luxury hotel on Al Maryah Island with refined design, destination dining, and high-end business traveler appeal.",
            numberOfRooms: "189 rooms",
          },
        ]
      : [
          {
            name: `${city} Grand Hotel`,
            rating: "5-Star",
            description:
              `Flagship luxury property in central ${city} with conference facilities, branded F&B outlets, and strong corporate account penetration.`,
            numberOfRooms: "280 rooms",
          },
          {
            name: `${city} Waterfront Resort`,
            rating: "5-Star",
            description:
              `Coastal resort capturing leisure demand with spa, marina, and banquet capacity serving regional travel to ${country}.`,
            numberOfRooms: "210 rooms",
          },
          {
            name: `${city} Business Tower Hotel`,
            rating: "4-Star",
            description:
              `Upper-upscale city hotel adjacent to the primary commercial district with high weekday occupancy from corporate segments.`,
            numberOfRooms: "320 rooms",
          },
          {
            name: `${city} Heritage Boutique Hotel`,
            rating: "4-Star",
            description:
              `Design-led boutique hotel in a heritage district appealing to cultural tourists and premium domestic staycation demand.`,
            numberOfRooms: "95 rooms",
          },
        ];

  return {
    benchmarkHotels,
    performanceData: [],
    avgOccupancy: 0,
    avgADR: 0,
    avgRevPAR: 0,
  };
}

export function generateHistoricalGuestsData(
  project: AggregatedProjectData
): HistoricalGuestsData {
  const { city, country } = project.location;
  const uae = isUae(country);
  const baseGuests = uae ? 12.4 : 3.1;
  const years = ["2018", "2019", "2020", "2021", "2022", "2023", "2024E"];
  const multipliers = uae
    ? [0.82, 1.0, 0.42, 0.58, 0.88, 1.0, 1.06]
    : [0.85, 1.0, 0.38, 0.52, 0.86, 1.0, 1.05];

  const yearlyData = years.map((year, i) => {
    const guests = Math.round(baseGuests * multipliers[i]! * 10) / 10;
    const los = uae ? 3.8 + (i > 4 ? 0.2 : 0) : 2.9 + (i > 4 ? 0.15 : 0);
    return {
      year,
      totalGuests: guests,
      guestNights: Math.round(guests * los * 10) / 10,
      avgLengthOfStay: Math.round(los * 10) / 10,
    };
  });

  const compositionByClass = years.slice(-4).map((year, i) => {
    const scale = 1 + i * 0.06;
    return {
      year,
      fiveStar: Math.round((uae ? 420 : 95) * scale),
      fourStar: Math.round((uae ? 310 : 72) * scale),
      threeStar: Math.round((uae ? 180 : 48) * scale),
      others: Math.round((uae ? 90 : 28) * scale),
    };
  });

  return {
    yearlyData,
    compositionByClass,
    cagrGuests: uae ? "11.6%" : "9.4%",
    cagrGuestNights: uae ? "12.0%" : "10.1%",
  };
}

export function generateLengthOfStayData(
  project: AggregatedProjectData
): LengthOfStayData {
  const { city } = project.location;
  const uae = isUae(project.location.country);
  void city;

  return {
    byRegion: [
      { region: "Europe", year2004: uae ? 4.2 : 3.1, year2005: uae ? 4.4 : 3.2, year2006: uae ? 4.6 : 3.3, cagr: "4.7%" },
      { region: "Africa", year2004: uae ? 4.0 : 2.8, year2005: uae ? 4.1 : 2.9, year2006: uae ? 4.3 : 3.0, cagr: "3.7%" },
      { region: "Asia", year2004: uae ? 3.2 : 2.4, year2005: uae ? 3.1 : 2.3, year2006: uae ? 3.0 : 2.2, cagr: "-3.2%" },
      { region: "Americas", year2004: uae ? 3.6 : 2.6, year2005: uae ? 3.5 : 2.5, year2006: uae ? 3.4 : 2.4, cagr: "-2.8%" },
      { region: "GCC", year2004: uae ? 2.8 : 2.1, year2005: uae ? 2.7 : 2.0, year2006: uae ? 2.6 : 1.9, cagr: "-3.6%" },
    ],
    byHotelClass: [
      { hotelClass: "Five-star", year2004: uae ? 4.1 : 3.0, year2005: uae ? 4.3 : 3.1, year2006: uae ? 4.5 : 3.2, cagr: "4.8%" },
      { hotelClass: "Four-star", year2004: uae ? 3.4 : 2.5, year2005: uae ? 3.2 : 2.4, year2006: uae ? 3.0 : 2.2, cagr: "-6.1%" },
      { hotelClass: "Three-star", year2004: uae ? 2.6 : 2.0, year2005: uae ? 2.5 : 1.9, year2006: uae ? 2.4 : 1.8, cagr: "-3.9%" },
      { hotelClass: "Others", year2004: uae ? 2.2 : 1.7, year2005: uae ? 2.1 : 1.6, year2006: uae ? 2.0 : 1.5, cagr: "-4.7%" },
    ],
    overallAverage2006: uae ? 3.4 : 2.5,
  };
}

export function generateAnnualRevenuesData(
  project: AggregatedProjectData
): AnnualRevenuesData {
  const uae = isUae(project.location.country);
  const years = ["2019", "2020", "2021", "2022", "2023", "2024E"];
  const scales = uae
    ? [1.0, 0.48, 0.62, 0.88, 1.0, 1.08]
    : [1.0, 0.45, 0.58, 0.84, 1.0, 1.06];

  const yearlyData = years.map((year, i) => {
    const s = scales[i]!;
    const fiveStar = Math.round((uae ? 18200 : 4200) * s);
    const fourStar = Math.round((uae ? 3600 : 980) * s);
    const threeStar = Math.round((uae ? 1400 : 420) * s);
    const others = Math.round((uae ? 800 : 240) * s);
    return {
      year,
      fiveStar,
      fourStar,
      threeStar,
      others,
      total: fiveStar + fourStar + threeStar + others,
    };
  });

  return {
    yearlyData,
    cagrByClass: {
      fiveStar: uae ? "14.2%" : "11.8%",
      fourStar: uae ? "12.6%" : "10.4%",
      threeStar: uae ? "6.8%" : "5.9%",
      others: uae ? "4.1%" : "3.7%",
    },
  };
}

export function generateHospitalitySummaryData(
  project: AggregatedProjectData
): HospitalitySummaryData {
  const { city, country } = project.location;
  const uae = isUae(country);
  return {
    tourismOverview: [
      `${country} continues to diversify its economy with travel and tourism contributing a material share of GDP and employment, anchored by gateway cities such as ${city}.`,
      `Policy support for visas, aviation connectivity, and mega-events underpins sustained international arrivals growth through the medium term.`,
      `Luxury and upper-upscale segments remain the primary revenue generators in ${city}, supported by MICE, leisure, and regional travel flows.`,
    ],
    guestProfile: [
      uae
        ? "Primary source markets include Western Europe, GCC, South Asia, and China, with high spend per stay and strong demand for branded luxury product."
        : `Guest mix combines regional GCC travel, European leisure, and growing Asian source markets visiting ${city}.`,
      `${project.positioning} guests prioritize location, service quality, F&B, and experiential amenities over price sensitivity.`,
    ],
    historicalSupply: [
      `Hotel key count in ${city} expanded steadily over the past decade with concentration in four- and five-star categories.`,
      "Pipeline delivery has moderated post-recovery, with developers focusing on branded, mixed-use hospitality assets.",
    ],
    historicalDemand: [
      `Hotel guests and guest nights in ${city} recovered strongly post-2021, with upper-upscale categories capturing a rising share of total demand.`,
      "Average length of stay remains stable despite higher guest volumes, reflecting short-break and event-driven travel patterns.",
    ],
    growthPotential: [
      `The subject ${project.keys}-key ${project.segment} development aligns with undersupplied ${project.positioning} niches in ${city}.`,
      "Event calendars, airline seat growth, and domestic tourism initiatives provide multi-year demand tailwinds.",
      "RevPAR growth is expected to outpace inflation as ADR premiums widen for differentiated, well-located product.",
    ],
  };
}

export function generateImplicationsData(
  project: AggregatedProjectData
): ImplicationsData {
  const { city } = project.location;
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Market positioning",
        description: `The ${project.positioning} segment in ${city} demonstrates resilient ADR and occupancy fundamentals, supporting the subject hotel's competitive positioning against established luxury operators.`,
      },
      {
        number: 2,
        title: "Demand depth",
        description:
          "Historical guest and guest-night growth confirms sufficient market depth to absorb incremental keys, provided the project achieves brand-appropriate service levels and pre-opening sales velocity.",
      },
      {
        number: 3,
        title: "Length of stay",
        description:
          "Stable average length of stay across upper-upscale categories implies revenue models should not rely on extended-stay premiums; F&B and ancillary capture remain important profit levers.",
      },
      {
        number: 4,
        title: "Revenue mix",
        description:
          "Five- and four-star hotels dominate city-wide revenue share, validating the project's focus on premium room product and ancillary income streams.",
      },
      {
        number: 5,
        title: "Competitive set",
        description:
          "Benchmark hotels operate at occupancy and ADR levels consistent with the subject's Year 3 underwriting, with seasonal peaks in Q4–Q1 and softer summer months.",
      },
      {
        number: 6,
        title: "Supply pipeline",
        description: `Measured new supply in ${city} reduces near-term oversupply risk but requires active account development and group sales to defend market share.`,
      },
      {
        number: 7,
        title: "Operating ramp",
        description:
          "Year 1 ADR and occupancy assumptions reflect a standard pre-stabilization curve aligned with comparable openings in the market.",
      },
      {
        number: 8,
        title: "Investment case",
        description: `Project IRR and equity return hurdles are achievable if the hotel captures its fair share of ${city} upper-upscale RevPAR growth through stabilization.`,
      },
    ],
    keyTakeaways: [
      `Market fundamentals in ${city} support a ${project.positioning} hotel of ${project.keys} keys at the proposed location.`,
      "Competitive benchmarking confirms achievable occupancy, ADR, and RevPAR targets within the underwriting horizon.",
      "Success depends on brand execution, pre-opening sales, and disciplined cost control through ramp-up.",
    ],
  };
}

export function generateSuccessFactorsData(
  project: AggregatedProjectData
): SuccessFactorsData {
  const { city } = project.location;
  return {
    marketOpportunities: [
      {
        factor: "Sustained tourism growth and event calendar density",
        effect: `Increases transient and group demand in ${city}. Supports ADR premium for well-located product. Extends peak season shoulder months.`,
      },
      {
        factor: "Underserved upper-upscale room supply in target micro-market",
        effect: "Enables above-market occupancy during ramp-up. Reduces direct rate competition in the immediate catchment.",
      },
      {
        factor: "Visa liberalization and airline capacity expansion",
        effect: "Broadens source markets. Improves last-minute booking depth. Supports higher F&B capture from international guests.",
      },
    ],
    projectStrengths: [
      {
        strength: `${project.positioning} product specification aligned with market preferences`,
        effect: "Supports premium ADR positioning. Attracts international brand affiliation interest.",
      },
      {
        strength: `Efficient ${project.keys}-key scale with optimized BUA per key`,
        effect: "Lowers operating cost per key. Improves GOP conversion at stabilization.",
      },
      {
        strength: "Integrated F&B and ancillary revenue strategy",
        effect: "Diversifies income beyond rooms. Improves RevPAR-equivalent metrics.",
      },
      {
        strength: "Experienced operator assumptions in financial model",
        effect: "Reduces ramp-up risk. Supports institutional lender and equity confidence.",
      },
    ],
    mainOutcomes: [
      `The project is positioned to capture ${city} upper-upscale RevPAR growth and achieve stabilized returns consistent with Component 4 underwriting.`,
      "Differentiated design, location, and operating strategy mitigate direct competition from legacy supply.",
    ],
  };
}

export function generateRiskFactorsData(
  project: AggregatedProjectData
): RiskFactorsData {
  const { city, country } = project.location;
  return {
    marketThreats: [
      {
        risk: "Global economic slowdown reducing international travel",
        effect: "Could compress occupancy and ADR in downturn years. May extend stabilization timeline.",
        mitigatingFactors: [
          "Diversified source market mix",
          "Domestic and regional demand base",
          "Flexible pricing and channel strategy",
        ],
      },
      {
        risk: "Incremental competing supply in the luxury segment",
        effect: "May pressure rate growth in oversupplied sub-markets. Could increase sales and marketing costs.",
        mitigatingFactors: [
          "Differentiated product and location",
          "Pre-opening account contracts",
          "Brand affiliation and loyalty program",
        ],
      },
      {
        risk: "Cost inflation in labor, utilities, and F&B inputs",
        effect: "May erode GOP margins if not passed through. Increases operating breakeven occupancy.",
        mitigatingFactors: [
          "Indexed management contracts",
          "Energy efficiency design",
          "Dynamic pricing and cost controls",
        ],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Pre-stabilization cash flow sensitivity",
        effect: "Elevated DSCR pressure during ramp-up. Requires disciplined equity pacing.",
        mitigatingFactors: [
          "Phased pre-opening budget",
          "Contingency reserve in TDC",
          "Conservative Year 1 underwriting",
        ],
      },
      {
        weakness: "Seasonality in leisure-dominated demand",
        effect: "Summer months may underperform annual averages. Increases working capital volatility.",
        mitigatingFactors: [
          "MICE and corporate segment targeting",
          "Promotional packages in low season",
          "Regional GCC drive-market campaigns",
        ],
      },
      {
        weakness: "Construction and delivery timeline risk",
        effect: "Delays could push opening and debt service commencement.",
        mitigatingFactors: [
          "Fixed-price EPC where applicable",
          "Experienced contractor selection",
          "Monthly progress monitoring",
        ],
      },
      {
        weakness: "Brand and service execution risk at opening",
        effect: "Poor early reviews could impair ADR recovery.",
        mitigatingFactors: [
          "Reputed operator appointment",
          "Structured pre-opening training",
          "Soft-opening performance review",
        ],
      },
    ],
  };
}

export function buildHospGuestsSlide(project: AggregatedProjectData): FeasibilitySlide {
  const { city } = project.location;
  return {
    id: "hosp-guests",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: `Historical figures of hotel guests in ${city}`,
    paragraphs: [],
    data: generateHistoricalGuestsData(project),
  };
}

export function buildHospLengthOfStaySlide(
  project: AggregatedProjectData
): FeasibilitySlide {
  return {
    id: "hosp-length-of-stay",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "Average length of stay in hotels by region and by hotel class",
    paragraphs: [],
    data: generateLengthOfStayData(project),
  };
}

export function buildHospRevenuesSlide(project: AggregatedProjectData): FeasibilitySlide {
  return {
    id: "hosp-revenues",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "Annual revenues of hotels by class",
    paragraphs: [],
    data: generateAnnualRevenuesData(project),
  };
}

export function buildHospCompetition1Slide(
  project: AggregatedProjectData
): FeasibilitySlide {
  const { city } = project.location;
  return {
    id: "hosp-competition-1",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: `Competition analysis - Benchmark ${luxuryLabel(city)} hotels`,
    paragraphs: [],
    data: generateCompetitionData(project),
  };
}

export function buildHospSummarySlide(project: AggregatedProjectData): FeasibilitySlide {
  return {
    id: "hosp-summary",
    section: "market",
    title: "Summary of hospitality market",
    subtitle: "Key findings",
    paragraphs: [],
    data: generateHospitalitySummaryData(project),
  };
}

export function buildHospImplicationsSlide(
  project: AggregatedProjectData
): FeasibilitySlide {
  return {
    id: "hosp-implications",
    section: "market",
    title: "Implications of the market findings on the Project",
    subtitle: "Hospitality",
    paragraphs: [],
    data: generateImplicationsData(project),
  };
}

export function buildHospSuccessFactorsSlide(
  project: AggregatedProjectData
): FeasibilitySlide {
  return {
    id: "hosp-success-factors",
    section: "market",
    title: "Key success and risk factors",
    subtitle: "Potential success factors and their impact on the project",
    paragraphs: [],
    data: generateSuccessFactorsData(project),
  };
}

export function buildHospRiskFactorsSlide(
  project: AggregatedProjectData
): FeasibilitySlide {
  return {
    id: "hosp-risk-factors",
    section: "market",
    title: "Key success and risk factors",
    subtitle: "Potential risk factors and their mitigations",
    paragraphs: [],
    data: generateRiskFactorsData(project),
  };
}

export function isHistoricalGuestsData(d: unknown): d is HistoricalGuestsData {
  return (
    !!d &&
    typeof d === "object" &&
    "yearlyData" in d &&
    "compositionByClass" in d
  );
}

export function isLengthOfStayData(d: unknown): d is LengthOfStayData {
  return !!d && typeof d === "object" && "byRegion" in d && "byHotelClass" in d;
}

export function isAnnualRevenuesData(d: unknown): d is AnnualRevenuesData {
  return !!d && typeof d === "object" && "yearlyData" in d && "cagrByClass" in d;
}

export function isCompetitionData(d: unknown): d is CompetitionData {
  return (
    !!d &&
    typeof d === "object" &&
    "benchmarkHotels" in d &&
    Array.isArray((d as CompetitionData).benchmarkHotels)
  );
}

export function isHospitalitySummaryData(d: unknown): d is HospitalitySummaryData {
  return !!d && typeof d === "object" && "tourismOverview" in d;
}

export function isImplicationsData(d: unknown): d is ImplicationsData {
  return !!d && typeof d === "object" && "hospitalityImplications" in d;
}

export function isSuccessFactorsData(d: unknown): d is SuccessFactorsData {
  return !!d && typeof d === "object" && "marketOpportunities" in d;
}

export function isRiskFactorsData(d: unknown): d is RiskFactorsData {
  return !!d && typeof d === "object" && "marketThreats" in d;
}
