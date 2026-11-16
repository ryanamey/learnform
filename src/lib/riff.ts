/**
 * Riff board analysis: counts, grouping, timing windows, cycles and harmony for one riff
 * written in Learn Form notation. Pure functions; the UI lives in src/app/(app)/riffs.
 *
 * Sources: Prieto (number strings, dots and lines, four speeds, cycles), London (timing windows),
 * Lilja (dyads as chords, bass as root, vertical consonances, modal labels, strong/weak functions),
 * Moore and Stephenson (tonic by persistence, laterality, emphasis; harmonic palettes),
 * Pieslak (attack-point strings), Sriram (entry offset), Smolko (a motive across meters).
 */
import { z } from "zod";

import { parseNotation, type NoteEvent } from "@/lib/music/notation";

/* ------------------------------------------------------------------ board data */

export const GAINS = ["clean", "crunch", "drive", "high"] as const;
export const ENTRY_KINDS = ["sama", "anaagatha", "atheetha"] as const;

export const ENTRY_LABEL: Record<(typeof ENTRY_KINDS)[number], string> = {
  sama: "On beat 1",
  anaagatha: "After beat 1 (leaves a gap)",
  atheetha: "Before beat 1 (pickup)",
};

export const boardSchema = z.object({
  meter: z.string().max(24).default(""),
  grouping: z.string().max(120).default(""),
  refUnits: z.number().int().min(2).max(256).nullable().default(null),
  otherLoop: z.number().int().min(2).max(512).nullable().default(null),
  tonic: z.number().int().min(0).max(11).nullable().default(null),
  mode: z.string().max(12).default(""),
  vocalMode: z.string().max(12).default(""),
  gain: z.enum(GAINS).default("drive"),
  entry: z
    .object({ kind: z.enum(ENTRY_KINDS).default("sama"), units: z.number().int().min(0).max(64).default(0) })
    .default({ kind: "sama", units: 0 }),
  motto: z.boolean().default(false),
  mottoNote: z.string().max(300).default(""),
  usedIn: z.string().max(300).default(""),
  notes: z.string().max(4000).default(""),
});

export type Board = z.infer<typeof boardSchema>;

export function readBoard(raw: unknown): Board {
  const r = boardSchema.safeParse(raw ?? {});
  return r.success ? r.data : boardSchema.parse({});
}

/* ------------------------------------------------------------------ arithmetic */

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export const lcm = (a: number, b: number) => (a && b ? (a / gcd(a, b)) * b : 0);

const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-6;

/* ------------------------------------------------------------------ grid and attacks */

/** Grid units per quarter note, in order of preference. */
const GRIDS = [1, 2, 4, 3, 6, 8, 12, 16, 24] as const;

export const UNIT_NAME: Record<number, string> = {
  1: "quarter",
  2: "eighth",
  3: "eighth-triplet",
  4: "sixteenth",
  6: "sixteenth-triplet",
  8: "thirty-second",
  12: "32nd-triplet",
  16: "64th",
  24: "64th-triplet",
};
const UNIT_TOKEN: Record<number, string> = { 1: "4", 2: "8", 3: "8t", 4: "16", 6: "16t", 8: "32", 12: "32t", 16: "64" };

export type Rhythm = {
  /** grid units per quarter note */
  perBeat: number;
  /** cycle length in units */
  total: number;
  /** onset of each attack, in units */
  onsets: number[];
  /** attack-point intervals (the last one wraps to the end of the cycle) */
  iois: number[];
  /** units that carry an accent */
  accents: number[];
};

