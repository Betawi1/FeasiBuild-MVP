import type {
  CashInflows,
  CashOutflows,
  EquityReturns,
  FinModelStreamKey,
  Financing,
  ProjectInfo,
  ProjectIRR,
  ScenarioAnalysis,
} from "@/store/useFinModelStore";
import type { FinancingMetrics } from "@/store/financingStore";
import type {
  OperationalHotelHoldSnapshot,
  OperationalOfficeHoldSnapshot,
  OperationalResidentialHoldSnapshot,
  OperationalRetailHoldSnapshot,
} from "@/lib/operational-pnl";
import type { ScenarioState } from "@/types/scenario";

export const PROJECT_SAVE_VERSION = "1.0.0";

export interface AICommentary {
  executiveSummary: string;
  component1Analysis: string;
  component2Analysis: string;
  component4Analysis: string;
  component6Analysis: string;
}

export interface ProjectSaveMetadata {
  version: string;
  lastModified: string;
}

export interface CollectedProjectState {
  stream: FinModelStreamKey;
  assetType: FinModelStreamKey | null;
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  cashInflows: CashInflows;
  financing: Financing;
  projectIRR: ProjectIRR;
  equityReturns: EquityReturns;
  scenarioAnalysis: ScenarioAnalysis;
  scenarioShocks: Record<string, number>;
  financingMetrics?: FinancingMetrics | null;
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot;
  retailHoldSnapshot?: OperationalRetailHoldSnapshot;
  officeHoldSnapshot?: OperationalOfficeHoldSnapshot;
  residentialHoldSnapshot?: OperationalResidentialHoldSnapshot;
  scenarioStore?: ScenarioState;
}

export interface ProjectSaveData {
  projectId: string;
  userId?: string;
  savedAt: string;
  projectName: string;
  description?: string;
  tags?: string[];
  stream: FinModelStreamKey;
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  cashInflows: CashInflows;
  financing: Financing;
  projectIRR: ProjectIRR;
  aiCommentary: AICommentary;
  collectedState?: CollectedProjectState;
  metadata: ProjectSaveMetadata;
}

export interface SavedProject extends ProjectSaveData {
  /** KV storage key (`feasibuild_project_{projectId}`). */
  storageKey: string;
}

export interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: {
    projectName: string;
    description: string;
    tags: string[];
  }) => Promise<void>;
  isSaving: boolean;
  defaultProjectName?: string;
}

export interface SaveProjectResult {
  projectId: string;
  storageKey: string;
}

export type ProjectDashboardType = "Sale" | "Operational";

export type ProjectDashboardStatus = "Draft" | "In Progress" | "Completed";

export interface ProjectIndexEntry {
  projectId: string;
  projectName: string;
  projectType: ProjectDashboardType;
  status: ProjectDashboardStatus;
  lastModified: string;
  location: string;
}
