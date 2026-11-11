"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { groove, note, S, CRASH, HAT, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { fill, hit, layers, place } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Shared material: one riff in E minor (one bar of eighths)            */
/* ------------------------------------------------------------------ */

const RIFF = "E2/8! x/16 E2/16 G2/8 E2/8 Bb2/8 A2/8 G2/8 E2/8";
const HEAD = "E2/8! x/16 E2/16 G2/8 E2/8"; // first half of the riff
const RIFF_BASS = "E1/4 E1/4 G1/4 A1/4";

type Parts = { kit: NoteEvent[]; bass: NoteEvent[]; gtr: NoteEvent[]; pad: NoteEvent[] };
const empty = (): Parts => ({ kit: [], bass: [], gtr: [], pad: [] });

function toLayers(p: Parts): Layer[] {
  return layers([
    { events: p.kit, voice: "kit" },
    { events: p.bass, voice: "bass" },
    { events: p.pad, voice: "pad" },
    { events: p.gtr, voice: "drive", gain: -2 },
  ]);
}

/* ------------------------------------------------------------------ */
/* 1. One riff, five jobs — Caplin's temporal functions                 */
/* ------------------------------------------------------------------ */

export type Job = "before" | "beginning" | "middle" | "end" | "after";

/** Each job writes into `p` starting at beat `at` and returns its length in beats. */
const JOBS: Record<Job, (p: Parts, at: number, vel?: number) => number> = {
  // Before the beginning: a vamp with no melody, growing (progressive dynamic).
  before: (p, at) => {
    for (let b = 0; b < 2; b++) {
      const t = at + b * 4;
      const v = 0.45 + b * 0.25;
      for (let i = 0; i < 8; i++) p.kit.push(note(t + i * 0.5, S, [HAT], v * (i % 2 ? 0.6 : 0.9)));
      p.kit.push(note(t, S, [KICK], v), note(t + 2, S, [KICK], v));
      for (let i = 0; i < 4; i++) p.bass.push(note(t + i, 0.9, [28], v));
    }
    p.kit.push(...fill(at + 7, 8, 0.7));
    return 8;
  },
  // Beginning: the riff stated, repeated, answered, restated over a steady groove. Stable, open: no cadence.
  beginning: (p, at, vel = 0.85) => {
    const plan = [0, 0, 5, 0]; // E, E, A (response), E
    plan.forEach((tr, b) => {
      const t = at + b * 4;
      p.gtr.push(...place(RIFF, t, tr, vel));
      p.bass.push(...place(RIFF_BASS, t, tr, vel * 0.95));
    });
    p.kit.push(...groove(4, "normal", "hat8", at, 0.8 * vel));
    return 16;
  },
  // Middle: the riff's head fragmented to half bars, moved up step by step, faster harmony and busier drums; ends hanging on B.
  middle: (p, at) => {
    const steps = [0, 2, 3, 5, 7, 8, 10, 11]; // E F# G A B C D D#
    steps.forEach((tr, i) => {
      const t = at + i * 2;
      p.gtr.push(...place(HEAD, t, tr, 0.85 + i * 0.015));
      p.bass.push(note(t, 1, [28 + tr], 0.8), note(t + 1, 1, [28 + tr], 0.7));
    });
    for (let b = 0; b < 4; b++) {
      const t = at + b * 4;
      for (let i = 0; i < 16; i++) p.kit.push(note(t + i * S, S, [HAT], i % 2 ? 0.45 : 0.7));
      p.kit.push(note(t, S, [KICK], 0.85), note(t + 1, S, [SNARE], 0.8), note(t + 2, S, [KICK], 0.85), note(t + 2.5, S, [KICK], 0.7), note(t + 3, S, [SNARE], 0.85));
    }
    // last bar: stop on B (V) and hold, unresolved
    p.gtr.push(note(at + 16, 3, [35, 42, 47], 0.95));
    p.bass.push(note(at + 16, 3, [23], 0.9));
    p.kit.push(...hit(at + 16, 0.85));
    return 20;
  },
  // End: the riff liquidated into a falling cadential gesture, slowing to a final landing on the low E.
  end: (p, at) => {
    p.gtr.push(...place("E2/8! x/16 E2/16 G2/8 E2/8 D3/4 B2/4", at, 0, 0.85));
    p.gtr.push(...place("C3/4 A2/4 B2/2", at + 4, 0, 0.85));
    p.gtr.push(note(at + 8, 4, [28, 35, 40], 1));
    p.bass.push(...place("E1/4 E1/4 C2/4 C2/4 A1/4 A1/4 B1/2", at, 0, 0.85));
    p.bass.push(note(at + 8, 4, [16], 1));
    p.kit.push(...groove(1, "normal", "hat8", at, 0.8));
    p.kit.push(note(at + 4, S, [KICK], 0.8), note(at + 5, S, [SNARE], 0.8), note(at + 6, S, [KICK], 0.85), note(at + 6.5, S, [SNARE], 0.7));
    p.kit.push(note(at + 7, S, [SNARE], 0.8), note(at + 7.25, S, [SNARE], 0.85), note(at + 7.5, S, [SNARE], 0.9), note(at + 7.75, S, [SNARE], 0.95));
    p.kit.push(...hit(at + 8));
    return 12;
  },
  // After the end: codettas over the tonic, each shorter and softer (recessive dynamic).
  after: (p, at) => {
    const units = [
      { at: 0, len: 4, v: 0.7 },
      { at: 4, len: 4, v: 0.6 },
      { at: 8, len: 2, v: 0.5 },
      { at: 10, len: 2, v: 0.45 },
      { at: 12, len: 1, v: 0.4 },
      { at: 13, len: 1, v: 0.35 },
    ];
    for (const u of units) {
      const t = at + u.at;
      if (u.len >= 2) p.gtr.push(...place(HEAD, t, 0, u.v));
      else p.gtr.push(note(t, 0.5, [40], u.v));
      p.kit.push(note(t, S, [KICK], u.v), note(t, S, [CRASH], u.v * 0.6));
    }
    p.bass.push(note(at, 14, [28], 0.6));
    p.pad.push(note(at, 6, [40, 47, 52], 0.5), note(at + 6, 4, [40, 45, 48], 0.45), note(at + 10, 5, [40, 47, 52], 0.4));
    p.gtr.push(note(at + 14, 3, [28, 35, 40], 0.5));
    return 17;
  },
};