export function readRhythm(events: NoteEvent[], totalBeats: number): Rhythm | null {
  if (!events.length || totalBeats <= 0) return null;
  const perBeat =
    GRIDS.find((g) => near(totalBeats * g) && events.every((e) => near(e.start * g) && near(e.dur * g))) ?? null;
  if (!perBeat) return null;
  const attacks = events.filter((e) => e.midi.length > 0);
  if (!attacks.length) return null;
  const total = Math.round(totalBeats * perBeat);
  const onsets = attacks.map((e) => Math.round(e.start * perBeat));
  const iois = onsets.map((o, i) => (i + 1 < onsets.length ? onsets[i + 1] : total + onsets[0]) - o);
  const accents = attacks.filter((e) => e.accent).map((e) => Math.round(e.start * perBeat));
  return { perBeat, total, onsets, iois, accents };
}

/* ------------------------------------------------------------------ grouping (2s and 3s) */

export function parseGrouping(s: string): number[] | null {
  const parts = s
    .replace(/[,\s]+/g, "-")
    .split(/[-+]+/)
    .filter(Boolean)
    .map(Number);
  if (!parts.length || parts.some((n) => !Number.isInteger(n) || n < 1 || n > 32)) return null;
  return parts;
}

/** Split a long group into 2s and 3s, as even as possible, long beats last. */
export function splitEven(n: number): number[] {
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  const threes = n % 2 === 0 ? (n % 4 === 0 ? 0 : 2) : 1;
  const twos = (n - threes * 3) / 2;
  return [...Array(twos).fill(2), ...Array(threes).fill(3)];
}

/** A first guess at the riff's grouping: accents start groups (else every attack); 1s merge into neighbours. */
export function suggestGrouping(r: Rhythm): number[] {
  const byAccent = r.accents.length >= 2 ? spans(r.accents, r.total) : null;
  // accents only lead when they make beat-sized groups; otherwise every attack starts a group
  const raw = byAccent && Math.max(...byAccent) <= 6 ? byAccent : spans(r.onsets, r.total);
  return raw.flatMap(splitEven);
}

function spans(points: number[], total: number): number[] {
  const starts = points.slice().sort((a, b) => a - b);
  const first = starts[0];
  const lens = starts.map((s, i) => (i + 1 < starts.length ? starts[i + 1] : total + first) - s);
  const merged: number[] = [];
  for (const l of lens) {
    if (l === 1 && merged.length) merged[merged.length - 1] += 1;
    else merged.push(l);
  }
  if (merged[0] === 1 && merged.length > 1) merged.splice(0, 2, 1 + merged[1]);
  return merged;
}

export const groupingText = (g: number[]) => g.join("-");
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Distinct reorderings of the same numbers (capped), the original first. */
export function reorderings(g: number[], cap = 12): number[][] {
  const out: number[][] = [];
  const seen = new Set<string>();
  const counts = new Map<number, number>();
  g.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
  const keys = [...counts.keys()].sort((a, b) => a - b);
  const cur: number[] = [];
  const rec = () => {
    if (out.length >= cap * 4) return;
    if (cur.length === g.length) {
      const k = cur.join("-");
      if (!seen.has(k)) {
        seen.add(k);
        out.push([...cur]);
      }
      return;
    }
    for (const k of keys) {
      const c = counts.get(k)!;
      if (!c) continue;
      counts.set(k, c - 1);
      cur.push(k);
      rec();
      cur.pop();
      counts.set(k, c);
    }
  };
  rec();
  const self = groupingText(g);
  const rest = out.filter((o) => groupingText(o) !== self);
  return [g, ...rest].slice(0, cap);
}

export function isRotation(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const s = `-${[...a, ...a].join("-")}-`;
  return s.includes(`-${b.join("-")}-`);
}

export function isPalindrome(g: number[]): boolean {
  return groupingText(g) === groupingText([...g].reverse());
}

/** A click-track version of a grouping (first unit of each group accented). */
export function groupingNotation(g: number[], perBeat: number): string | null {
  const tok = UNIT_TOKEN[perBeat];
  if (!tok) return null;
  return g.map((n) => [`x/${tok}!`, ...Array(n - 1).fill(`x/${tok}`)].join(" ")).join(" | ");
}

