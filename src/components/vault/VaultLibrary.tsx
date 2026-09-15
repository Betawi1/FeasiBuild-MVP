"use client";

import Link from "next/link";
import { Download, Lock, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  VAULT_STUDIES,
  type VaultStudy,
} from "@/content/vault/studies";

const UNLOCKED_KEY = "feasibuild.vault.unlocked";
const KEPT_STUDY_KEY = "feasibuild.vault.keptStudy";
const PENDING_LEADS_KEY = "fb_pending_leads";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PendingLead = {
  name: string;
  email: string;
  ts: string;
};

function readPendingLeads(): PendingLead[] {
  try {
    const raw = window.localStorage.getItem(PENDING_LEADS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingLead => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as PendingLead).name === "string" &&
        typeof (item as PendingLead).email === "string" &&
        typeof (item as PendingLead).ts === "string"
      );
    });
  } catch {
    return [];
  }
}

function writePendingLeads(leads: PendingLead[]) {
  try {
    if (leads.length === 0) {
      window.localStorage.removeItem(PENDING_LEADS_KEY);
      return;
    }
    window.localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(leads));
  } catch {
    // Private mode / blocked storage.
  }
}

function enqueuePendingLead(lead: PendingLead) {
  writePendingLeads([...readPendingLeads(), lead]);
}

async function postVaultLead(name: string, email: string, hp = "") {
  return fetch("/api/vault-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, hp }),
  });
}

export default function VaultLibrary() {
  const [unlocked, setUnlocked] = useState(false);
  const [keptStudyId, setKeptStudyId] = useState<string | null>(null);
  const [viewerStudy, setViewerStudy] = useState<VaultStudy | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const emailId = useId();
  const hpId = useId();

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(UNLOCKED_KEY) === "1");
      setKeptStudyId(window.localStorage.getItem(KEPT_STUDY_KEY));
    } catch {
      // Private mode / blocked storage: gate still works for this session.
    }
  }, []);

  useEffect(() => {
    const pending = readPendingLeads();
    if (pending.length === 0) return;

    void (async () => {
      const remaining = [...pending];
      for (const lead of pending) {
        try {
          const res = await postVaultLead(lead.name, lead.email);
          if (res.ok) {
            const index = remaining.indexOf(lead);
            if (index >= 0) remaining.splice(index, 1);
            writePendingLeads(remaining);
          }
        } catch {
          // Keep for the next visit.
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!viewerStudy) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerStudy(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewerStudy]);

  function persistUnlocked() {
    try {
      window.localStorage.setItem(UNLOCKED_KEY, "1");
    } catch {
      // Session unlock still applies.
    }
    setUnlocked(true);
  }

  function keepStudy(studyId: string) {
    setKeptStudyId((current) => {
      if (current) return current;
      try {
        window.localStorage.setItem(KEPT_STUDY_KEY, studyId);
      } catch {
        // Session keep still applies.
      }
      return studyId;
    });
  }

  function canDownload(studyId: string) {
    return !keptStudyId || keptStudyId === studyId;
  }

  async function handleOpenVault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const hp = String(new FormData(event.currentTarget).get("hp") ?? "");

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Please enter a name of 100 characters or fewer.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid work email.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await postVaultLead(trimmedName, trimmedEmail, hp);
      if (res.status === 400) {
        setError("Please check your name and email.");
        return;
      }
      if (!res.ok) {
        enqueuePendingLead({
          name: trimmedName,
          email: trimmedEmail,
          ts: new Date().toISOString(),
        });
      }
      persistUnlocked();
    } catch {
      enqueuePendingLead({
        name: trimmedName,
        email: trimmedEmail,
        ts: new Date().toISOString(),
      });
      persistUnlocked();
    } finally {
      setSubmitting(false);
    }
  }

  function handleViewSample(study: VaultStudy) {
    if (!unlocked) {
      document.getElementById("vault-gate")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      nameInputRef.current?.focus();
      return;
    }
    setViewerStudy(study);
  }

  function handleKeepDownload(study: VaultStudy) {
    if (!canDownload(study.id)) return;
    keepStudy(study.id);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mx-auto mb-12 max-w-4xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          The Vault
          <span className="mx-3 text-slate-600">·</span>
          <Link href="/blog" className="transition hover:text-emerald-300">
            Learn
          </Link>
          <span className="mx-3 text-slate-600">·</span>
          <Link href="/faq" className="transition hover:text-emerald-300">
            FAQ
          </Link>
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-5xl">
          The Vault — three institutional-grade feasibility studies, free to
          inspect.
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-400 md:text-lg">
          Two sale-stream towers and a Tier IV data centre, across three
          jurisdictions. See exactly what a bankable FeasiBuild output looks like
          before you run your own. View all three in-browser; keep one; unlock
          all downloads with a free Explorer account.
        </p>
      </header>

      <section
        id="vault-gate"
        className="mx-auto mb-12 max-w-xl"
        aria-label="Open the Vault"
      >
        {unlocked ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-6 py-5 text-center">
            <p className="text-sm font-medium text-emerald-300">
              Vault open. Inspect all three in-browser.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Keep one download, or create a free Explorer account for all three.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleOpenVault}
            className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-emerald-500/5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={nameId}
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Name
                </label>
                <input
                  ref={nameInputRef}
                  id={nameId}
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor={emailId}
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Work Email
                </label>
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="nina.v@example.com"
                />
              </div>
            </div>
            <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor={hpId}>Company</label>
              <input
                id={hpId}
                type="text"
                name="hp"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>
            {error ? (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? "Opening…" : "Open the Vault"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              We&apos;ll email you the Vault and nothing else. Unsubscribe
              anytime.{" "}
              <Link
                href="/privacy-policy"
                className="text-slate-400 underline decoration-slate-600 underline-offset-2 transition hover:text-emerald-400"
              >
                Read our Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {VAULT_STUDIES.map((study) => (
          <article
            key={study.id}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 px-5 py-4">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  study.stream === "SALE"
                    ? "border-emerald-500/30 bg-slate-950/80 text-emerald-400"
                    : "border-sky-500/30 bg-slate-950/80 text-sky-300"
                }`}
              >
                {`${study.stream} stream`}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="mb-4 text-lg font-semibold leading-snug text-white">
                {study.title}
              </h2>
              <ul className="mb-6 flex-1 space-y-2">
                {study.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-2 text-sm leading-relaxed text-slate-400"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto space-y-2">
                <button
                  type="button"
                  onClick={() => handleViewSample(study)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    unlocked
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                      : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500/40 hover:text-white"
                  }`}
                >
                  {unlocked ? null : <Lock className="h-4 w-4" />}
                  View sample
                </button>
                {unlocked ? (
                  canDownload(study.id) ? (
                    <a
                      href={study.pdf}
                      download={study.fileName}
                      onClick={() => handleKeepDownload(study)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  ) : (
                    <Link
                      href="/sign-up"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      Unlock all downloads — free Explorer account
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {viewerStudy ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-pdf-title"
          onClick={() => setViewerStudy(null)}
        >
          <div
            className="flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:px-5">
              <h2
                id="vault-pdf-title"
                className="truncate text-sm font-semibold text-white sm:text-base"
              >
                {viewerStudy.title}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {canDownload(viewerStudy.id) ? (
                  <a
                    href={viewerStudy.pdf}
                    download={viewerStudy.fileName}
                    onClick={() => handleKeepDownload(viewerStudy)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                ) : (
                  <Link
                    href="/sign-up"
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    Unlock all downloads
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setViewerStudy(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close sample viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              src={viewerStudy.pdf}
              title={viewerStudy.title}
              className="h-full w-full bg-slate-900"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