export type FunctionPlan = Job | "all" | "medias";

export function buildFunction(plan: FunctionPlan): Layer[] {
  const p = empty();
  const order: Job[] = plan === "all" ? ["before", "beginning", "middle", "end", "after"] : plan === "medias" ? ["middle", "end", "after"] : [plan];
  let at = 0;
  for (const j of order) at += JOBS[j](p, at);
  return toLayers(p);
}

const JOB_INFO: { id: FunctionPlan; label: string; text: string }[] = [
  {
    id: "before",
    label: "Before the beginning",
    text: "A vamp: groove and bass on E, no riff, getting louder. It builds expectation for a melody that hasn't arrived. Nothing here sounds like the piece itself yet.",
  },
  {
    id: "beginning",
    label: "Beginning",
    text: "The riff stated, repeated, answered on A, restated. Two-bar units, one stable harmony, a steady beat, and no cadence. Repeating a beginning makes it more of a beginning.",
  },
  {
    id: "middle",
    label: "Middle",
    text: "Only the riff's first half, moved up step by step: shorter units, faster chord changes, busier drums, and a sequence. It stops on B, unresolved. You know you're in the middle of something.",
  },
  {
    id: "end",
    label: "End",
    text: "The riff's head, then its character drains away into a plain falling line over C, A, B, slowing to a landing on low E with everything together.",
  },
  {
    id: "after",
    label: "After the end",
    text: "Fragments of the riff over a held E, each shorter and quieter than the last. Nothing new opens up. This prolongs an ending that has already happened.",
  },
  {
    id: "all",
    label: "All five in order",
    text: "The five jobs in their logical order make a complete small form from one riff.",
  },
  {
    id: "medias",
    label: "Start in the middle",
    text: "The same music, but the piece opens with the middle. The first bars still sound like a middle: a formal dissonance between what the music is and where it sits.",
  },
];