/* ------------------------------------------------------------------ meter */

export type Meter = { units: number; beats: number[] } | null;

/** "7/8", "2+2+3/8", "4/4" → bar length in grid units and the beat lengths. */
export function readMeter(meter: string, perBeat: number): Meter {
  const m = meter.replace(/\s/g, "").match(/^([\d+]+)\/(\d+)$/);
  if (!m) return null;
  const den = Number(m[2]);
  if (![1, 2, 4, 8, 16, 32].includes(den)) return null;
  const parts = m[1].split("+").map(Number);
  if (parts.some((p) => !Number.isInteger(p) || p <= 0)) return null;
  const perNote = (perBeat * 4) / den;
  if (!near(perNote)) return null;
  const n = parts.reduce((a, b) => a + b, 0);
  let beatNotes: number[];
  if (parts.length > 1) beatNotes = parts;
  else if (den >= 8 && n % 3 === 0 && n > 3) beatNotes = Array(n / 3).fill(3);
  else if (den >= 8 && n > 4) beatNotes = splitEven(n);
  else beatNotes = Array(n).fill(1);
  return { units: n * perNote, beats: beatNotes.map((b) => Math.round(b * perNote)) };
}

/** Where the grouping's boundaries fall against the meter's beats, over enough bars to come round. */
export function counterMeter(g: number[], meter: Meter) {
  if (!meter) return null;
  const cell = sum(g);
  const span = lcm(cell, meter.units);
  const beatStarts = new Set<number>();
  for (let b = 0, t = 0; t < span; b++) {
    beatStarts.add(t);
    t += meter.beats[b % meter.beats.length];
  }
  const groupStarts: number[] = [];
  for (let t = 0, i = 0; t < span; i++) {
    groupStarts.push(t);
    t += g[i % g.length];
  }
  const off = groupStarts.filter((t) => !beatStarts.has(t)).length;
  return {
    cell,
    bar: meter.units,
    span,
    cellsToRealign: span / cell,
    barsToRealign: span / meter.units,
    groupsOffBeat: off,
    groupsTotal: groupStarts.length,
  };
}

/* ------------------------------------------------------------------ dots and lines */

export type Column = { glyphs: (2 | 3 | number)[]; crosses: boolean };

/** Lay a grouping into columns of a reference length (Prieto's dots-and-lines chart). */
export function dotsAndLines(g: number[], ref: number, maxCols = 8): Column[] {
  const cell = sum(g);
  const span = Math.min(lcm(cell, ref), ref * maxCols);
  const cols: Column[] = [];
  let t = 0;
  let i = 0;
  let col: Column = { glyphs: [], crosses: false };
  while (t < span) {
    const n = g[i % g.length];
    const colEnd = (cols.length + 1) * ref;
    col.glyphs.push(n);
    if (t + n > colEnd) col.crosses = true;
    t += n;
    i++;
    if (t >= colEnd) {
      cols.push(col);
      col = { glyphs: [], crosses: false };
    }
  }
  if (col.glyphs.length) cols.push(col);
  return cols;
}

/* ------------------------------------------------------------------ timing windows (London) */

export type TimingRow = { label: string; ms: number; note: string; level: "ok" | "warn" | "info" };

