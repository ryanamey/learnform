/**
 * Helpers for building multi-layer examples (drums, riffs) in code.
 * Times are in beats (quarter note = 1). A "step" is a sixteenth (0.25 beat).
 */
import type { NoteEvent } from "./notation";

export const KICK = 36;
export const SNARE = 50;
export const CRASH = 57;
export const HAT = 66;

export const S = 0.25; // one sixteenth in beats

export function note(start: number, dur: number, midi: number[], velocity?: number, accent = false): NoteEvent {
  return { start, dur, midi, accent, velocity, index: 0 };
}

/** Assign sequential indices (needed for highlighting) and sort by time. */
export function finalize(events: NoteEvent[]): NoteEvent[] {
  return events
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((e, index) => ({ ...e, index }));
}

export function lcm(a: number, b: number): number {
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
  return (a * b) / g(a, b);
}

export type Feel = "normal" | "half" | "double" | "quarter";
export type Cymbal = "hat8" | "hat16" | "crash4" | "none";

/**
 * A 4/4 drum groove for `bars` bars in a given time feel (Garza 2021):
 * normal = snare on 2 & 4; half = snare on 3; double = snare on every off-beat "&";
 * quarter = kick on bar 1, snare on bar 2's downbeat (one alternation per bar).
 */
export function groove(bars: number, feel: Feel, cymbal: Cymbal = "hat8", startBeat = 0, vel = 0.85): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (let b = 0; b < bars; b++) {
    const t = startBeat + b * 4;
    if (feel === "normal") {
      out.push(note(t, S, [KICK], vel), note(t + 1, S, [SNARE], vel), note(t + 2, S, [KICK], vel), note(t + 2.5, S, [KICK], vel * 0.8), note(t + 3, S, [SNARE], vel));
    } else if (feel === "half") {
      out.push(note(t, S, [KICK], vel), note(t + 2, S, [SNARE], vel), note(t + 3.5, S, [KICK], vel * 0.8));
    } else if (feel === "double") {
      for (let i = 0; i < 4; i++) out.push(note(t + i, S, [KICK], vel), note(t + i + 0.5, S, [SNARE], vel));
    } else {
      if (b % 2 === 0) out.push(note(t, S, [KICK], vel));
      else out.push(note(t, S, [SNARE], vel));
    }
    if (cymbal === "hat8") for (let i = 0; i < 8; i++) out.push(note(t + i * 0.5, S, [HAT], i % 2 ? 0.45 : 0.7));
    if (cymbal === "hat16") for (let i = 0; i < 16; i++) out.push(note(t + i * S, S, [HAT], i % 4 ? 0.35 : 0.7));
    if (cymbal === "crash4") for (let i = 0; i < 4; i++) out.push(note(t + i, S, [CRASH], 0.55));
  }
  return out;
}

/** Split a length (in steps) into groups of 2s and 3s, threes first (e.g. 7 → 3+2+2). */
export function twosAndThrees(len: number): number[] {
  const out: number[] = [];
  let rest = len;
  while (rest > 0) {
    if (rest === 2 || rest === 4) {
      out.push(2);
      rest -= 2;
    } else if (rest === 1) {
      out.push(1);
      rest -= 1;
    } else {
      out.push(3);
      rest -= 3;
    }
  }
  return out;
}
