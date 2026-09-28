"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

interface InlineAutoGrowProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  className: string;
  placeholder?: string;
}

/** Focused editor. Typography comes entirely from `className`. */
export default function InlineAutoGrow({
  value,
  onChange,
  onBlur,
  className,
  placeholder,
}: InlineAutoGrowProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [fit, value]);

  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className={`${className} block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-[inherit] focus:outline-none focus:ring-0 placeholder:text-slate-400`}
    />
  );
}
