import type {
  CustomSlide,
  CustomSlideBlock,
  FeasibilitySlide,
} from "@/types/feasibility";

export const CUSTOM_PAGE_LIMIT = 15;

export const CUSTOM_PAGE_PLACEHOLDER =
  "Click to write your own content for this page…";

export const CUSTOM_PAGE_EMPTY_TITLE = "Additional Notes";

export const CUSTOM_PAGE_LIMIT_TOAST = "Custom page limit reached (15)";

export const CUSTOM_PAGE_ANCHOR_TOAST =
  "Your custom page moved to the end because its anchor slide no longer exists.";

export const CUSTOM_PAGE_DELETE_CONFIRM =
  "Your typed content on this page will be removed";

export const CUSTOM_PAGES_REGENERATE_NOTE =
  "Custom pages you added are kept through regeneration, and across sessions once you save with Update Project.";

export interface DeckEntry {
  kind: "generated" | "custom";
  id: string;
  generated?: FeasibilitySlide;
  custom?: CustomSlide;
}

export interface DeckMutation {
  customSlides: CustomSlide[];
  index: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyCustomSlide(
  insertAfter: string | "end"
): CustomSlide {
  return {
    id: newId(),
    insertAfter,
    title: "",
    subtitle: "",
    blocks: [{ id: newId(), type: "paragraph", text: "" }],
  };
}

export function customSlideDisplayTitle(title: string): string {
  return title.trim() ? title : CUSTOM_PAGE_EMPTY_TITLE;
}

function coerceBlock(value: unknown): CustomSlideBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<CustomSlideBlock>;
  if (typeof block.id !== "string" || !block.id) return null;
  if (block.type === "paragraph") {
    const text = Array.isArray(block.text)
      ? block.text.join("\n")
      : typeof block.text === "string"
        ? block.text
        : "";
    return { id: block.id, type: "paragraph", text };
  }
  if (block.type === "bullets") {
    const text = Array.isArray(block.text)
      ? block.text.filter((line): line is string => typeof line === "string")
      : typeof block.text === "string"
        ? block.text.split("\n")
        : [];
    return { id: block.id, type: "bullets", text };
  }
  return null;
}

/** Legacy projects and corrupt payloads open as an empty list. */
export function normalizeCustomSlides(raw: unknown): CustomSlide[] {
  if (!Array.isArray(raw)) return [];
  const slides: CustomSlide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const slide = item as Partial<CustomSlide>;
    if (typeof slide.id !== "string" || !slide.id) continue;
    const insertAfter =
      slide.insertAfter === "end" || typeof slide.insertAfter === "string"
        ? slide.insertAfter
        : "end";
    const blocks = Array.isArray(slide.blocks)
      ? slide.blocks.flatMap((block) => {
          const coerced = coerceBlock(block);
          return coerced ? [coerced] : [];
        })
      : [];
    slides.push({
      id: slide.id,
      insertAfter,
      title: typeof slide.title === "string" ? slide.title : "",
      subtitle: typeof slide.subtitle === "string" ? slide.subtitle : "",
      blocks:
        blocks.length > 0
          ? blocks
          : [{ id: newId(), type: "paragraph", text: "" }],
    });
  }
  return slides;
}

export function mergeDeck(
  generated: FeasibilitySlide[],
  customSlides: CustomSlide[]
): { entries: DeckEntry[]; orphanIds: string[] } {
  const known = new Set(generated.map((slide) => slide.id));
  const grouped = new Map<string, CustomSlide[]>();
  const tail: CustomSlide[] = [];
  const orphanIds: string[] = [];

  for (const slide of customSlides) {
    if (slide.insertAfter !== "end" && known.has(slide.insertAfter)) {
      const bucket = grouped.get(slide.insertAfter) ?? [];
      bucket.push(slide);
      grouped.set(slide.insertAfter, bucket);
    } else {
      if (slide.insertAfter !== "end") orphanIds.push(slide.id);
      tail.push(slide);
    }
  }

  const entries: DeckEntry[] = [];
  for (const slide of generated) {
    entries.push({ kind: "generated", id: slide.id, generated: slide });
    for (const custom of grouped.get(slide.id) ?? []) {
      entries.push({ kind: "custom", id: custom.id, custom });
    }
  }
  for (const custom of tail) {
    entries.push({ kind: "custom", id: custom.id, custom });
  }
  return { entries, orphanIds };
}

/** Rewrite anchors from visual order. Pages after the last AI slide use 'end'. */
export function reanchorCustomSlides(entries: DeckEntry[]): CustomSlide[] {
  let preceding: string | null = null;
  const slides: CustomSlide[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.kind === "generated") {
      preceding = entry.id;
      continue;
    }
    if (!entry.custom) continue;
    const generatedAfter = entries
      .slice(i + 1)
      .some((candidate) => candidate.kind === "generated");
    const insertAfter: string | "end" =
      preceding && generatedAfter ? preceding : "end";
    slides.push({ ...entry.custom, insertAfter });
  }
  return slides;
}

function titleIndex(entries: DeckEntry[]): number {
  return entries.findIndex(
    (entry) =>
      entry.kind === "generated" &&
      (entry.generated?.section === "title" || entry.id === "title-slide")
  );
}

export function insertCustomPageAfter(
  generated: FeasibilitySlide[],
  customSlides: CustomSlide[],
  index: number
): DeckMutation {
  const { entries } = mergeDeck(generated, customSlides);
  const safeIndex =
    entries.length === 0 ? -1 : Math.max(0, Math.min(index, entries.length - 1));
  const created = createEmptyCustomSlide("end");
  const next = entries.slice();
  const at = safeIndex + 1;
  next.splice(at, 0, { kind: "custom", id: created.id, custom: created });
  return { customSlides: reanchorCustomSlides(next), index: at };
}

export function appendCustomPage(
  generated: FeasibilitySlide[],
  customSlides: CustomSlide[]
): DeckMutation {
  const { entries } = mergeDeck(generated, customSlides);
  const created = createEmptyCustomSlide("end");
  const next = entries.concat({
    kind: "custom",
    id: created.id,
    custom: created,
  });
  return { customSlides: reanchorCustomSlides(next), index: next.length - 1 };
}

export function moveCustomPage(
  generated: FeasibilitySlide[],
  customSlides: CustomSlide[],
  id: string,
  direction: "up" | "down"
): DeckMutation | null {
  const { entries } = mergeDeck(generated, customSlides);
  const index = entries.findIndex(
    (entry) => entry.kind === "custom" && entry.id === id
  );
  if (index < 0) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= entries.length) return null;
  const titleAt = titleIndex(entries);
  if (direction === "up" && titleAt >= 0 && target <= titleAt) return null;
  const next = entries.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return {
    customSlides: reanchorCustomSlides(next),
    index: next.findIndex((entry) => entry.id === id),
  };
}

export function deleteCustomPage(
  generated: FeasibilitySlide[],
  customSlides: CustomSlide[],
  id: string,
  currentIndex: number
): DeckMutation {
  const filtered = customSlides.filter((slide) => slide.id !== id);
  const { entries } = mergeDeck(generated, filtered);
  const index =
    entries.length === 0 ? 0 : Math.min(currentIndex, entries.length - 1);
  return { customSlides: filtered, index };
}

export function releaseOrphanedAnchors(
  customSlides: CustomSlide[],
  orphanIds: string[]
): CustomSlide[] {
  if (orphanIds.length === 0) return customSlides;
  const orphans = new Set(orphanIds);
  return customSlides.map((slide) =>
    orphans.has(slide.id) ? { ...slide, insertAfter: "end" } : slide
  );
}
