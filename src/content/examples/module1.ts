/**
 * Module 1 sound examples — all original material written for Learn Form.
 * Variants are generated from the source motif with the transformation
 * functions, so every example is exactly what its label says.
 */
import { parseNotation, toNotation, type NoteEvent } from "@/lib/music/notation";
import * as T from "@/lib/music/transform";
import type { VoiceName } from "@/lib/music/engine";

export type Example = {
  id: string;
  label: string;
  notation: string;
  /** Belkin-style distance from the source, 1 (same) – 5 (unrecognizable) */
  similarity?: number;
  how?: string;
  voice?: VoiceName;
};

export type ExampleSet = {
  id: string;
  title: string;
  bpm: number;
  voice: VoiceName;
  source?: Example;
  items: Example[];
  /** optional extra layers played under every item (e.g. drums) */
  backing?: { notation: string; voice: VoiceName; gain?: number }[];
};

const ev = (s: string) => parseNotation(s).events;
const n = (e: NoteEvent[]) => toNotation(e);

/* ------------------------------------------------------------------ */
/* The source motif "M": stutter, rise, tritone, fall.                 */
/* Internal contrast: short/short/long rhythm vs. a slow falling tail. */
/* ------------------------------------------------------------------ */
export const MOTIF_M = "E3/16 E3/16 G3/8 A3/8! r/16 E3/16 Bb3/8. A3/16 G3/4";
const M = ev(MOTIF_M);

