"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { getAnalystSystemPrompt } from "@/lib/constants/aiAnalystPrompts";
import { useAnalystContext } from "@/hooks/useAnalystContext";
import { getPreferredModel } from "@/lib/puter-models";
import { useAnalystStore } from "@/store/useAnalystStore";

const ANALYST_TEMPERATURE = 0.3;
const ANALYST_MAX_TOKENS = 4000;

type StreamChunkShape = {
  type?: string;
  value?: string;
  text?: string;
  content?: string;
  reasoning?: string;
  message?: string | { content?: string | Array<{ text?: string }> };
  choices?: Array<{ delta?: { content?: string }; text?: string }>;
};

function extractStreamChunkText(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (!chunk || typeof chunk !== "object") return "";

  const c = chunk as StreamChunkShape;
  const chunkType = typeof c.type === "string" ? c.type.toLowerCase() : "";

  if (chunkType === "error") {
    const errMsg =
      (typeof c.message === "string" && c.message) ||
      (typeof c.text === "string" && c.text) ||
      (typeof c.content === "string" && c.content) ||
      "Puter stream error";
    throw new Error(errMsg);
  }

  if (
    chunkType === "reasoning" ||
    chunkType === "usage" ||
    chunkType === "compaction" ||
    chunkType === "tool_use" ||
    chunkType === "extra_content"
  ) {
    return "";
  }

  if (typeof c.choices?.[0]?.delta?.content === "string") {
    return c.choices[0].delta.content;
  }
  if (typeof c.choices?.[0]?.text === "string") {
    return c.choices[0].text;
  }
  if (typeof c.value === "string") return c.value;
  if (typeof c.text === "string") return c.text;
  if (typeof c.content === "string") return c.content;
  if (typeof c.message === "string") return c.message;
  if (typeof c.message?.content === "string") return c.message.content;
  if (Array.isArray(c.message?.content)) {
    return c.message.content.map((part) => part.text ?? "").join("");
  }

  return "";
}

function extractChatText(response: unknown): string {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";
  const r = response as {
    message?: { content?: string | Array<{ text?: string }> };
    text?: string;
    content?: string;
  };
  const content = r.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("");
  }
  return r.text ?? r.content ?? "";
}

