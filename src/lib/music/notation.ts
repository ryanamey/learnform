/**
 * Learn Form text notation
 * ------------------------
 * A tiny, typeable format for riffs, vocal lines and rhythm cells.
 *
 *   E3/8       E in octave 3, an eighth note
 *   F#4/16     sharps with #, flats with b (Bb3)
 *   A3/4.      dotted quarter
 *   G3/8t      eighth-note triplet
 *   E2/8!      accented note (louder, highlighted)
 *   r/8        eighth rest
 *   [E2,B2,E3]/4   a chord / power chord
 *   x/16       unpitched hit (muted/percussive)
 *   |          bar line (ignored for timing, used for display)
 *   "word"     attach a lyric syllable to the previous note: E4/8"love"
 *
 * Durations are stored in beats (quarter note = 1).
 */

export type NoteEvent = {
  /** start in beats from the beginning */
  start: number;
  /** length in beats */
  dur: number;
  /** MIDI numbers; empty array = rest; [-1] = unpitched hit */
  midi: number[];
  accent: boolean;
  /** optional explicit velocity 0–1 (overrides accent) */
  velocity?: number;
  lyric?: string;
  /** index of the token in the source string (for highlighting) */
  index: number;
};

export type Parsed = {
  events: NoteEvent[];
  /** beat positions of bar lines */
  bars: number[];
  totalBeats: number;
};

const NOTE_BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitchToMidi(p: string): number {
  const m = /^([A-Ga-g])([#b]{0,2})(-?\d)$/.exec(p.trim());
  if (!m) throw new Error(`Bad pitch "${p}"`);
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const octave = parseInt(m[3], 10);
  let n = NOTE_BASE[letter];
  for (const ch of acc) n += ch === "#" ? 1 : -1;
  return (octave + 1) * 12 + n;
}

const NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function midiToPitch(midi: number, preferFlats = true): string {
  const names = preferFlats ? NAMES_FLAT : NAMES_SHARP;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}

export function durationToBeats(d: string): number {
  const m = /^(\d+)(\.{0,2})(t?)$/.exec(d);
  if (!m) throw new Error(`Bad duration "${d}"`);
  const den = parseInt(m[1], 10);
  let beats = 4 / den;
  if (m[2] === ".") beats *= 1.5;
  if (m[2] === "..") beats *= 1.75;
  if (m[3] === "t") beats *= 2 / 3;
  return beats;
}

const TOKEN_RE = /\|+|"[^"]*"|\[[^\]]+\]\/[\w.]+!?|[^\s|"]+/g;

export function parseNotation(src: string): Parsed {
  const events: NoteEvent[] = [];
  const bars: number[] = [];
  let t = 0;
  let index = 0;
  const tokens = src.match(TOKEN_RE) ?? [];
  for (const raw of tokens) {
    if (raw.startsWith("|")) {
      if (t > 0) bars.push(t);
      continue;
    }
    if (raw.startsWith('"')) {
      const last = events[events.length - 1];
      if (last) last.lyric = raw.slice(1, -1);
      continue;
    }
    let tok = raw;
    let accent = false;
    if (tok.endsWith("!")) {
      accent = true;
      tok = tok.slice(0, -1);
    }
    const slash = tok.lastIndexOf("/");
    if (slash < 0) throw new Error(`Missing duration in "${raw}"`);
    const head = tok.slice(0, slash);
    const dur = durationToBeats(tok.slice(slash + 1));
    let midi: number[];
    if (head === "r") midi = [];
    else if (head === "x") midi = [-1];
    else if (head.startsWith("[")) {
      midi = head
        .slice(1, -1)
        .split(",")
        .map((p) => pitchToMidi(p));
    } else midi = [pitchToMidi(head)];
    events.push({ start: t, dur, midi, accent, index: index++ });
    t += dur;
  }
  return { events, bars, totalBeats: t };
}

/** Turn events back into notation (used by transformations). */
export function toNotation(events: NoteEvent[], barEvery?: number): string {
  const parts: string[] = [];
  let nextBar = barEvery;
  for (const e of events) {
    if (nextBar !== undefined && e.start >= nextBar - 1e-6) {
      parts.push("|");
      while (nextBar !== undefined && e.start >= nextBar - 1e-6) nextBar += barEvery!;
    }
    const head =
      e.midi.length === 0
        ? "r"
        : e.midi[0] === -1
          ? "x"
          : e.midi.length > 1
            ? `[${e.midi.map((m) => midiToPitch(m)).join(",")}]`
            : midiToPitch(e.midi[0]);
    parts.push(`${head}/${beatsToDuration(e.dur)}${e.accent ? "!" : ""}${e.lyric ? `"${e.lyric}"` : ""}`);
  }
  return parts.join(" ");
}

export function beatsToDuration(b: number): string {
  const table: [number, string][] = [
    [4, "1"],
    [3, "2."],
    [2, "2"],
    [1.5, "4."],
    [1, "4"],
    [0.75, "8."],
    [2 / 3, "4t"],
    [0.5, "8"],
    [0.375, "16."],
    [1 / 3, "8t"],
    [0.25, "16"],
    [1 / 6, "16t"],
    [0.125, "32"],
  ];
  for (const [beats, s] of table) if (Math.abs(beats - b) < 1e-6) return s;
  // fall back: express as the closest sixteenth multiple using ties is out of scope
  let best = table[0];
  for (const row of table) if (Math.abs(row[0] - b) < Math.abs(best[0] - b)) best = row;
  return best[1];
}
