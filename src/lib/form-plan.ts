/**
 * Form planner: the data model, timing, the weighted tension score and the design checks.
 * Pure functions only, so it can be tested without the UI.
 *
 * Sources behind the numbers:
 * - Lever weights 3-3-2-2-1 and "meter alone doesn't build": Farbood 2012 (page: Building tension).
 * - Ladder (hook repetitions, highest note, guitar technique, cymbal): Osborn 2010/2013 (page: Where the climax goes).
 * - Vocal timbre scales: Heidemann 2016 (page: Vocal timbre).
 * - Chart letters, primes, section-group numerals and focal parameter: Osborn 2011 (page: Form design).
 * - Two sets of landmarks (formal dissonance): Pieslak 2007 (page: Dissonance as form).
 * - Thick and thin meter: London 2012 ch. 6 (page: Kinds of time).
 */
import { z } from "zod";

/* ---------------- vocabulary ---------------- */

export const JOBS = [
  "present",
  "establish",
  "build",
  "cue",
  "arrive",
  "release",
  "contrast",
  "transition",
  "close",
] as const;
export type Job = (typeof JOBS)[number];

export const JOB_HELP: Record<Job, string> = {
  present: "introduce material",
  establish: "let the listener learn it",
  build: "raise tension toward an arrival",
  cue: "signal that something is coming (a gate, a stop, a fill)",
  arrive: "the goal of a build",
  release: "let tension go after an arrival",
  contrast: "something different, to make a return mean something",
  transition: "move between two sections",
  close: "end, or make the ending audible",
};

export const LEVERS = ["loudness", "register", "density", "tempo", "harmony"] as const;
export type Lever = (typeof LEVERS)[number];
/** Farbood's weights. */
export const LEVER_WEIGHT: Record<Lever, number> = { loudness: 3, register: 3, density: 2, tempo: 2, harmony: 1 };
export const LEVER_HELP: Record<Lever, string> = {
  loudness: "dynamics, gain, number of players",
  register: "how high the lead voice or guitar sits",
  density: "notes per second: subdivisions, cymbal rate, riff busyness",
  tempo: "actual or felt tempo (half-time, double-time)",
  harmony: "chord tension, distance from home",
};

export const GUITAR_RUNGS = ["silent", "clean", "palm-muted", "open chords", "overdrive", "full wall"] as const;
export const CYMBAL_RUNGS = ["none", "closed hi-hat", "open hi-hat", "ride", "crash", "crash wash"] as const;

export const TIMBRE_SCALES = [
  { key: "breathy", low: "breathy", high: "clear" },
  { key: "rough", low: "regular", high: "rough" },
  { key: "open", low: "constricted", high: "open" },
  { key: "chest", low: "face", high: "chest" },
  { key: "anchored", low: "relaxed", high: "anchored" },
] as const;
export type TimbreKey = (typeof TIMBRE_SCALES)[number]["key"];

export const FOCAL = ["", "melody", "rhythm", "timbre", "harmony", "texture", "words"] as const;

/* ---------------- schema ---------------- */

const level = z.number().int().min(0).max(10);
const bipolar = z.number().int().min(-2).max(2);

export const sectionSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().max(60).default(""),
  letter: z.string().max(12).default(""),
  group: z.number().int().min(1).max(20).default(1),
  bars: z.number().min(0).max(999).default(8),
  meter: z.string().max(40).default("4/4"),
  bpm: z.number().min(20).max(400).nullable().default(null),
  job: z.enum(JOBS).default("establish"),
  riffs: z.string().max(200).default(""),
  notes: z.string().max(1000).default(""),
  levers: z
    .object({ loudness: level, register: level, density: level, tempo: level, harmony: level })
    .default({ loudness: 5, register: 5, density: 5, tempo: 5, harmony: 5 }),
  ladder: z
    .object({
      hookReps: z.number().int().min(0).max(16),
      highestNote: z.string().max(6),
      guitar: z.number().int().min(0).max(GUITAR_RUNGS.length - 1),
      cymbal: z.number().int().min(0).max(CYMBAL_RUNGS.length - 1),
    })
    .default({ hookReps: 0, highestNote: "", guitar: 1, cymbal: 1 }),
  /** null = no voice in this section */
  timbre: z
    .object({ breathy: bipolar, rough: bipolar, open: bipolar, chest: bipolar, anchored: bipolar })
    .nullable()
    .default(null),
  /** active metric levels, 1 (bare pulse) to 4 (subdivision, beat, bar and hypermeter all clear) */
  meterThickness: z.number().int().min(1).max(4).default(3),
  peak: z.boolean().default(false),
  landmarkA: z.boolean().default(false),
  landmarkB: z.boolean().default(false),
});
export type Section = z.infer<typeof sectionSchema>;

