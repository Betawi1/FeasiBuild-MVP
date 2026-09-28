"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import InlineAutoGrow from "@/components/feasibility/InlineAutoGrow";
import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader, {
  SlidePaginationProvider,
} from "@/components/feasibility/SlideHeader";
import { SlideWatermarkProvider } from "@/components/feasibility/SlideWatermark";
import {
  SLIDE_COMMENTARY_BULLET_ITEM_CLASS,
  SLIDE_COMMENTARY_BULLET_LIST_CLASS,
  SLIDE_COMMENTARY_PARAGRAPH_CLASS,
  SLIDE_COMMENTARY_PLACEHOLDER_CLASS,
} from "@/components/feasibility/slide-typography";
import { getCustomerTier } from "@/lib/entitlements";
import {
  CUSTOM_PAGE_DELETE_CONFIRM,
  CUSTOM_PAGE_EMPTY_TITLE,
  CUSTOM_PAGE_PLACEHOLDER,
} from "@/lib/feasibility/custom-slides";
import { shouldWatermark } from "@/lib/report-entitlements";
import type { CustomSlide, CustomSlideBlock } from "@/types/feasibility";

interface Props {
  slide: CustomSlide;
  isEditing?: boolean;
  slideIndex: number;
  slideCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (slide: CustomSlide) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function paragraphValue(block: CustomSlideBlock): string {
  return typeof block.text === "string" ? block.text : block.text.join("\n");
}

function bulletValue(block: CustomSlideBlock): string {
  return Array.isArray(block.text) ? block.text.join("\n") : block.text;
}

function bulletLines(block: CustomSlideBlock): string[] {
  const raw = Array.isArray(block.text) ? block.text : block.text.split("\n");
  return raw.map((line) => line.trim()).filter((line) => line.length > 0);
}

export default function CustomSlideView({
  slide,
  isEditing = false,
  slideIndex,
  slideCount,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDelete,
}: Props) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const sub = (
    user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined
  )?.subscription;
  const watermark = shouldWatermark(getCustomerTier(email, sub));
  const pageNumber = slideIndex > 0 ? slideIndex : null;
  const totalNumbered = Math.max(0, slideCount - 1);
  const remeasureKey = [
    slide.title,
    slide.subtitle,
    ...slide.blocks.map((block) =>
      `${block.id}:${block.type}:${paragraphValue(block)}`
    ),
  ].join("\n");

  const patchBlock = (id: string, text: string | string[]) => {
    onChange({
      ...slide,
      blocks: slide.blocks.map((block) =>
        block.id === id ? { ...block, text } : block
      ),
    });
  };

  const addBlock = (type: CustomSlideBlock["type"]) => {
    onChange({
      ...slide,
      blocks: [
        ...slide.blocks,
        {
          id: newBlockId(),
          type,
          text: type === "bullets" ? [] : "",
        },
      ],
    });
  };

  const remove = () => {
    if (!window.confirm(CUSTOM_PAGE_DELETE_CONFIRM)) return;
    onDelete();
  };

  return (
    <SlidePaginationProvider pageNumber={pageNumber} totalNumbered={totalNumbered}>
      <SlideWatermarkProvider enabled={watermark}>
        <SlideContainer
          remeasureKey={remeasureKey}
          chrome={
            isEditing ? (
              <div
                data-pdf-hide
                data-custom-slide-toolbar
                className="absolute right-3 top-3 z-30 flex gap-1"
              >
                <button
                  type="button"
                  disabled={!canMoveUp}
                  onClick={() => onMove("up")}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600 disabled:opacity-40"
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={!canMoveDown}
                  onClick={() => onMove("down")}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600 disabled:opacity-40"
                >
                  Move down
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-600"
                >
                  Delete
                </button>
              </div>
            ) : null
          }
        >
          <div data-custom-slide="">
            <SlideHeader
              title={slide.title}
              subtitle={slide.subtitle}
              emptyTitleFallback={CUSTOM_PAGE_EMPTY_TITLE}
              onTitleChange={
                isEditing
                  ? (title) => onChange({ ...slide, title })
                  : undefined
              }
              onSubtitleChange={
                isEditing
                  ? (subtitle) => onChange({ ...slide, subtitle })
                  : undefined
              }
            />
            <div className="space-y-3">
              {slide.blocks.map((block) => (
                <CustomBlock
                  key={block.id}
                  block={block}
                  isEditing={isEditing}
                  onChange={(text) => patchBlock(block.id, text)}
                />
              ))}
            </div>
            {isEditing ? (
              <div data-pdf-hide className="mt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => addBlock("paragraph")}
                  className="text-sm text-slate-500"
                >
                  + paragraph
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("bullets")}
                  className="text-sm text-slate-500"
                >
                  + bullets
                </button>
              </div>
            ) : null}
          </div>
        </SlideContainer>
      </SlideWatermarkProvider>
    </SlidePaginationProvider>
  );
}

function CustomBlock({
  block,
  isEditing,
  onChange,
}: {
  block: CustomSlideBlock;
  isEditing: boolean;
  onChange: (text: string | string[]) => void;
}) {
  const [focused, setFocused] = useState(false);

  if (block.type === "bullets") {
    const lines = bulletLines(block);
    const editing = isEditing && focused;
    if (!isEditing && lines.length === 0) return null;
    if (editing) {
      return (
        <InlineAutoGrow
          value={bulletValue(block)}
          onChange={(value) => onChange(value.split("\n"))}
          onBlur={() => setFocused(false)}
          className={SLIDE_COMMENTARY_BULLET_ITEM_CLASS}
          placeholder={CUSTOM_PAGE_PLACEHOLDER}
        />
      );
    }
    if (lines.length === 0) {
      return (
        <p
          data-pdf-hide
          className={SLIDE_COMMENTARY_PLACEHOLDER_CLASS}
          onClick={() => setFocused(true)}
        >
          {CUSTOM_PAGE_PLACEHOLDER}
        </p>
      );
    }
    return (
      <ul
        className={SLIDE_COMMENTARY_BULLET_LIST_CLASS}
        onClick={isEditing ? () => setFocused(true) : undefined}
      >
        {lines.map((line, index) => (
          <li key={`${block.id}-${index}`} className={SLIDE_COMMENTARY_BULLET_ITEM_CLASS}>
            {line}
          </li>
        ))}
      </ul>
    );
  }

  const text = paragraphValue(block);
  const empty = text.trim().length === 0;
  if (!isEditing && empty) return null;
  if (isEditing && focused) {
    return (
      <InlineAutoGrow
        value={text}
        onChange={onChange}
        onBlur={() => setFocused(false)}
        className={SLIDE_COMMENTARY_PARAGRAPH_CLASS}
        placeholder={CUSTOM_PAGE_PLACEHOLDER}
      />
    );
  }
  if (empty) {
    return (
      <p
        data-pdf-hide
        className={SLIDE_COMMENTARY_PLACEHOLDER_CLASS}
        onClick={() => setFocused(true)}
      >
        {CUSTOM_PAGE_PLACEHOLDER}
      </p>
    );
  }
  return (
    <p
      className={`${SLIDE_COMMENTARY_PARAGRAPH_CLASS} whitespace-pre-wrap`}
      onClick={isEditing ? () => setFocused(true) : undefined}
    >
      {text}
    </p>
  );
}
