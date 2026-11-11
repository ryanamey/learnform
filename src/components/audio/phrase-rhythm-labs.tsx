"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { groove, note, CRASH } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Where the vocal phrase sits in the 4-bar unit (Stephenson ch. 1)    */
/* ------------------------------------------------------------------ */

export type PhraseModel = "trad" | "2+2" | "overlap" | "first" | "1+1";

const BARS = 8;
/** E major: I, vi, IV, V per bar; the V on bar 4 resolves to I across the seam. */
const ROOTS = [40, 37, 45, 47];
const TRIADS: Record<number, number[]> = { 40: [52, 56, 59], 37: [49, 52, 56], 45: [57, 61, 64], 47: [59, 63, 66] };
const E = 64, FS = 66, GS = 68, B = 71, CS = 73, E5 = 76;
const LINE = [GS, B, CS, B, GS, FS, E, FS, GS, B, GS, FS, E, FS, GS, B, CS, E5, CS, B, GS, FS, GS, FS];

type Span = { from: number; to: number; land: number; target: number };

/** Phrases per 8 bars: melodic motion from `from` (in beats) to the cadence note at `land`, held until `to`. */
export const MODELS: Record<PhraseModel, { label: string; spans: Span[]; ratio: string; text: string }> = {
  trad: {
    label: "Traditional 3 + 1",
    spans: [
      { from: 0, land: 12, to: 15, target: GS },
      { from: 16, land: 28, to: 31, target: E },
    ],
    ratio: "3 : 1",
    text: "Three bars of motion and a long note on the fourth downbeat, a weak bar. The folk and Tin Pan Alley norm: the voice carries the continuity and breathes at the cadence.",
  },
  "2+2": {
    label: "2 + 2",
    spans: [
      { from: 0, land: 8, to: 11, target: B },
      { from: 16, land: 24, to: 27, target: E },
    ],
    ratio: "1 : 1",
    text: "Two bars of motion, a cadence on the third downbeat (a strong bar), then two bars of rest. The commonest rock model, from the blues. The band carries the continuity through the gap, often with a fill or a backing-vocal answer.",
  },
  overlap: {
    label: "Extension-overlap",
    spans: [{ from: 0, land: 16, to: 19, target: E }],
    ratio: "4 : 4 (over 8 bars)",
    text: "The phrase runs past the end of the unit and lands on the next downbeat, the first bar of the new hypermeasure. One gesture closes as the next unit opens. Typical at the end of a chorus, often as the intro hook returns.",
  },
  first: {
    label: "First-downbeat",
    spans: [
      { from: 0, land: 0, to: 2, target: B },
      { from: 14.5, land: 16, to: 18, target: E },
    ],
    ratio: "short",
    text: "A short phrase, sometimes one word, that lands on bar 1 of a unit and stops. Often the title line, and often how a chorus is built.",
  },
  "1+1": {
    label: "1 + 1",
    spans: [
      { from: 0, land: 4, to: 7, target: B },
      { from: 8, land: 12, to: 15, target: GS },
      { from: 16, land: 20, to: 23, target: B },
      { from: 24, land: 28, to: 31, target: E },
    ],
    ratio: "1 : 1 per two bars",
    text: "Two short text phrases per unit, each followed by an equal rest: cadences on the second and fourth downbeats. It looks traditional on paper, but the gap in bar 2 breaks the four-bar line into two-bar halves.",
  },
};

export function buildPhraseRhythm(model: PhraseModel, fill: boolean): Layer[] {
  const kit = groove(BARS, "normal", "hat8");
  kit.push(note(0, 0.25, [CRASH], 0.8), note(16, 0.25, [CRASH], 0.6));
  const bass: NoteEvent[] = [];
  const pad: NoteEvent[] = [];
  for (let b = 0; b < BARS; b++) {
    const r = ROOTS[b % 4];
    bass.push(note(b * 4, 1.5, [r], 0.85), note(b * 4 + 2, 1.5, [r], 0.7));
    pad.push(note(b * 4, 3.9, TRIADS[r], 0.5));
  }
  const voice: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  const { spans } = MODELS[model];
  let li = 0;
  spans.forEach((s) => {
    // eighth-note line from `from` to just before `land`, with a little rhythmic grouping
    for (let t = s.from; t < s.land - 0.01; t += 0.5) {
      if ((t * 2) % 8 === 7) continue; // breath at the end of each bar-long group
      voice.push(note(t, 0.45, [LINE[li++ % LINE.length]], 0.8));
    }
    voice.push(note(s.land, Math.max(1, s.to - s.land + 0.9), [s.target], 0.9));
  });
  if (fill) {
    // answer every melodic rest that lasts at least a bar with a short guitar lick
    const busy = (t: number) => spans.some((s) => t >= s.from - 0.01 && t < s.to + 0.9);
    for (let bar = 0; bar < BARS; bar++) {
      const t0 = bar * 4;
      if (!busy(t0 + 1) && !busy(t0 + 3)) {
        [0.5, 1, 1.5, 2, 2.5].forEach((d, i) => gtr.push(note(t0 + d, 0.4, [[59, 61, 64, 61, 59][i]], 0.7)));
      }
    }
  }
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass", gain: -2 },
    { events: pad, voice: "pad" },
    { events: voice, voice: "voice", gain: 2 },
    { events: gtr, voice: "guitar", gain: -6 },
  ]);
}

export function PhraseRhythmLab() {
  const [model, setModel] = useState<PhraseModel>("2+2");
  const [fill, setFill] = useState(false);
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildPhraseRhythm(model, fill), [model, fill]);
  const m = MODELS[model];
  const key = `pr-${model}-${fill}`;
  const total = BARS * 4;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Where the phrase lands</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Eight bars: a four-chord loop (I–vi–IV–V) that starts every unit on I, and a melody standing in for the voice.
        Only the placement of the vocal phrases changes.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {(Object.keys(MODELS) as PhraseModel[]).map((id) => (
          <Chip key={id} on={model === id} onClick={() => setModel(id)}>
            {MODELS[id].label}
          </Chip>
        ))}
      </div>
      <div className="mb-4">
        <Chip on={fill} onClick={() => setFill(!fill)}>
          {fill ? "Band answers the gaps" : "Gaps left empty"}
        </Chip>
      </div>
      <div className="relative mb-1 h-6 w-full overflow-hidden rounded-md bg-muted" aria-hidden>
        {m.spans.map((s, i) => (
          <div key={i}>
            <div className="absolute top-0 h-full bg-signal/60" style={{ left: `${(s.from / total) * 100}%`, width: `${((s.land - s.from) / total) * 100}%` }} />
            <div className="absolute top-0 h-full bg-signal" style={{ left: `${(s.land / total) * 100}%`, width: `${(Math.max(1, s.to - s.land + 1) / total) * 100}%` }} />
          </div>
        ))}
        {Array.from({ length: BARS - 1 }, (_, i) => (
          <div key={i} className={"absolute top-0 h-full w-px " + (i === 3 ? "bg-foreground/70" : "bg-foreground/25")} style={{ left: `${((i + 1) / BARS) * 100}%` }} />
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Thin lines = bars, thick line = the second 4-bar unit. Shaded = melodic motion, bright = the cadence note. Motion to
        rest: {m.ratio}.
      </p>
      <p className="mb-3 text-sm">{m.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}
