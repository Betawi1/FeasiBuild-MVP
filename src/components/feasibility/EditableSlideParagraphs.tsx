"use client";

import EditableTextBlock from "./EditableTextBlock";

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
  if (paragraphs.length === 0 && !isEditing) return null;

  const items = paragraphs.length > 0 ? paragraphs : [""];

  return (
    <div className={className}>
      {items.map((p, i) => (
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
