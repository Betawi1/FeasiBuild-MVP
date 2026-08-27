"use client";

import type { InputHTMLAttributes } from "react";
import { useFocusedNumericString } from "@/hooks/useFocusedNumericString";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "onFocus" | "onBlur"
> & {
  value: number;
  onChange: (n: number) => void;
  onDraftChange?: () => void;
};

/** Uncontrolled-while-focused numeric text input. Allows "", "2.", "2.5". */
export function NumericDraftInput({
  value,
  onChange,
  onDraftChange,
  className,
  ...rest
}: Props) {
  const draft = useFocusedNumericString(value, onChange);
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft.display}
      onFocus={draft.onFocus}
      onChange={(e) => {
        onDraftChange?.();
        draft.onChangeText(e.target.value);
      }}
      onBlur={draft.onBlur}
      className={className}
    />
  );
}