export function timingWindows(perBeat: number, bpm: number, g: number[], total: number): TimingRow[] {
  const unit = 60000 / bpm / perBeat;
  const rows: TimingRow[] = [];
  rows.push({
    label: `Pulse (one ${UNIT_NAME[perBeat] ?? "unit"})`,
    ms: unit,
    level: unit < 100 ? "warn" : "ok",
    note:
      unit < 100
        ? "Under London's 100 ms floor: the pulse blurs into a trill or texture."
        : unit > 250
          ? "Over 250 ms: each pulse is felt as a duration of its own."
          : "Countable pulse.",
  });
  const lengths = [...new Set(g)].sort((a, b) => a - b);
  for (const n of lengths) {
    const ms = unit * n;
    let note = "";
    let level: TimingRow["level"] = "ok";
    if (ms < 200) {
      note = "Under 200 ms: too short to be a beat; heard as part of a quicker figure.";
      level = "warn";
    } else if (ms > 2000) {
      note = "Over 2 s: heard as a bar or a span, not a beat.";
      level = "warn";
    } else if (Math.abs(ms - 600) < 120) note = "Close to the ~600 ms beat listeners prefer.";
    else note = "Inside the beat window (about 200 ms to 2 s).";
    rows.push({ label: `Group of ${n}`, ms, note, level });
  }
  if (lengths.length > 1 && unit * Math.max(...lengths) > 0) {
    const shortMs = unit * lengths[0];
    if (unit < 150 && lengths.includes(2) && lengths.includes(3))
      rows.push({
        label: "2 vs 3",
        ms: shortMs,
        level: "info",
        note: "Fast pulse: a 3 next to a 2 can start to sound like one swung beat (London).",
      });
  }
  const cycleMs = unit * total;
  rows.push({
    label: "Whole riff cycle",
    ms: cycleMs,
    level: cycleMs > 6000 ? "warn" : "ok",
    note:
      cycleMs > 6000
        ? "Over the 5–6 s ceiling: not felt as one unit; listeners count or remember it instead."
        : cycleMs > 5000
          ? "At the 5–6 s ceiling for a felt cycle."
          : "Short enough to be felt as one cycle.",
  });
  return rows;
}

/** One cell at four speeds against a quarter-note pulse (Prieto). */
export function fourSpeeds(cell: number, bpm: number) {
  const q = 60000 / bpm;
  return [
    { sub: "quarter notes", per: 1 },
    { sub: "eighth notes", per: 2 },
    { sub: "eighth-note triplets", per: 3 },
    { sub: "sixteenth notes", per: 4 },
  ].map((s) => ({ ...s, cellMs: (cell * q) / s.per, timesInBar: s.per, barBeats: cell }));
}

/** Pulses that divide the cycle evenly: the pattern stays, the pulse under it changes. */
export function pulseOptions(total: number) {
  const out: { size: number; count: number }[] = [];
  for (let d = 2; d <= total / 2; d++) if (total % d === 0) out.push({ size: d, count: total / d });
  return out;
}

/* ------------------------------------------------------------------ harmony */

const PC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const pcName = (pc: number) => PC[((pc % 12) + 12) % 12];

export type Shape =
  | "single"
  | "octave"
  | "power"
  | "fourth"
  | "minor-sixth dyad"
  | "major-sixth dyad"
  | "third dyad"
  | "tritone"
  | "major"
  | "minor"
  | "dominant 7th"
  | "7♯9"
  | "quartal"
  | "other";

export type GainVerdict = "clear" | "depends" | "rough";

export const SHAPE_NOTE: Record<Shape, { verdict: GainVerdict; note: string }> = {
  single: { verdict: "clear", note: "Clearest under any gain." },
  octave: { verdict: "clear", note: "Clear: one harmonic series." },
  power: { verdict: "clear", note: "Clearest chord under gain; distortion adds a virtual major third and minor seventh (Lilja)." },
  fourth: { verdict: "depends", note: "Clear if heard as an inverted power chord (top note is the root); a suspension if it wants to fall to a third." },
  "minor-sixth dyad": { verdict: "rough", note: "A vertical dissonance under gain; works as a neighbour or passing chord between power chords." },
  "major-sixth dyad": { verdict: "depends", note: "Rock 'n' roll boogie shape; rougher than a fifth under heavy gain." },
  "third dyad": { verdict: "depends", note: "Fine clean or at mild gain; the played third beats against the distortion's own third." },
  tritone: { verdict: "rough", note: "Deliberately harsh; the classic thrash colour." },
  major: { verdict: "depends", note: "A vertical consonance, but the played third beats against the generated one at high gain." },
  minor: { verdict: "rough", note: "Turns muddy under gain: combination tones from three harmonic series hide the root." },
  "dominant 7th": { verdict: "depends", note: "A vertical consonance in Lilja's sense, but the roughest of them." },
  "7♯9": { verdict: "rough", note: "Works as a tonic colour (Hendrix); hard to tell from a minor chord under gain." },
  quartal: { verdict: "rough", note: "Iommi's stacked fourths: very rough; the bass note decides the chord." },
  other: { verdict: "rough", note: "Complex structure: keep it clean, or use the roughness on purpose." },
};

