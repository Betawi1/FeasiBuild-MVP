"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_LOGO_HEIGHT, MIN_LOGO_HEIGHT } from "@/lib/brand-logo";

interface Props {
  logo: string | null;
  height: number;
  onSave: (dataUrl: string) => Promise<void>;
  onClear: () => Promise<void>;
  onHeightPreview: (h: number) => void;
  onHeightCommit: (h: number) => Promise<void>;
}

export default function LogoUploadControl({
  logo,
  height,
  onSave,
  onClear,
  onHeightPreview,
  onHeightCommit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftH, setDraftH] = useState(height);

  useEffect(() => setDraftH(height), [height]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG or SVG).");
      return;
    }
    if (file.size > 200 * 1024) {
      setError("Logo must be 200 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true);
      try {
        await onSave(String(reader.result));
      } catch {
        setError("Could not save logo. Please try again.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setError("Could not read that file. Please try another image.");
    };
    reader.readAsDataURL(file);
  };

  const handleClear = async () => {
    setError(null);
    setBusy(true);
    try {
      await onClear();
    } catch {
      setError("Could not remove logo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const commitHeight = (raw: string) => {
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    void onHeightCommit(v);
  };

  return (
    <div className="mb-4 flex flex-col items-center gap-2" data-pdf-hide>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {logo ? (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {busy ? "Saving…" : "Replace logo"}
            </button>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={busy}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Remove
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Logo size</span>
            <input
              type="range"
              min={MIN_LOGO_HEIGHT}
              max={MAX_LOGO_HEIGHT}
              step={4}
              value={draftH}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraftH(v);
                onHeightPreview(v);
              }}
              onPointerUp={(e) => commitHeight(e.currentTarget.value)}
              onKeyUp={(e) => commitHeight(e.currentTarget.value)}
              className="h-1 w-36 accent-emerald-500"
            />
            <span className="w-12 text-slate-600">{draftH}px</span>
          </label>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded border border-dashed border-emerald-400 px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50"
        >
          {busy ? "Saving…" : "＋ Upload your logo (appears on the title page)"}
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
