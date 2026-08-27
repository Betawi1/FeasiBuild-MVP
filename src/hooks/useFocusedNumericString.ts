import { useCallback, useEffect, useRef, useState } from "react";

/** True for "", ".", "-", "-." and other in-progress numeric strings. */
export function isNumericDraft(raw: string): boolean {
  return /^-?\d*\.?\d*$/.test(raw.trim());
}

/**
 * Parse a draft string to a finite number. Intermediate states ("", "2.", "-")
 * return null — they must remain visible and must not be coerced to 0.
 */
export function parseNumericDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === "-" || t === "." || t === "-.") return null;
  if (!isNumericDraft(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatCommitted(n: number): string {
  if (!Number.isFinite(n)) return "";
  return String(n);
}

/**
 * Local string buffer while a numeric input is focused so keystrokes such as
 * "2." are never overwritten by a parsed store number or a benchmark refill.
 */
export function useFocusedNumericString(
  committed: number,
  onCommit: (n: number) => void
) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const lastValidRef = useRef(
    Number.isFinite(committed) ? committed : 0
  );

  useEffect(() => {
    if (!focused && Number.isFinite(committed)) {
      lastValidRef.current = committed;
    }
  }, [committed, focused]);

  const display = focused ? draft : formatCommitted(committed);

  const onFocus = useCallback(() => {
    setDraft(formatCommitted(committed));
    setFocused(true);
  }, [committed]);

  const onChangeText = useCallback(
    (raw: string) => {
      if (!isNumericDraft(raw)) return;
      setDraft(raw);
      const n = parseNumericDraft(raw);
      if (n != null) {
        lastValidRef.current = n;
        onCommit(n);
      }
    },
    [onCommit]
  );

  const onBlur = useCallback(() => {
    const n = parseNumericDraft(draft) ?? lastValidRef.current;
    lastValidRef.current = n;
    onCommit(n);
    setFocused(false);
  }, [draft, onCommit]);

  return { display, focused, onFocus, onChangeText, onBlur };
}