export function chordShape(midi: number[]): Shape {
  const pitched = midi.filter((m) => m >= 0);
  if (!pitched.length) return "single";
  const root = Math.min(...pitched);
  const rel = [...new Set(pitched.map((m) => (((m - root) % 12) + 12) % 12))].sort((a, b) => a - b);
  const key = rel.join(",");
  if (pitched.length === 1) return "single";
  if (key === "0") return "octave";
  const table: Record<string, Shape> = {
    "0,7": "power",
    "0,5": "fourth",
    "0,8": "minor-sixth dyad",
    "0,9": "major-sixth dyad",
    "0,3": "third dyad",
    "0,4": "third dyad",
    "0,6": "tritone",
    "0,4,7": "major",
    "0,3,7": "minor",
    "0,4,7,10": "dominant 7th",
    "0,4,10": "dominant 7th",
    "0,7,10": "dominant 7th",
    "0,3,4,10": "7♯9",
    "0,3,4,7,10": "7♯9",
    "0,5,10": "quartal",
    "0,3,5,10": "quartal",
  };
  return table[key] ?? "other";
}

export type Chord = { start: number; dur: number; root: number; midi: number[]; shape: Shape; accent: boolean };

export function readChords(events: NoteEvent[], perBeat: number): Chord[] {
  return events
    .filter((e) => e.midi.length && e.midi[0] >= 0)
    .map((e) => ({
      start: Math.round(e.start * perBeat),
      dur: Math.round(e.dur * perBeat),
      root: Math.min(...e.midi),
      midi: e.midi,
      shape: chordShape(e.midi),
      accent: e.accent,
    }));
}

/* tonic finder (Moore: persistence, laterality, emphasis; Stephenson: the initiating chord; Lilja: bass as root) */

export type TonicCandidate = {
  pc: number;
  score: number;
  persistence: number;
  first: boolean;
  last: boolean;
  emphasis: number;
};

export function findTonic(chords: Chord[], meter: Meter): TonicCandidate[] {
  if (!chords.length) return [];
  const total = sum(chords.map((c) => c.dur)) || 1;
  const beatStarts = new Set<number>();
  if (meter) {
    for (let t = 0, b = 0; t < 4096; b++) {
      beatStarts.add(t);
      t += meter.beats[b % meter.beats.length];
    }
  }
  const barStarts = meter ? (t: number) => t % meter.units === 0 : (t: number) => t === 0;
  const by = new Map<number, TonicCandidate>();
  const get = (pc: number) => {
    if (!by.has(pc)) by.set(pc, { pc, score: 0, persistence: 0, first: false, last: false, emphasis: 0 });
    return by.get(pc)!;
  };
  chords.forEach((c, i) => {
    const t = get(c.root % 12);
    t.persistence += c.dur / total;
    if (i === 0) t.first = true;
    if (i === chords.length - 1) t.last = true;
    let e = 0;
    if (c.accent) e += 1;
    if (barStarts(c.start)) e += 1.5;
    else if (beatStarts.has(c.start)) e += 0.5;
    t.emphasis += e;
  });
  const maxE = Math.max(1, ...[...by.values()].map((t) => t.emphasis));
  for (const t of by.values())
    t.score = t.persistence * 0.5 + (t.first ? 0.2 : 0) + (t.last ? 0.1 : 0) + (t.emphasis / maxE) * 0.2;
  return [...by.values()].sort((a, b) => b.score - a.score);
}

