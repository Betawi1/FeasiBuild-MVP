import type { FeasibilitySlideData } from "@/types/feasibility";

export interface SlideEditingProps {
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
  onDataChange?: (data: FeasibilitySlideData) => void;
}