export const planDataSchema = z.object({
  bpm: z.number().min(20).max(400).default(100),
  sections: z.array(sectionSchema).max(80).default([]),
  /** focal parameter per section group, keyed by group number */
  focal: z.record(z.string(), z.enum(FOCAL)).default({}),
});
export type PlanData = z.infer<typeof planDataSchema>;

/* ---------------- helpers ---------------- */

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function blankSection(prev?: Section): Section {
  return sectionSchema.parse({
    id: newId(),
    group: prev?.group ?? 1,
    meter: prev?.meter ?? "4/4",
    levers: prev ? { ...prev.levers } : undefined,
    ladder: prev ? { ...prev.ladder } : undefined,
    timbre: prev?.timbre ? { ...prev.timbre } : null,
    meterThickness: prev?.meterThickness ?? 3,
  });
}

export function roman(n: number) {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/**
 * Length of one bar in quarter notes. Accepts "4/4", "7/8", "6/8", "7+7+7+5/16", "3+3+2/8".
 * Returns null when the meter can't be read.
 */
export function quartersPerBar(meter: string): number | null {
  const m = meter.replace(/\s/g, "").match(/^([\d+]+)\/(\d+)$/);
  if (!m) return null;
  const parts = m[1].split("+").map(Number);
  const den = Number(m[2]);
  if (parts.some((p) => !Number.isFinite(p) || p <= 0) || ![1, 2, 4, 8, 16, 32].includes(den)) return null;
  return (parts.reduce((a, b) => a + b, 0) * 4) / den;
}

export function sectionSeconds(s: Section, planBpm: number): number {
  const q = quartersPerBar(s.meter) ?? 4;
  const bpm = s.bpm ?? planBpm;
  return (s.bars * q * 60) / bpm;
}

export type Timed = Section & { start: number; end: number; seconds: number; tension: number };

/** Weighted tension, 0–10. */
export function tension(s: Section): number {
  let sum = 0;
  let w = 0;
  for (const l of LEVERS) {
    sum += s.levers[l] * LEVER_WEIGHT[l];
    w += LEVER_WEIGHT[l];
  }
  return Math.round((sum / w) * 10) / 10;
}

export function timeline(plan: PlanData): Timed[] {
  let t = 0;
  return plan.sections.map((s) => {
    const seconds = sectionSeconds(s, plan.bpm);
    const out = { ...s, start: t, end: t + seconds, seconds, tension: tension(s) };
    t += seconds;
    return out;
  });
}

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s === 60 ? 59 : s).padStart(2, "0")}`;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "E4", "F#3", "Bb4" → MIDI number, or null. */
export function noteToMidi(n: string): number | null {
  const m = n.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d)$/);
  if (!m) return null;
  const base = NOTE_INDEX[m[1].toUpperCase()];
  const acc = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

/* ---------------- checks ---------------- */

export type Check = {
  level: "warn" | "info" | "ok";
  /** index of the section the check is about, if any */
  at?: number;
  text: string;
  /** concept page that explains it */
  page?: string;
};

export function checkPlan(plan: PlanData): Check[] {
  const out: Check[] = [];
  const secs = plan.sections;
  if (secs.length === 0) return out;
  const label = (i: number) => {
    const s = secs[i];
    return `${i + 1}. ${s.name || s.letter || "Section"}`;
  };

  // unreadable meters
  secs.forEach((s, i) => {
    if (quartersPerBar(s.meter) === null)
      out.push({ level: "warn", at: i, text: `${label(i)}: can't read the meter "${s.meter}". Use forms like 4/4, 7/8 or 7+7+7+5/16. Timing assumes 4/4.` });
  });

  // lever movement between consecutive sections
  for (let i = 1; i < secs.length; i++) {
    const a = secs[i - 1].levers;
    const b = secs[i].levers;
    const up = LEVERS.filter((l) => b[l] - a[l] >= 1);
    const bigUp = LEVERS.filter((l) => b[l] - a[l] >= 2);
    const bigDown = LEVERS.filter((l) => a[l] - b[l] >= 2);
    const job = secs[i].job;
    const prevJob = secs[i - 1].job;
    const intendsRise = job === "build" || job === "arrive" || prevJob === "build";

    if (bigUp.length && bigDown.length) {
      const loudWins = bigUp.includes("loudness");
      const meant = ["cue", "contrast", "release", "transition"].includes(job);
      out.push({
        level: meant ? "info" : "warn",
        at: i,
        page: "building-tension",
        text: `${label(i)}: levers pull against each other (${bigUp.join(", ")} up; ${bigDown.join(", ")} down). Listeners hear this as ambiguous${loudWins ? ", though a rise in loudness tends to win" : ""}. Fine if that's the point.`,
      });
    }
    if (intendsRise) {
      const meterChanged = secs[i].meter.replace(/\s/g, "") !== secs[i - 1].meter.replace(/\s/g, "");
      if (up.length === 0 && meterChanged)
        out.push({
          level: "warn",
          at: i,
          page: "building-tension",
          text: `${label(i)}: the only change here is the meter (${secs[i - 1].meter} → ${secs[i].meter}). A meter change reads as colour, not as a build. Raise a lever with it.`,
        });
      else if (up.length === 0)
        out.push({ level: "warn", at: i, page: "building-tension", text: `${label(i)} is meant to rise, but no lever goes up from the section before.` });
      else if (job === "build" && up.length < 3)
        out.push({
          level: "info",
          at: i,
          page: "building-tension",
          text: `${label(i)}: only ${up.length === 1 ? "one lever rises" : "two levers rise"} (${up.join(", ")}). Builds are clearest with three or more moving together.`,
        });
      if (job === "build" && up.length && up.every((l) => l === "harmony"))
        out.push({ level: "info", at: i, page: "building-tension", text: `${label(i)}: harmony is the weakest lever; on its own it won't carry a build.` });
    }
  }

  // peak and ladder
  const peaks = secs.map((s, i) => (s.peak ? i : -1)).filter((i) => i >= 0);
  const T = secs.map(tension);
  const maxT = Math.max(...T);
  if (peaks.length === 0) {
    out.push({ level: "info", text: "No section is marked as the peak. Mark one to check the climb toward it.", page: "climax-placement" });
  } else {
    if (peaks.length > 1) out.push({ level: "info", text: `${peaks.length} sections are marked as peaks. The ladder checks use the last one.`, page: "climax-placement" });
    const p = peaks[peaks.length - 1];
    if (T[p] < maxT) {
      const where = T.indexOf(maxT);
      out.push({ level: "warn", at: where, page: "climax-placement", text: `The highest tension (${maxT}) is at ${label(where)}, not at the peak, ${label(p)} (${T[p]}).` });
    }
    const pos = secs.slice(0, p + 1).reduce((a, s) => a + sectionSeconds(s, plan.bpm), 0) - sectionSeconds(secs[p], plan.bpm) / 2;
    const total = secs.reduce((a, s) => a + sectionSeconds(s, plan.bpm), 0);
    if (total > 0) out.push({ level: "info", at: p, page: "climax-placement", text: `The peak sits ${Math.round((pos / total) * 100)}% of the way through.` });

    const before = secs.slice(0, p);
    const lad = secs[p].ladder;
    const missed: string[] = [];
    if (before.some((s) => s.ladder.hookReps > lad.hookReps)) missed.push("hook repetitions");
    const pm = noteToMidi(lad.highestNote);
    if (pm !== null && before.some((s) => (noteToMidi(s.ladder.highestNote) ?? -1) > pm)) missed.push("highest note");
    if (before.some((s) => s.ladder.guitar > lad.guitar)) missed.push("guitar technique");
    if (before.some((s) => s.ladder.cymbal > lad.cymbal)) missed.push("cymbal");
    if (missed.length)
      out.push({ level: "warn", at: p, page: "climax-placement", text: `Ladder: ${missed.join(", ")} already went higher before the peak. Save the top rung for ${label(p)}.` });
    else out.push({ level: "ok", at: p, page: "climax-placement", text: `Ladder: every rung is at its highest at the peak.` });

    // a timbre saved for the peak
    const tp = secs[p].timbre;
    if (tp) {
      const used = before.some((s) => s.timbre && TIMBRE_SCALES.every(({ key }) => s.timbre![key] === tp[key]));
      if (used) out.push({ level: "info", at: p, page: "vocal-timbre", text: `${label(p)} uses a vocal timbre heard earlier. Consider saving an unused sound for the peak.` });
    }
  }

  // thick meter at closes
  const thickest = Math.max(...secs.map((s) => s.meterThickness));
  secs.forEach((s, i) => {
    if ((s.job === "close" || s.job === "arrive") && s.meterThickness < thickest)
      out.push({ level: "info", at: i, page: "kinds-of-time", text: `${label(i)} is an ${s.job === "close" ? "ending" : "arrival"} but its meter is thinner (${s.meterThickness}) than elsewhere (${thickest}). Meter is usually thickest at big closes.` });
  });

  // focal parameter per group
  const groups = [...new Set(secs.map((s) => s.group))].sort((a, b) => a - b);
  for (let g = 1; g < groups.length; g++) {
    const f1 = plan.focal[String(groups[g - 1])];
    const f2 = plan.focal[String(groups[g])];
    if (f1 && f1 === f2)
      out.push({ level: "info", page: "form-design", text: `Groups ${roman(groups[g - 1])} and ${roman(groups[g])} share the same focal parameter (${f1}). A new focus per group keeps a long form moving.` });
  }

  // landmarks
  const A = secs.map((s, i) => (s.landmarkA ? i : -1)).filter((i) => i >= 0);
  const B = secs.map((s, i) => (s.landmarkB ? i : -1)).filter((i) => i >= 0);
  if (A.length && B.length) {
    const same = A.length === B.length && A.every((v, k) => v === B[k]);
    if (same) out.push({ level: "info", page: "dissonance-as-form", text: "The two landmark sets fall in the same places, so there's no formal dissonance between them." });
    else {
      const parts = (L: number[]) => L.length + (L[0] > 0 ? 1 : 0);
      out.push({ level: "ok", page: "dissonance-as-form", text: `Landmark set A divides the piece into ${parts(A)} parts and set B into ${parts(B)}. The landmark lane shows where they fall.` });
    }
  }

  return out;
}

