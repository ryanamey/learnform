"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, CRASH, HAT, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Metrical processes: a displaced stab layer (beat 2 = "+1" quarter)    */
/* over a 4/4 riff, changed bar by bar.                                  */
/* ------------------------------------------------------------------ */

export type Process = "tighten" | "loosen" | "submerge" | "abrupt";

/** For each of 10 bars: which quarter-note beats (0–3) get a displaced stab. "alt" = only on odd bars. */
type BarPlan = { stabs: number[]; kit: boolean; downbeat: boolean };

const PLANS: Record<Process, BarPlan[]> = {
  // consonant → D8+1 (beat 2 of alternate bars) → D4+1 (beat 2 every bar) → D2+1 (beats 2 and 4) → corrective accent
  tighten: [
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
  ],
  // D2+1 → D4+1 → D8+1 → consonance: resolution by loosening
  loosen: [
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [1], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
  ],
  // D2+1 with the band on the beat, then the beat drops out (only the stabs remain), then it surfaces again
  submerge: [
    { stabs: [], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: false, downbeat: false },
    { stabs: [1, 3], kit: false, downbeat: false },
    { stabs: [1, 3], kit: false, downbeat: false },
    { stabs: [1, 3], kit: false, downbeat: false },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
  ],
  // consonant, sudden D2+1, sudden stop
  abrupt: [
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [1, 3], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
    { stabs: [], kit: true, downbeat: true },
  ],
};

const ROOTS = [28, 28, 31, 31, 26, 26, 24, 23, 28, 28];

export function buildProcess(p: Process): Layer[] {
  const kit: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const stab: NoteEvent[] = [];
  const plan = PLANS[p];
  plan.forEach((bar, b) => {
    const t = b * 4;
    const root = ROOTS[b];
    if (bar.kit) {
      kit.push(note(t, S, [KICK], 0.85), note(t + 2, S, [KICK], 0.75));
      kit.push(note(t + 1, S, [SNARE], 0.8), note(t + 3, S, [SNARE], 0.8));
      for (let i = 0; i < 8; i++) kit.push(note(t + i * 0.5, S, [HAT], i % 2 ? 0.3 : 0.5));
    }
    if (bar.downbeat) {
      // bass chug in eighths, accent on 1
      for (let i = 0; i < 8; i++) bass.push(note(t + i * 0.5, 0.45, [root], i === 0 ? 0.85 : 0.55));
    }
    for (const beat of bar.stabs) {
      stab.push(note(t + beat, 0.45, [root + 24, root + 31, root + 36], 0.95, true));
    }
  });
  // corrective accent: crash + full band on the first consonant downbeat after dissonance
  let lastStab = -1;
  plan.forEach((bar, i) => {
    if (bar.stabs.length) lastStab = i;
  });
  const firstClean = lastStab + 1;
  if (p !== "loosen" && lastStab >= 0 && firstClean < plan.length) {
    const t = firstClean * 4;
    kit.push(note(t, S, [CRASH], 0.95));
    stab.push(note(t, 1.8, [ROOTS[firstClean] + 24, ROOTS[firstClean] + 31, ROOTS[firstClean] + 36], 0.9));
  }
  const end = plan.length * 4;
  kit.push(note(end, S, [CRASH], 0.85), note(end, S, [KICK], 0.9));
  bass.push(note(end, 2, [28], 0.8));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: stab, voice: "drive", gain: 0.7 },
  ]);
}

const INFO: { id: Process; label: string; text: string }[] = [
  {
    id: "tighten",
    label: "Tightening",
    text: "Two clean bars, then a stab on beat 2 of every other bar (D8+1 in quarters), then every bar (D4+1), then on 2 and 4 (D2+1). The displacement stays the same, but it contradicts the beat more often each time: tension rises. Bar 9 resolves with a crash on 1, a corrective accent.",
  },
  {
    id: "loosen",
    label: "Loosening into resolution",
    text: "The reverse: stabs on 2 and 4, then only on 2, then only on every other bar, then gone, with no crash to mark the end. The dissonance thins out before it disappears, so the resolution feels gradual rather than cut off.",
  },
  {
    id: "submerge",
    label: "Submerge and surface",
    text: "Stabs on 2 and 4 against the band. Then the drums and bass drop out and only the stabs are left: within a bar or two you start hearing them as downbeats. When the band comes back on the real 1, the displacement suddenly surfaces again.",
  },
  {
    id: "abrupt",
    label: "Abrupt",
    text: "Four clean bars, four bars of stabs on 2 and 4, then straight back. Compare how much less the arrival means without preparation or a process.",
  },
];

export function MetricProcessLab() {
  const [p, setP] = useState<Process>("tighten");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildProcess(p), [p]);
  const info = INFO.find((x) => x.id === p)!;
  const key = `pr-${p}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Four ways to move through a dissonance</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ten bars of the same 4/4 groove. Only the off-beat stabs and the band&apos;s presence change.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {INFO.map((x) => (
          <Chip key={x.id} on={p === x.id} onClick={() => setP(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 112 })} />
    </div>
  );
}
