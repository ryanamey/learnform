/**
 * Motif transformations (Schoenberg ch. III, Belkin ch. 1).
 * Each takes a list of events and returns a new list; nothing mutates.
 */
import type { NoteEvent } from "./notation";

const clone = (e: NoteEvent): NoteEvent => ({ ...e, midi: [...e.midi] });

function reflow(events: NoteEvent[]): NoteEvent[] {
  let t = 0;
  return events.map((e, index) => {
    const out = { ...clone(e), start: t, index };
    t += e.dur;
    return out;
  });
}

const pitched = (e: NoteEvent) => e.midi.length > 0 && e.midi[0] !== -1;

export function transpose(events: NoteEvent[], semitones: number): NoteEvent[] {
  return events.map((e) => (pitched(e) ? { ...clone(e), midi: e.midi.map((m) => m + semitones) } : clone(e)));
}

/** Mirror pitches around the first pitched note. */
export function invert(events: NoteEvent[]): NoteEvent[] {
  const axis = events.find(pitched)?.midi[0] ?? 60;
  return events.map((e) => (pitched(e) ? { ...clone(e), midi: e.midi.map((m) => axis - (m - axis)) } : clone(e)));
}

/** Notes in reverse order (rhythm reversed too). */
export function retrograde(events: NoteEvent[]): NoteEvent[] {
  return reflow([...events].reverse());
}

/** Keep the rhythm, play the pitches backwards. */
export function retrogradePitchOnly(events: NoteEvent[]): NoteEvent[] {
  const pitches = events.filter(pitched).map((e) => e.midi).reverse();
  let i = 0;
  return events.map((e) => (pitched(e) ? { ...clone(e), midi: [...pitches[i++]] } : clone(e)));
}

export function scaleTime(events: NoteEvent[], factor: number): NoteEvent[] {
  return reflow(events.map((e) => ({ ...clone(e), dur: e.dur * factor })));
}

export const augment = (ev: NoteEvent[]) => scaleTime(ev, 2);
export const diminish = (ev: NoteEvent[]) => scaleTime(ev, 0.5);

/** First n notes only. */
export function fragment(events: NoteEvent[], n: number): NoteEvent[] {
  return reflow(events.slice(0, n));
}

/** Last n notes only. */
export function tail(events: NoteEvent[], n: number): NoteEvent[] {
  return reflow(events.slice(-n));
}

export function concat(...parts: NoteEvent[][]): NoteEvent[] {
  return reflow(parts.flat());
}

export function repeat(events: NoteEvent[], times: number): NoteEvent[] {
  return concat(...Array.from({ length: times }, () => events));
}

/** Push everything later by a rest (metric displacement). */
export function displace(events: NoteEvent[], beats: number): NoteEvent[] {
  const rest: NoteEvent = { start: 0, dur: beats, midi: [], accent: false, index: 0 };
  return reflow([rest, ...events]);
}

/** Replace the pitch content with a repeated single note (keeps rhythm = "rhythmic cell"). */
export function flatten(events: NoteEvent[], midi?: number): NoteEvent[] {
  const p = midi ?? events.find(pitched)?.midi[0] ?? 52;
  return events.map((e) => (pitched(e) ? { ...clone(e), midi: [p] } : clone(e)));
}

/** Stretch every interval from the first note by a factor (widen/narrow leaps). */
export function scaleIntervals(events: NoteEvent[], factor: number): NoteEvent[] {
  const axis = events.find(pitched)?.midi[0] ?? 60;
  return events.map((e) =>
    pitched(e) ? { ...clone(e), midi: e.midi.map((m) => Math.round(axis + (m - axis) * factor)) } : clone(e)
  );
}

/** Make every note the same length (destroys the rhythmic profile). */
export function evenRhythm(events: NoteEvent[], dur = 0.5): NoteEvent[] {
  return reflow(events.filter((e) => e.midi.length > 0).map((e) => ({ ...clone(e), dur })));
}

/** Move accents to different notes. */
export function setAccents(events: NoteEvent[], accented: number[]): NoteEvent[] {
  return events.map((e, i) => ({ ...clone(e), accent: accented.includes(i) }));
}

export function totalBeats(events: NoteEvent[]): number {
  const last = events[events.length - 1];
  return last ? last.start + last.dur : 0;
}
