"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, CRASH, HAT, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { hit, layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Shared material: an 8-bar line in E minor built from motif M's        */
/* rhythm. Each bar has a rhythmic density and a start/end scale degree. */
/* ------------------------------------------------------------------ */

const OFF = [0, 2, 3, 5, 7, 8, 10]; // E natural minor
const deg = (d: number) => 40 + 12 * Math.floor(d / 7) + OFF[((d % 7) + 7) % 7];

/** Rhythms in sixteenths; a negative number is a rest. */
const RHYTHM: number[][] = [
  [4, 4, 8], // 0: long notes
  [1, 1, 2, 2, -1, 1, 3, 1, 4], // 1: motif M's rhythm
  [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 4], // 2: denser
  Array(16).fill(1), // 3: all sixteenths
];

/** Contour of the line, bar by bar: start and end scale degree (7 = E3, 14 = E4). Peak in bar 6. */
const CONTOUR: [number, number][] = [
  [7, 9],
  [8, 10],
  [9, 11],
  [10, 9],
  [9, 11],
  [11, 14],
  [13, 10],
  [9, 7],
];
const ROOTS = [28, 24, 26, 23, 28, 24, 26, 28]; // E C D B E C D E (bass, MIDI)

function bar(at: number, density: number, from: number, to: number, vel: number): NoteEvent[] {
  const r = RHYTHM[density];
  const n = r.filter((x) => x > 0).length;
  const out: NoteEvent[] = [];
  let t = at;
  let i = 0;
  for (const len of r) {
    const d = Math.abs(len) * S;
    if (len > 0) {
      const zig = i === 0 || i === n - 1 ? 0 : i % 3 === 1 ? 1 : i % 3 === 2 ? -1 : 0;
      const g = Math.round(from + ((to - from) * i) / Math.max(1, n - 1)) + (density === 0 ? 0 : zig);
      out.push(note(t, d * 0.95, [deg(g)], i === 0 ? vel : vel * 0.8, i === 0));
      i++;
    }
    t += d;
  }
  return out;
}

type Parts = { kit: NoteEvent[]; bass: NoteEvent[]; line: NoteEvent[] };

function toLayers(p: Parts, lineVoice: Layer["voice"] = "guitar"): Layer[] {
  return layers([
    { events: p.kit, voice: "kit" },
    { events: p.bass, voice: "bass" },
    { events: p.line, voice: lineVoice, gain: 1 },
  ]);
}

function line(p: Parts, densities: number[], vel = 0.8) {
  densities.forEach((dn, b) => p.line.push(...bar(b * 4, dn, CONTOUR[b][0], CONTOUR[b][1], vel + (b === 5 ? 0.1 : 0))));
  p.line.push(note(32, 3.5, [deg(7)], vel));
}

function hats(p: Parts, at: number, sixteenths: boolean, vel = 0.7) {
  if (sixteenths) for (let i = 0; i < 16; i++) p.kit.push(note(at + i * S, S, [HAT], i % 4 ? 0.35 * vel : vel));
  else for (let i = 0; i < 8; i++) p.kit.push(note(at + i * 0.5, S, [HAT], i % 2 ? 0.45 * vel : vel));
}

/* ------------------------------------------------------------------ */
/* 1. The tendency of the smallest notes                                */
/* ------------------------------------------------------------------ */

export type Smallest = "contained" | "runaway" | "aimed";

const PLANS: Record<Smallest, number[]> = {
  contained: [1, 1, 1, 0, 1, 1, 1, 0],
  runaway: [1, 2, 3, 3, 3, 3, 3, 3],
  aimed: [1, 1, 1, 0, 2, 3, 1, 0],
};

export function buildSmallest(plan: Smallest): Layer[] {
  const p: Parts = { kit: [], bass: [], line: [] };
  const dens = PLANS[plan];
  line(p, dens);
  for (let b = 0; b < 8; b++) {
    const t = b * 4;
    p.kit.push(note(t, S, [KICK], 0.8), note(t + 2, S, [SNARE], 0.75));
    hats(p, t, dens[b] === 3, 0.6);
    p.bass.push(note(t, 1.9, [ROOTS[b]], 0.75), note(t + 2, 1.9, [ROOTS[b]], 0.65));
  }
  p.kit.push(...hit(32, 0.9));
  p.bass.push(note(32, 3.5, [28], 0.85));
  return toLayers(p);
}

const SMALLEST_INFO: { id: Smallest; label: string; text: string }[] = [
  {
    id: "contained",
    label: "Contained",
    text: "The sixteenths stay where motif M put them: a stutter at the start of each bar. Bars 4 and 8 relax into long notes. Balanced, but the peak in bar 6 is only a high note.",
  },
  {
    id: "runaway",
    label: "Runaway",
    text: "Two sixteenths in bar 1 become four in bar 2 and sixteen in bar 3, and they never leave. By the peak there is nothing faster to go to, and the line can't stop: the last bar is still a blur before the E.",
  },
  {
    id: "aimed",
    label: "Spent at the peak",
    text: "The small notes are held back for four bars, grow in bar 5, take over in bar 6 at the top of the line, then go back to M's rhythm and long notes. The same acceleration, but used as the climax instead of leaking everywhere.",
  },
];