/* ---------------- handover ---------------- */

export function planToMarkdown(title: string, plan: PlanData): string {
  const rows = timeline(plan);
  const head = `# ${title}\n\nTempo ${plan.bpm} bpm · ${rows.length} sections · ${formatTime(rows.at(-1)?.end ?? 0)}\n\n`;
  const table = [
    "| # | Group | Chart | Section | Riffs | Bars × meter | Time | Job | Tension | Notes |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map(
      (s, i) =>
        `| ${i + 1} | ${roman(s.group)} | ${s.letter} | ${s.name}${s.peak ? " (peak)" : ""} | ${s.riffs} | ${s.bars} × ${s.meter}${s.bpm ? ` @${s.bpm}` : ""} | ${formatTime(s.start)} | ${s.job} | ${s.tension} | ${s.notes.replace(/\|/g, "/").replace(/\n/g, " ")} |`
    ),
  ].join("\n");
  const focal = Object.entries(plan.focal)
    .filter(([, v]) => v)
    .map(([g, v]) => `- Group ${roman(Number(g))}: focus on ${v}`)
    .join("\n");
  return head + table + (focal ? `\n\n${focal}\n` : "\n");
}

/* ---------------- example ---------------- */

export function examplePlan(): PlanData {
  const S = (p: Partial<Section>): Section => sectionSchema.parse({ id: newId(), ...p });
  return {
    bpm: 96,
    focal: { "1": "texture", "2": "rhythm", "3": "melody" },
    sections: [
      S({ name: "Intro", letter: "A", group: 1, bars: 8, meter: "4/4", job: "present", riffs: "Low Tide", levers: { loudness: 2, register: 3, density: 2, tempo: 4, harmony: 3 }, ladder: { hookReps: 0, highestNote: "", guitar: 1, cymbal: 0 }, meterThickness: 2, notes: "clean, guitar synth pad only", landmarkA: true }),
      S({ name: "Verse 1", letter: "B", group: 1, bars: 4, meter: "7+7+7+5/16", job: "establish", riffs: "Spiral", levers: { loudness: 4, register: 4, density: 4, tempo: 5, harmony: 4 }, ladder: { hookReps: 0, highestNote: "D4", guitar: 2, cymbal: 1 }, timbre: { breathy: -1, rough: -2, open: -1, chest: -1, anchored: -1 }, meterThickness: 3, notes: "vocals enter bar 3" }),
      S({ name: "Build", letter: "B′", group: 1, bars: 6, meter: "4/4", job: "build", riffs: "Spiral → fragment", levers: { loudness: 6, register: 6, density: 7, tempo: 6, harmony: 5 }, ladder: { hookReps: 1, highestNote: "F4", guitar: 3, cymbal: 2 }, timbre: { breathy: 0, rough: -1, open: 0, chest: -1, anchored: 0 }, meterThickness: 3, notes: "cut riff to first 3 notes, rising" }),
      S({ name: "Gate", letter: "", group: 1, bars: 1, meter: "4/4", job: "cue", riffs: "Gate", levers: { loudness: 1, register: 6, density: 1, tempo: 6, harmony: 7 }, ladder: { hookReps: 0, highestNote: "", guitar: 0, cymbal: 1 }, meterThickness: 1, notes: "full stop, single hi-hat", landmarkB: true }),
      S({ name: "Groove", letter: "C", group: 2, bars: 8, meter: "7/8", job: "contrast", riffs: "Wheel", levers: { loudness: 6, register: 4, density: 6, tempo: 6, harmony: 4 }, ladder: { hookReps: 0, highestNote: "", guitar: 3, cymbal: 3 }, meterThickness: 3, notes: "drums lead; bass doubles kick", landmarkA: true }),
      S({ name: "Verse 2", letter: "B″", group: 2, bars: 4, meter: "7+7+7+5/16", job: "establish", riffs: "Spiral (inverted)", levers: { loudness: 5, register: 5, density: 6, tempo: 6, harmony: 5 }, ladder: { hookReps: 1, highestNote: "E4", guitar: 2, cymbal: 2 }, timbre: { breathy: 0, rough: -1, open: 0, chest: 0, anchored: 0 }, meterThickness: 3 }),
      S({ name: "Climb", letter: "D", group: 3, bars: 8, meter: "4/4", job: "build", riffs: "Spiral + Wheel", levers: { loudness: 8, register: 7, density: 8, tempo: 7, harmony: 6 }, ladder: { hookReps: 2, highestNote: "G4", guitar: 4, cymbal: 3 }, timbre: { breathy: 1, rough: 0, open: 1, chest: 0, anchored: 1 }, meterThickness: 3 }),
      S({ name: "Climax", letter: "A′", group: 3, bars: 8, meter: "6/8", job: "arrive", riffs: "Low Tide (full)", levers: { loudness: 10, register: 9, density: 9, tempo: 7, harmony: 6 }, ladder: { hookReps: 4, highestNote: "A4", guitar: 5, cymbal: 5 }, timbre: { breathy: 2, rough: 1, open: 2, chest: 1, anchored: 2 }, meterThickness: 4, peak: true, notes: "only time this appears" }),
      S({ name: "Outro", letter: "A", group: 3, bars: 8, meter: "4/4", job: "close", riffs: "Low Tide", levers: { loudness: 3, register: 3, density: 2, tempo: 4, harmony: 2 }, ladder: { hookReps: 0, highestNote: "", guitar: 1, cymbal: 1 }, meterThickness: 4, landmarkA: true }),
    ],
  };
}
