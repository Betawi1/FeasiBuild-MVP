"use client";

import EditableTextBlock from "./EditableTextBlock";
import {
  isSourceAttributionLine,
  stripSourceAttributionLines,
} from "@/lib/feasibility/clean-ai-content";

interface EditableSlideParagraphsProps {
  paragraphs: string[];
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
  className?: string;
  itemClassName?: string;
}

export default function EditableSlideParagraphs({
  paragraphs,
  isEditing = false,
  onParagraphChange,
  className = "space-y-3",
  itemClassName = "text-sm text-slate-700 leading-relaxed",
}: EditableSlideParagraphsProps) {
  const visible = isEditing
    ? paragraphs.length > 0
      ? paragraphs
      : [""]
    : paragraphs
        .map((p) => stripSourceAttributionLines(p))
        .filter((p) => p.trim().length > 0 && !isSourceAttributionLine(p));

  if (visible.length === 0 && !isEditing) return null;

  return (
    <div className={className}>
      {visible.map((p, i) => (
        <EditableTextBlock
          key={i}
          text={p}
          isEditing={isEditing}
          onChange={(text) => onParagraphChange?.(i, text)}
          className={itemClassName}
        />
      ))}
    </div>
  );
}