async function waitForPuter(timeoutMs = 15000): Promise<typeof window.puter> {
  if (typeof window === "undefined") return undefined;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

function stepBadgeLabel(
  component: string | null,
  innerStep: number | null,
  isPreview: boolean,
  assetType: string
): string {
  const parts: string[] = [];
  if (component) parts.push(component);
  if (isPreview) parts.push("Preview");
  else if (innerStep) parts.push(`Step ${innerStep}`);
  if (assetType && assetType !== "unspecified") {
    parts.push(assetType.replace(/_/g, " "));
  }
  return parts.join(" · ") || "Wizard";
}

export default function AIAnalystDrawer() {
  const {
    isVisible,
    stepContext,
    streamType,
    assetType,
    quickActions,
    component,
    innerStep,
    isPreview,
    isLoading: isDocsLoading,
    sectionFound,
    stepId,
    researchSnapshot,
    c1CostGuardrails,
  } = useAnalystContext();

  const isOpen = useAnalystStore((s) => s.isOpen);
  const messages = useAnalystStore((s) => s.messages);
  const isLoading = useAnalystStore((s) => s.isLoading);
  const toggleDrawer = useAnalystStore((s) => s.toggleDrawer);
  const closeDrawer = useAnalystStore((s) => s.closeDrawer);
  const addMessage = useAnalystStore((s) => s.addMessage);
  const appendToLastAssistant = useAnalystStore((s) => s.appendToLastAssistant);
  const replaceLastAssistant = useAnalystStore((s) => s.replaceLastAssistant);
  const clearChat = useAnalystStore((s) => s.clearChat);
  const setLoading = useAnalystStore((s) => s.setLoading);

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const liveContextKey = `${stepId}::${innerStep ?? ""}::${assetType}`;

  useEffect(() => {
    const { contextKey, resetForContext } = useAnalystStore.getState();
    if (contextKey !== liveContextKey) {
      resetForContext(liveContextKey);
    }
  }, [liveContextKey]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeDrawer]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [isOpen]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || useAnalystStore.getState().isLoading) return;

      const gen = useAnalystStore.getState().generation;

      addMessage({ role: "user", content: text });
      addMessage({ role: "assistant", content: "" });
      setLoading(true);
      setDraft("");

      try {
        const puter = await waitForPuter();
        if (!puter?.ai?.chat) {
          throw new Error(
            "Puter.js is not available. Confirm the Puter script is loaded and you are signed in."
          );
        }

        const model = await getPreferredModel();
        const history = useAnalystStore
          .getState()
          .messages.filter((m) => m.content.length > 0);
        const payload: Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }> = [
          {
            role: "system",
            content: getAnalystSystemPrompt(
              stepContext,
              streamType,
              assetType,
              sectionFound,
              researchSnapshot,
              {
                component: component ?? "",
                innerStep,
                c1CostGuardrails,
              }
            ),
          },
          ...history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ];

        const chatOptions = {
          model,
          stream: true as const,
          temperature: ANALYST_TEMPERATURE,
          max_tokens: ANALYST_MAX_TOKENS,
        };

        const consume = async (stream: boolean): Promise<string> => {
          const response = await puter.ai.chat(payload, {
            ...chatOptions,
            stream,
          });

          if (
            response &&
            typeof response === "object" &&
            Symbol.asyncIterator in response
          ) {
            let assembled = "";
            for await (const chunk of response as AsyncIterable<unknown>) {
              if (useAnalystStore.getState().generation !== gen) return assembled;
              const piece = extractStreamChunkText(chunk);
              if (!piece) continue;
              assembled += piece;
              appendToLastAssistant(piece);
            }
            return assembled;
          }

          const textBody = extractChatText(response);
          if (textBody && useAnalystStore.getState().generation === gen) {
            replaceLastAssistant(textBody);
          }
          return textBody;
        };

        let assembled = await consume(true);
        if (!assembled.trim() && useAnalystStore.getState().generation === gen) {
          assembled = await consume(false);
        }

        if (useAnalystStore.getState().generation !== gen) return;

        if (!assembled.trim()) {
          replaceLastAssistant(
            "No response was returned. Check the Puter connection and selected model, then retry."
          );
        }
      } catch (error) {
        if (useAnalystStore.getState().generation !== gen) return;
        const message =
          error instanceof Error
            ? error.message
            : "The Analyst could not complete this reply. Check the Puter connection and try again.";
        replaceLastAssistant(message);
      } finally {
        if (useAnalystStore.getState().generation === gen) {
          setLoading(false);
        }
      }
    },
    [
      addMessage,
      appendToLastAssistant,
      assetType,
      c1CostGuardrails,
      component,
      innerStep,
      replaceLastAssistant,
      researchSnapshot,
      sectionFound,
      setLoading,
      stepContext,
      streamType,
    ]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(draft);
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(draft);
    }
  };

  if (!isVisible) return null;

  const badge = stepBadgeLabel(component, innerStep, isPreview, assetType);
  const busy = isLoading || isDocsLoading;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggleDrawer}
          className="fixed bottom-24 right-4 z-[190] flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/95 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-sm transition-colors hover:bg-slate-700 hover:text-white md:bottom-8 md:right-6"
          aria-label="Open AI Analyst"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          Analyst
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[211] bg-black/40 backdrop-blur-[2px]"
            aria-hidden
            onClick={closeDrawer}
          />

          <aside
            className="fixed inset-y-0 right-0 z-[212] flex w-full max-w-[400px] flex-col border-l border-slate-700 bg-slate-900 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-analyst-drawer-title"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3">
              <div className="min-w-0">
                <h2
                  id="ai-analyst-drawer-title"
                  className="flex items-center gap-2 text-sm font-semibold text-white"
                >
                  <Sparkles
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden
                  />
                  AI Analyst
                </h2>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-slate-400">
                  {badge}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                  aria-label="Close AI Analyst"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 px-4 py-2.5">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(action.prompt)}
                  className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-700 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm leading-relaxed text-slate-400">
                  Ask about this step, engine timing, or why a figure looks the
                  way it does. The Analyst is advisory only — it does not write
                  into the model. AI research values are directional baselines,
                  not live valuations.
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === "user";
                const isEmptyAssistant =
                  message.role === "assistant" && !message.content && isLoading;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        isUser
                          ? "bg-emerald-900/40 text-emerald-50"
                          : "border border-slate-700 bg-slate-800 text-slate-200"
                      }`}
                    >
                      {isEmptyAssistant ? (
                        <span className="inline-flex items-center gap-2 text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Working
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-slate-700 bg-slate-800 p-3"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onDraftKeyDown}
                  rows={2}
                  disabled={isLoading}
                  placeholder="Ask about this step…"
                  className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !draft.trim()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                Enter to send · Shift+Enter for a new line
              </p>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
