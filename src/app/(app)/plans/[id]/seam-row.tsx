"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  FIRST_CHORDS,
  SEAM_CUES,
  SEAM_HOLDS,
  SEAM_INTENTS,
  SEAM_INTENT_HELP,
  SEAM_KINDS,
  SEAM_KIND_HELP,
  type Seam,
  type SeamReading,
  type SeamStrength,
} from "@/lib/form-plan";

export const STRENGTH_STYLE: Record<SeamStrength, { label: string; className: string; width: number; dash?: string }> = {
  seamless: { label: "seamless", className: "border-border text-muted-foreground", width: 1, dash: "2 3" },
  subtle: { label: "subtle", className: "border-border text-muted-foreground", width: 1.5 },
  clear: { label: "clear", className: "border-note-b/60 text-foreground", width: 2.5 },
  obvious: { label: "obvious", className: "border-signal/70 text-signal", width: 4 },
  ambiguous: { label: "ambiguous", className: "border-note-c/70 text-note-c", width: 2.5, dash: "5 3" },
};

const FITS: Record<string, SeamStrength[]> = {
  cut: ["obvious"],
  clear: ["clear", "obvious"],
  subtle: ["subtle", "clear"],
  blurred: ["ambiguous", "seamless", "subtle"],
};

const field = "h-8 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function SeamRow({
  reading,
  fromLabel,
  toLabel,
  onChange,
}: {
  reading: SeamReading;
  fromLabel: string;
  toLabel: string;
  onChange: (seam: Seam) => void;
}) {
  const [open, setOpen] = useState(false);
  const { seam, strength } = reading;
  const st = STRENGTH_STYLE[strength];
  const mismatch = seam.intent && !FITS[seam.intent].includes(strength);
  const toggle = <K extends "cues" | "holds">(key: K, value: Seam[K][number]) => {
    const list = seam[key] as string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ ...seam, [key]: next } as Seam);
  };
  const kinds = [...new Set(SEAM_CUES.map((c) => c.kind))];

  return (
    <li className="relative pl-6">
      <span aria-hidden className={`absolute top-0 bottom-0 left-2 border-l-2 ${st.className}`} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
      >
        <span className={`rounded-full border px-2 py-0.5 font-medium ${st.className}`}>{st.label}</span>
        <span className="text-muted-foreground">
          seam {fromLabel} → {toLabel}
        </span>
        {seam.intent && (
          <span className={mismatch ? "text-destructive" : "text-muted-foreground"}>
            · want {seam.intent}
            {mismatch ? " ✕" : " ✓"}
          </span>
        )}
        <span className="text-muted-foreground">
          · {reading.auto.length + reading.manual.length} cues{reading.holds.length ? `, ${reading.holds.length} holding` : ""}
        </span>
        <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mb-2 grid gap-4 rounded-lg border bg-card p-3 text-sm md:grid-cols-2">
          <div className="grid content-start gap-3">
            <label className="grid gap-1">
              <span className="font-medium">How strong should this seam be?</span>
              <select value={seam.intent} onChange={(e) => onChange({ ...seam, intent: e.target.value as Seam["intent"] })} className={field}>
                {SEAM_INTENTS.map((i) => (
                  <option key={i} value={i}>
                    {SEAM_INTENT_HELP[i]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Kind of transition</span>
              <select value={seam.kind} onChange={(e) => onChange({ ...seam, kind: e.target.value as Seam["kind"] })} className={field}>
                {SEAM_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SEAM_KIND_HELP[k]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="mb-1 font-medium">Read from the plan</div>
              {reading.auto.length ? (
                <ul className="grid gap-0.5 text-xs text-muted-foreground">
                  {reading.auto.map((c) => (
                    <li key={c.label}>
                      {c.label} <span className="opacity-60">({c.kind.toLowerCase()})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nothing big changes in the lanes here.</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Cues {reading.breakScore} · holding {reading.holdScore} · {reading.differences} differences between the two
              sections
            </div>
          </div>

          <div className="grid content-start gap-3">
            <fieldset>
              <legend className="mb-1 font-medium">Cues that mark the seam</legend>
              <div className="grid gap-2">
                {kinds.map((k) => (
                  <div key={k}>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                    {SEAM_CUES.filter((c) => c.kind === k).map((c) => (
                      <label key={c.key} className="flex items-start gap-2 py-0.5">
                        <input
                          type="checkbox"
                          checked={seam.cues.includes(c.key)}
                          onChange={() => toggle("cues", c.key)}
                          className="mt-1 accent-[var(--signal)]"
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                    {k === "Harmony" && (
                      <label className="mt-1 flex items-center gap-2">
                        <span>New section opens on</span>
                        <select
                          value={seam.firstChord}
                          onChange={(e) => onChange({ ...seam, firstChord: e.target.value as Seam["firstChord"] })}
                          className={`${field} w-24`}
                        >
                          {FIRST_CHORDS.map((c) => (
                            <option key={c} value={c}>
                              {c || "—"}
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-muted-foreground">optional; skip for riff-based music</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 font-medium">What carries across it</legend>
              {SEAM_HOLDS.map((h) => (
                <label key={h.key} className="flex items-start gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={seam.holds.includes(h.key)}
                    onChange={() => toggle("holds", h.key)}
                    className="mt-1 accent-[var(--note-c)]"
                  />
                  <span>{h.label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </div>
      )}
    </li>
  );
}