/* modes */

export const MODES: { id: string; name: string; steps: number[] }[] = [
  { id: "aeo", name: "Aeolian", steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: "dor", name: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phr", name: "Phrygian", steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: "mix", name: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: "ion", name: "Ionian", steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "loc", name: "Locrian", steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: "lyd", name: "Lydian", steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: "hm", name: "Harmonic minor", steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: "hij", name: "Hijaz (Phrygian dominant)", steps: [0, 1, 4, 5, 7, 8, 10] },
  { id: "hum", name: "Hungarian minor", steps: [0, 2, 3, 6, 7, 8, 11] },
  { id: "mm", name: "Melodic minor", steps: [0, 2, 3, 5, 7, 9, 11] },
];
export const modeById = Object.fromEntries(MODES.map((m) => [m.id, m]));

/** Modes that contain every pitch class used, best first; else the closest with the notes outside it. */
export function fitModes(pcsRel: number[]) {
  const set = [...new Set(pcsRel.map((p) => ((p % 12) + 12) % 12))];
  const scored = MODES.map((m) => ({ mode: m, outside: set.filter((p) => !m.steps.includes(p)) }));
  const fits = scored.filter((s) => s.outside.length === 0).map((s) => s.mode);
  const closest = [...scored].sort((a, b) => a.outside.length - b.outside.length)[0];
  return { fits, closest };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const BORROW_ORDER = ["dor", "phr", "aeo", "mix", "ion", "loc", "lyd", "hm"];

/** Degree label in the mode (Moore/Lilja): plain numeral if diatonic, mode prefix if borrowed. */
export function degreeLabel(rel: number, mode: string): string {
  const m = modeById[mode] ?? modeById.aeo;
  const i = m.steps.indexOf(rel);
  if (i >= 0) return ROMAN[i];
  for (const id of BORROW_ORDER) {
    const j = modeById[id].steps.indexOf(rel);
    if (j >= 0) return `${id}${ROMAN[j]}`;
  }
  return rel === 6 ? "♭V" : `?${rel}`;
}

export type Fn = "T" | "t" | "S" | "s" | "D" | "d" | "pass";

export const FN_LABEL: Record<Fn, string> = {
  T: "Tonic",
  t: "weak Tonic",
  S: "strong Subdominant",
  s: "weak Subdominant",
  D: "strong Dominant",
  d: "weak Dominant",
  pass: "passing (no clear function)",
};

/** Lilja's table of strong and weak functions (ch. 3.4), read from the root and the chord shape. */
export function functionOf(rel: number, shape: Shape): Fn {
  switch (rel) {
    case 0:
      return "T";
    case 3:
    case 4:
      return "t";
    case 5:
      return shape === "major" ? "s" : "S";
    case 8:
      return "S";
    case 9:
      return "s";
    case 1:
      return "S";
    case 7:
      return shape === "minor" ? "d" : "D";
    case 11:
      return "D";
    case 10:
      return "d";
    default:
      return "pass";
  }
}

export type HarmonyRow = Chord & { rel: number; degree: string; fn: Fn };

export function harmony(chords: Chord[], tonic: number, mode: string): HarmonyRow[] {
  return chords.map((c) => {
    const rel = (((c.root - tonic) % 12) + 12) % 12;
    return { ...c, rel, degree: degreeLabel(rel, mode), fn: functionOf(rel, c.shape) };
  });
}

/** How the riff gets home: the last root change into the tonic (wrapping round, since riffs loop). */
export function cadence(rows: HarmonyRow[]) {
  if (!rows.length) return null;
  const roots: HarmonyRow[] = [];
  for (const r of rows) if (!roots.length || roots[roots.length - 1].rel !== r.rel) roots.push(r);
  const closesHome = rows[rows.length - 1].rel === 0;
  if (roots.length < 2) return { kind: "static" as const, closesHome, before: null };
  const seq = [...roots, roots[0]];
  let before: HarmonyRow | null = null;
  for (let i = seq.length - 1; i > 0; i--) {
    if (seq[i].rel === 0 && seq[i - 1].rel !== 0) {
      before = seq[i - 1];
      break;
    }
  }
  if (!before) return { kind: "none" as const, closesHome, before: null };
  const kind =
    before.fn === "S" || before.fn === "s"
      ? ("plagal" as const)
      : before.fn === "D"
        ? ("authentic" as const)
        : before.fn === "d"
          ? ("weak-dominant" as const)
          : ("chromatic" as const);
  return { kind, closesHome, before };
}

export const CADENCE_TEXT = {
  static: "One root throughout: a drone or pedal riff.",
  none: "The riff never reaches the tonic root.",
  plagal: "Plagal: the Subdominant leads home (Lilja's default for metal).",
  authentic: "Authentic: a strong Dominant leads home.",
  "weak-dominant": "A weak Dominant (♭VII or minor v) leads home: the Aeolian cadence, closer to plagal than authentic (Lilja).",
  chromatic: "A passing or chromatic chord leads home (II, ♭V): a slide rather than a cadence.",
} as const;

/** Stephenson's harmonic palettes, read from the pitch classes against the tonic. */
export function palette(pcsRel: number[]): string {
  const s = new Set(pcsRel);
  if (s.has(4) && !s.has(3)) return s.has(10) ? "Major / Mixolydian" : "Major";
  if (s.has(3) || s.has(8) || s.has(10)) {
    if (s.has(1) || s.has(6)) return "Chromatic minor";
    return "Natural minor";
  }
  return "Open (no third or sixth: power-chord palette)";
}

/** Riff mode vs vocal mode: which degrees disagree (a planned clash, as in "War Pigs"). */
export function modeClash(a: string, b: string) {
  const ma = modeById[a];
  const mb = modeById[b];
  if (!ma || !mb) return null;
  const names = ["1", "2", "3", "4", "5", "6", "7"];
  const diffs: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = ma.steps[i];
    const y = mb.steps[i];
    if (x !== y) diffs.push(`${names[i]} (riff ${x < y ? "♭" : "♮"}${names[i]}, voice ${y < x ? "♭" : "♮"}${names[i]})`);
  }
  return diffs;
}

/* ------------------------------------------------------------------ matching across riffs (Pieslak, Smolko) */

export type RiffShape = { iois: number[]; intervals: number[] };

/** Rhythm as attack-point intervals in beats, pitch as intervals between successive roots. */
export function riffShape(notation: string): RiffShape | null {
  try {
    const p = parseNotation(notation);
    const at = p.events.filter((e) => e.midi.length > 0);
    if (at.length < 2) return null;
    const iois = at.map((e, i) => Math.round(((i + 1 < at.length ? at[i + 1].start : p.totalBeats + at[0].start) - e.start) * 24));
    const roots = at.filter((e) => e.midi[0] >= 0).map((e) => Math.min(...e.midi));
    const intervals = roots.slice(1).map((r, i) => r - roots[i]);
    return { iois, intervals };
  } catch {
    return null;
  }
}

/** Longest run that two sequences share (contiguous). */
export function longestShared(a: number[], b: number[]): number {
  let best = 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = tmp;
    }
  }
  return best;
}

export function compareShapes(a: RiffShape, b: RiffShape) {
  // an even stream of notes matches every other even stream: only count rhythms with some variety
  const even = (x: number[]) => new Set(x).size < 2;
  const rhythm = even(a.iois) || even(b.iois) ? 0 : longestShared(a.iois, b.iois);
  return { rhythm, pitch: longestShared(a.intervals, b.intervals) };
}