export function FunctionLab() {
  const [plan, setPlan] = useState<FunctionPlan>("beginning");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildFunction(plan), [plan]);
  const info = JOB_INFO.find((x) => x.id === plan)!;
  const key = `fn-${plan}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">One riff, five jobs</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same riff written to sound like a before-the-beginning, a beginning, a middle, an end and an after-the-end. Listen
        for what changes: unit length, harmonic speed, drum activity, how the line moves, how loud it gets.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {JOB_INFO.slice(0, 5).map((x) => (
          <Chip key={x.id} on={plan === x.id} onClick={() => setPlan(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <span className="mr-1">Put together:</span>
        {JOB_INFO.slice(5).map((x) => (
          <Chip key={x.id} on={plan === x.id} onClick={() => setPlan(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Reaching the cadence — deceptive, evaded, abandoned               */
/* ------------------------------------------------------------------ */

export type Approach = "arrives" | "deceptive" | "evaded" | "evaded2" | "abandoned";

/** A two-bar cadential approach (C, A, B) starting at `at`. */
function approach(p: Parts, at: number, vel = 0.85) {
  p.gtr.push(...place("C3/4 E3/4 A2/4 C3/4", at, 0, vel), ...place("B2/4 D#3/4 F#3/4 D#3/4", at + 4, 0, vel));
  p.bass.push(...place("C2/4 C2/4 A1/4 A1/4", at, 0, vel), ...place("B1/4 B1/4 B1/4 B1/4", at + 4, 0, vel));
  p.kit.push(...groove(1, "normal", "hat8", at, 0.8 * vel));
  p.kit.push(note(at + 4, S, [KICK], vel), note(at + 5, S, [SNARE], vel), note(at + 6, S, [KICK], vel));
  p.kit.push(...fill(at + 7, 8, 0.75 * vel / 0.85));
}

function arrival(p: Parts, at: number) {
  p.gtr.push(note(at, 4, [28, 35, 40], 1));
  p.bass.push(note(at, 4, [16], 1));
  p.kit.push(...hit(at));
}

export function buildApproach(a: Approach): Layer[] {
  const p = empty();
  // A continuation: the riff's head moved up, two bars, leading into the cadential approach.
  [0, 2, 3, 5].forEach((tr, i) => {
    p.gtr.push(...place(HEAD, i * 2, tr, 0.85));
    p.bass.push(note(i * 2, 2, [28 + tr], 0.8));
  });
  p.kit.push(...groove(2, "normal", "hat8", 0, 0.8));
  let at = 8;
  approach(p, at);
  at += 8;
  switch (a) {
    case "arrives":
      arrival(p, at);
      break;
    case "deceptive":
      // a full landing, on the wrong chord (C), then try again
      p.gtr.push(note(at, 3, [36, 43, 48], 1));
      p.bass.push(note(at, 3, [24], 1));
      p.kit.push(...hit(at), ...fill(at + 3, 8, 0.6));
      approach(p, at + 4);
      arrival(p, at + 12);
      break;
    case "evaded":
    case "evaded2": {
      // where the E should land, the approach starts again: the event groups forward, not back
      const times = a === "evaded" ? 1 : 2;
      for (let k = 0; k < times; k++) {
        p.kit.push(note(at, S, [CRASH], 0.35));
        approach(p, at, 0.85 + 0.05 * (k + 1));
        at += 8;
      }
      arrival(p, at);
      break;
    }
    case "abandoned": {
      // B slides upward in the bass (the dominant loses its root) and the music wanders off before a new approach
      p.bass.splice(p.bass.length - 2, 2, note(at - 2, 1, [37], 0.8), note(at - 1, 1, [38], 0.8));
      [3, 5, 7, 8].forEach((tr, i) => {
        p.gtr.push(...place(HEAD, at + i * 2, tr, 0.75));
        p.bass.push(note(at + i * 2, 2, [26 + tr], 0.7));
      });
      p.kit.push(...groove(2, "normal", "hat8", at, 0.7));
      approach(p, at + 8);
      arrival(p, at + 16);
      break;
    }
  }
  return toLayers(p);
}

const APPROACHES: { id: Approach; label: string; text: string }[] = [
  { id: "arrives", label: "Arrives", text: "The approach (C, A, B) lands on E. Closure on the first try." },
  {
    id: "deceptive",
    label: "Deceptive",
    text: "A full landing with a crash, on C instead of E. It is a goal, just the wrong one, so the approach runs again and lands properly.",
  },
  {
    id: "evaded",
    label: "Evaded, one more time",
    text: "At the moment E should land, the approach starts over instead. Nothing ends: the event at the arrival point belongs to the next attempt. Then it lands.",
  },
  {
    id: "evaded2",
    label: "Evaded twice",
    text: "Two evasions before the arrival, each attempt a little louder. The struggle makes the final landing feel earned.",
  },
  {
    id: "abandoned",
    label: "Abandoned",
    text: "The B in the bass slides up before it can resolve, and the music wanders off. Less dramatic than an evasion: the approach loses direction, then a new one begins.",
  },
];

export function ApproachLab() {
  const [a, setA] = useState<Approach>("evaded");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildApproach(a), [a]);
  const info = APPROACHES.find((x) => x.id === a)!;
  const key = `ap-${a}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Reaching the cadence</div>
      <p className="mb-4 text-sm text-muted-foreground">
        A short continuation, then an approach to the final E. Five ways the arrival can go.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {APPROACHES.map((x) => (
          <Chip key={x.id} on={a === x.id} onClick={() => setA(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}