export const variantLab: ExampleSet = {
  id: "variant-lab",
  title: "Motif M and 12 variants",
  bpm: 96,
  voice: "guitar",
  source: { id: "M", label: "Motif M (source)", notation: MOTIF_M },
  items: [
    {
      id: "v-transpose",
      label: "Transposed up a fourth",
      notation: n(T.transpose(M, 5)),
      similarity: 1,
      how: "Every note moves by the same interval. Shape, rhythm and accents untouched.",
    },
    {
      id: "v-sequence",
      label: "Sequence (stated, then a minor third higher)",
      notation: n(T.concat(M, T.transpose(M, 3))),
      similarity: 1,
      how: "Repeating the motif on a new step actually reinforces it: the second statement is a rehearsal of the first.",
    },
    {
      id: "v-endleap",
      label: "Last interval changed (falls to D)",
      notation: "E3/16 E3/16 G3/8 A3/8! r/16 E3/16 Bb3/8. A3/16 D3/4",
      similarity: 1,
      how: "Only the ending moves. The ear hears leaps as 'not a step' more than as exact sizes, so identity survives.",
    },
    {
      id: "v-chug",
      label: "Rhythmic cell only, on a low E (palm-mute style)",
      notation: n(T.flatten(T.transpose(M, -12), 40)),
      similarity: 2,
      how: "Pitch removed, rhythm kept. Schoenberg: keeping rhythmic features is the strongest source of coherence. This is how riffs become grooves.",
      voice: "drive",
    },
    {
      id: "v-invert",
      label: "Inversion",
      notation: n(T.invert(M)),
      similarity: 2,
      how: "Contour flipped upside down, rhythm identical. Still clearly the same family because the rhythm is so characteristic.",
    },
    {
      id: "v-contour",
      label: "Same rhythm, pitches in reverse order",
      notation: n(T.retrogradePitchOnly(M)),
      similarity: 3,
      how: "Rhythm kept, contour rewritten. Related, but you have to work for it — a 'medium' variant, useful in transitions.",
    },
    {
      id: "v-leaps",
      label: "Steps turned into leaps",
      notation: n(T.scaleIntervals(M, 2.4)),
      similarity: 4,
      how: "The intervals are stretched until the stepwise character disappears. Recognition starts to fail.",
    },
    {
      id: "v-augment",
      label: "Augmentation (twice as slow)",
      notation: n(T.augment(M)),
      similarity: 4,
      how: "Same notes, double length. The energy of the motif changes completely — in a song this reads as a new section.",
    },
    {
      id: "v-diminish",
      label: "Diminution (twice as fast)",
      notation: n(T.diminish(M)),
      similarity: 4,
      how: "Same notes, half length. Becomes an ornament or a fill rather than a statement.",
    },
    {
      id: "v-even",
      label: "Even rhythm (all eighths)",
      notation: n(T.evenRhythm(M)),
      similarity: 5,
      how: "Pitches kept, rhythm erased. Without its rhythmic profile the motif almost vanishes.",
    },
    {
      id: "v-displace",
      label: "Displaced by a sixteenth (accents land elsewhere)",
      notation: n(T.displace(M, 0.25)),
      similarity: 5,
      how: "Identical notes, shifted against the beat. Belkin rates swapping strong/weak positions as a drastic change — and it's exactly the trick prog uses on purpose.",
    },
    {
      id: "v-retro",
      label: "Retrograde (backwards)",
      notation: n(T.retrograde(M)),
      similarity: 5,
      how: "Rhythm and pitch both reversed. On paper it's related; to the ear it's new material.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Developing variation: each link grows out of the previous one,      */
/* not out of the original.                                            */
/* ------------------------------------------------------------------ */
const D1 = T.retrogradePitchOnly(M); // contour reworked, rhythm kept
const D2 = T.concat(T.fragment(D1, 3), T.transpose(T.fragment(D1, 3), 2), T.transpose(T.fragment(D1, 3), 3)); // fragment + sequence
const D3 = T.augment(T.fragment(D2, 6)); // slowed down: now a melody
const D4 = T.transpose(T.flatten(T.fragment(D2, 3), 40), 0); // its rhythm becomes a low pedal

export const developingChain: ExampleSet = {
  id: "developing-chain",
  title: "A developing-variation chain",
  bpm: 96,
  voice: "guitar",
  source: { id: "M", label: "M — source", notation: MOTIF_M },
  items: [
    { id: "d1", label: "M → D1: rhythm kept, contour reworked", notation: n(D1), how: "Derived from M." },
    {
      id: "d2",
      label: "D1 → D2: first 3 notes, sequenced upward",
      notation: n(D2),
      how: "Derived from D1, not from M. The 'stutter' has become the whole idea.",
    },
    {
      id: "d3",
      label: "D2 → D3: augmented into a slow melody",
      notation: n(D3),
      how: "Derived from D2. Compare it with M: almost no surface resemblance, but a clear line of descent.",
    },
    {
      id: "d4",
      label: "D2 → D4: its rhythm alone, as a low pedal",
      notation: n(D4),
      voice: "drive",
      how: "A second branch. D3 and D4 could be two different songs on the same record — siblings, not copies.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Double motive: a = stutter-rise, b = tritone fall. Reorder freely.  */
/* ------------------------------------------------------------------ */
const a = "E3/16 E3/16 G3/8";
const b = "Bb3/8. A3/16 G3/4";
export const doubleMotive: ExampleSet = {
  id: "double-motive",
  title: "Double motive: a and b in different orders",
  bpm: 96,
  voice: "guitar",
  items: [
    { id: "ab", label: "a b", notation: `${a} ${b}` },
    { id: "aab", label: "a a b", notation: `${a} ${a} ${b}` },
    { id: "ba", label: "b a", notation: `${b} ${a}` },
    { id: "abba", label: "a b b a (b answered by itself)", notation: `${a} ${b} ${n(T.transpose(ev(b), -2))} ${a}` },
    {
      id: "aaab",
      label: "a a a b (a sequenced up, then b arrives)",
      notation: `${a} ${n(T.transpose(ev(a), 2))} ${n(T.transpose(ev(a), 3))} ${b}`,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* The sentence (Schoenberg) as an 8-bar riff section.                 */
/* ------------------------------------------------------------------ */
const BI = `${MOTIF_M} | G3/8 A3/8 Bb3/8 A3/8 G3/4 E3/4`;
const frag = T.fragment(M, 3);
const cont = T.concat(
  frag,
  frag,
  T.transpose(frag, 3),
  T.transpose(frag, 5),
  T.transpose(frag, 7),
  T.transpose(frag, 8),
  T.transpose(frag, 10),
  T.transpose(frag, 12)
);
const liquidation = "E4/8 D4/8 Bb3/8 A3/8 G3/8 E3/8 D3/8 B2/8 | [E2,B2,E3]/2! r/2";

export const SENTENCE_STAGES = [
  {
    id: "bi",
    label: "Basic idea",
    bars: "1–2",
    text: "The motif is presented, with a short answer. This is what the listener must remember.",
    notation: BI,
  },
  {
    id: "rep",
    label: "Repetition (moved up a fourth)",
    bars: "3–4",
    text: "Immediate repetition — Schoenberg's 'dominant form'. Repetition is what makes the idea stick.",
    notation: n(T.transpose(ev(BI), 5)),
  },
  {
    id: "cont",
    label: "Continuation: fragmentation + sequence",
    bars: "5–6",
    text: "Only the first three notes survive. The units get shorter and climb — energy rises without new material.",
    notation: n(cont),
  },
  {
    id: "liq",
    label: "Liquidation → cadence",
    bars: "7–8",
    text: "The characteristic stutter disappears. A neutral line falls to a power-chord arrival. Nothing left demands continuation.",
    notation: liquidation,
  },
] as const;

const groove = "[C2,F#4]/8 F#4/8 [D3,F#4]/8 F#4/8 [C2,F#4]/8 F#4/8 [D3,F#4]/8 F#4/8";
export const SENTENCE_GROOVE = Array.from({ length: 7 }, () => groove).join(" | ") + " | [C2,F#4]/2! r/2";

/* ------------------------------------------------------------------ */
/* Grouping (Snyder ch. 3): same notes, different boundaries.          */
/* ------------------------------------------------------------------ */
export type GroupingScenario = {
  id: string;
  label: string;
  principle: string;
  notation: string;
  /** indices (into pitched notes) where a new group starts */
  groupStarts: number[];
  ambiguous?: number[];
};

const cyc = ["E3", "G3", "A3", "B3", "D4", "B3", "A3", "G3", "E3", "G3", "A3", "B3"];
export const groupingScenarios: GroupingScenario[] = [
  {
    id: "even",
    label: "Even stream",
    principle: "No boundaries: everything is equally spaced and equally loud. Your brain still tries to chunk it, but nothing tells it where.",
    notation: cyc.map((p) => `${p}/8`).join(" "),
    groupStarts: [0],
  },
  {
    id: "gap3",
    label: "Gaps every 3 notes",
    principle: "Proximity in time: a slightly longer gap creates a boundary. Temporal proximity is the strongest grouping force.",
    notation: cyc.map((p, i) => `${p}/8${(i + 1) % 3 === 0 ? " r/8" : ""}`).join(" "),
    groupStarts: [0, 3, 6, 9],
  },
  {
    id: "gap4",
    label: "Gaps every 4 notes",
    principle: "Same notes, same order — moving the gaps changes what the 'units' are.",
    notation: cyc.map((p, i) => `${p}/8${(i + 1) % 4 === 0 ? " r/8" : ""}`).join(" "),
    groupStarts: [0, 4, 8],
  },
  {
    id: "register3",
    label: "Register jumps every 3 notes",
    principle: "Similarity: notes in the same register cluster together, even with perfectly even timing.",
    notation: cyc.map((p, i) => `${p.replace(/\d/, (o) => String(Number(o) + (Math.floor(i / 3) % 2 ? 1 : 0)))}/8`).join(" "),
    groupStarts: [0, 3, 6, 9],
  },
  {
    id: "accent3",
    label: "Accents every 3 notes",
    principle: "Accent (intensity) also starts groups. This is the core of most odd-grouping riffs over a 4/4 pulse.",
    notation: cyc.map((p, i) => `${p}/8${i % 3 === 0 ? "!" : ""}`).join(" "),
    groupStarts: [0, 3, 6, 9],
  },
  {
    id: "conflict",
    label: "Conflict: gaps every 4, accents every 3",
    principle: "Two grouping forces disagree. Listeners hear it differently, or hear it 'flip'. Tension, ambiguity — and a big part of the prog sound.",
    notation: cyc.map((p, i) => `${p}/8${i % 3 === 0 ? "!" : ""}${(i + 1) % 4 === 0 ? " r/8" : ""}`).join(" "),
    groupStarts: [0, 4, 8],
    ambiguous: [3, 6, 9],
  },
];

/* ------------------------------------------------------------------ */
/* Chunking & memory (Snyder ch. 3–4): same four pitches, three orders */
/* a=E3 b=G3 c=A3 d=B3                                                 */
/* ------------------------------------------------------------------ */
const letters: Record<string, string> = { a: "E3", b: "G3", c: "A3", d: "B3" };
const fromLetters = (s: string) =>
  s
    .split("")
    .map((ch, i) => `${letters[ch]}/8${i % 4 === 0 ? "!" : ""}`)
    .join(" ");
export const memorySet: ExampleSet = {
  id: "memory",
  title: "Can you hum it back?",
  bpm: 132,
  voice: "guitar",
  items: [
    {
      id: "random",
      label: "1 · No internal repetition",
      notation: fromLetters("cbdacadcbadbcdab"),
      how: "16 notes, no recurring pattern: 16 separate items for short-term memory.",
    },
    {
      id: "framed",
      label: "2 · Repeated 'frame' notes",
      notation: fromLetters("bacdbcadbaadbccd"),
      how: "Each group of four starts on the same note and similar notes return: boundaries appear, load drops.",
    },
    {
      id: "chunk",
      label: "3 · One chunk, four times",
      notation: fromLetters("bacdbacdbacdbacd"),
      how: "One chunk of four, rehearsed four times. Effortless — and, if overused, boring.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Text setting for the voice (Belkin ch. 3) — original lyric.          */
/* "I keep the silence where the river ends"                            */
/* stress: i KEEP the SI-lence WHERE the RI-ver ENDS                     */
/* ------------------------------------------------------------------ */
export const textSetting: ExampleSet = {
  id: "text-setting",
  title: "Same words, two settings",
  bpm: 84,
  voice: "voice",
  items: [
    {
      id: "against",
      label: "Fights the words",
      notation:
        'E4/8"I" D4/8"keep" A4/4!"the" G4/8"si" B4/4!"lence" E4/8"where" A4/4!"the" G4/8"ri" A4/8"ver" C5/2"ends?"',
      how: "Long, high notes on 'the' and on the weak syllable of 'silence'; the line rises at the end so the statement sounds like a question.",
    },
    {
      id: "with",
      label: "Follows the words",
      notation:
        'D4/8"I" G4/4!"keep" E4/8"the" B4/4.!"si" A4/8"lence" A4/8"where" G4/8"the" B4/4!"ri" A4/8"ver" E4/2!"ends"',
      how: "Stressed syllables get the length and the height; 'the' is short and low; the line falls at the end like a spoken statement. The peak sits on 'si-', the emotional word.",
    },
  ],
};

export const exampleSets: Record<string, ExampleSet> = {
  [variantLab.id]: variantLab,
  [developingChain.id]: developingChain,
  [doubleMotive.id]: doubleMotive,
  [memorySet.id]: memorySet,
  [textSetting.id]: textSetting,
};
