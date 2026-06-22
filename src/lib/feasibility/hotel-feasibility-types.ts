/** Payload sent from the client to `/api/feasibility/generate-hotel`. */
export type HotelFeasibilityProjectData = {
  location: string;
  city: string;
  country: string;
  currency: string;
  assetType: string;
  starRating: string;
  hotelOperatingType: string;
  rooms: number;
  totalBUA: number;
  constructionMonths: number;
  tdc: number;
  gdv: number;
  projectIRR: number;
  equityIRR: number;
  equityMultiple: number;
  paybackYears: number;
  netProfitMargin: number;
  stabilizedAdr: number;
  stabilizedOccupancyPct: number;
  year1Adr: number;
  year3Adr: number;
  year1OccupancyPct: number;
  year3OccupancyPct: number;
  revenueByYear: number[];
  ebitdaByYear: number[];
  netIncomeByYear: number[];
};

export type GenerateHotelFeasibilityRequest = {
  projectData: HotelFeasibilityProjectData;
  location: string;
  assetType: string;
};

export type GenerateHotelFeasibilityResponse = {
  slides: unknown[];
  marketResearch?: Record<string, unknown>;
};