export function SmallestNotesLab() {
  const [plan, setPlan] = useState<Smallest>("runaway");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildSmallest(plan), [plan]);
  const info = SMALLEST_INFO.find((x) => x.id === plan)!;
  const key = `sm-${plan}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">The smallest notes take over</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One 8-bar line from motif M with the same contour and peak (bar 6) each time. Only the placement of the fastest notes
        changes.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {SMALLEST_INFO.map((x) => (
          <Chip key={x.id} on={plan === x.id} onClick={() => setPlan(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 92 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. The groove is a motive too — kept, adapted, liquidated, dropped     */
/* ------------------------------------------------------------------ */

/** The accompaniment motive: a bass-and-kick figure (sixteenths; negative = rest), snare on 2 and 4. */
const GROOVE = [3, 1, -2, 2, 2, -2, 2, 2];

export type Accomp = "kept" | "adapted" | "liquidated" | "dropped";

function grooveBar(p: Parts, at: number, root: number, vel: number, busy = false) {
  let t = at;
  GROOVE.forEach((len, i) => {
    const d = Math.abs(len) * S;
    if (len > 0) {
      const m = i === 6 ? root + 3 : i === 7 ? root - 2 : root;
      p.bass.push(note(t, d * 0.9, [m], i === 0 ? vel : vel * 0.85));
      p.kit.push(note(t, S, [KICK], i === 0 ? vel : vel * 0.8));
    }
    t += d;
  });
  p.kit.push(note(at + 1, S, [SNARE], vel), note(at + 3, S, [SNARE], vel));
  hats(p, at, busy, 0.6);
  if (busy) p.kit.push(note(at + 3.5, S, [SNARE], vel * 0.7), note(at + 3.75, S, [SNARE], vel * 0.8));
}

/** Liquidation: keep only the figure's first hit (bar 7), then the downbeat alone (bar 8 = arrival). */
function grooveResidue(p: Parts, at: number, root: number, vel: number) {
  p.bass.push(note(at, 0.7, [root], vel), note(at + 0.75, 0.2, [root], vel * 0.8));
  p.kit.push(note(at, S, [KICK], vel), note(at + 0.75, S, [KICK], vel * 0.8), note(at + 2, S, [SNARE], vel * 0.8));
  p.bass.push(note(at + 2, 1.9, [root], vel * 0.7));
}

export function buildAccomp(mode: Accomp): Layer[] {
  const p: Parts = { kit: [], bass: [], line: [] };
  line(p, PLANS.contained, 0.85);
  for (let b = 0; b < 8; b++) {
    const t = b * 4;
    const root = ROOTS[b];
    if (mode === "kept") grooveBar(p, t, root, 0.8);
    else if (mode === "adapted") grooveBar(p, t, root, b === 4 || b === 5 ? 0.9 : 0.8, b === 4 || b === 5);
    else if (mode === "liquidated") {
      if (b < 6) grooveBar(p, t, root, 0.8);
      else if (b === 6) grooveResidue(p, t, root, 0.75);
      else {
        p.bass.push(note(t, 3.8, [root], 0.6));
        p.kit.push(note(t, S, [KICK], 0.6));
      }
    } else {
      // dropped: bars 5–6 unaccompanied (the line alone), back for the cadence
      if (b === 4 || b === 5) continue;
      grooveBar(p, t, root, 0.8);
    }
  }
  p.kit.push(note(32, S, [CRASH], 0.85), note(32, S, [KICK], 0.9));
  p.bass.push(note(32, 3.5, [28], 0.85));
  return toLayers(p, "voice");
}

const ACCOMP_INFO: { id: Accomp; label: string; text: string }[] = [
  {
    id: "kept",
    label: "Kept",
    text: "The bass-and-kick figure repeats unchanged under all eight bars, moved only to each new root. It unifies, but by bar 8 it is running on autopilot, and it does nothing to help the ending.",
  },
  {
    id: "adapted",
    label: "Adapted to the climax",
    text: "The same figure, but in bars 5–6, where the line climbs to its peak, the hats go to sixteenths and a pickup is added. The accompaniment supports the theme's high point instead of ignoring it.",
  },
  {
    id: "liquidated",
    label: "Liquidated",
    text: "In bar 7 only the figure's first two hits are left; in bar 8 just a held root under the line's long notes. The groove dissolves along with the melody, so the arrival on E sounds like an ending.",
  },
  {
    id: "dropped",
    label: "Dropped out",
    text: "The groove stops for bars 5–6 and the line is heard alone, then the figure comes back for the cadence. Schoenberg's point: a gap in the accompaniment is a contrast and makes the texture transparent.",
  },
];

export function AccompanimentMotiveLab() {
  const [mode, setMode] = useState<Accomp>("kept");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildAccomp(mode), [mode]);
  const info = ACCOMP_INFO.find((x) => x.id === mode)!;
  const key = `ac-${mode}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">The groove is a motive too</div>
      <p className="mb-4 text-sm text-muted-foreground">
        A sung line over a bass-and-kick figure. The line never changes; the groove is treated four ways.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {ACCOMP_INFO.map((x) => (
          <Chip key={x.id} on={mode === x.id} onClick={() => setMode(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 96 })} />
    </div>
  );
}
