"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

import { parseNotation, type NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { finalize, groove, note, S, CRASH, HAT, KICK, SNARE, type Cymbal, type Feel } from "@/lib/music/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

/** Place a notated figure at `at` beats, optionally transposed and scaled in loudness. */
function place(src: string, at: number, transpose = 0, vel = 0.8): NoteEvent[] {
  return parseNotation(src).events
    .filter((e) => e.midi.length)
    .map((e) => ({
      ...e,
      start: e.start + at,
      midi: e.midi[0] === -1 ? e.midi : e.midi.map((m) => m + transpose),
      velocity: (e.accent ? 1 : e.midi[0] === -1 ? 0.5 : 0.8) * vel,
    }));
}

/** One bar of a drum fill: 16th snares rising in loudness. */
function fill(at: number, from = 0, vel = 0.9): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (let i = from; i < 16; i++) out.push(note(at + i * S, S, [SNARE], vel * (0.45 + (0.55 * i) / 15)));
  return out;
}

function hit(at: number, vel = 1): NoteEvent[] {
  return [note(at, S, [CRASH], vel), note(at, S, [KICK], vel)];
}

/** Drum category as the engine maps it (kick / snare / crash / hat): one hit per category per instant. */
function drumKind(midi: number) {
  return midi <= 40 ? "k" : midi <= 55 ? "s" : midi <= 60 ? "c" : "h";
}

/** Keep the loudest of several same-instant hits on one drum (the synth can't retrigger at the same time). */
function dedupeKit(events: NoteEvent[]): NoteEvent[] {
  const best = new Map<string, NoteEvent>();
  for (const e of events) {
    const k = `${Math.round(e.start * 1000)}-${drumKind(e.midi[0])}`;
    const cur = best.get(k);
    if (!cur || (e.velocity ?? 0.6) > (cur.velocity ?? 0.6)) best.set(k, e);
  }
  return [...best.values()];
}

/** Monophonic voices: one note per instant (keep the later-added one). */
function dedupeStart(events: NoteEvent[]): NoteEvent[] {
  const m = new Map<number, NoteEvent>();
  for (const e of events) m.set(Math.round(e.start * 1000), e);
  return [...m.values()];
}

function layers(parts: { events: NoteEvent[]; voice: Layer["voice"]; gain?: number }[]): Layer[] {
  return parts
    .filter((p) => p.events.length)
    .map((p) => ({ ...p, events: finalize(p.voice === "kit" ? dedupeKit(p.events) : p.voice === "bass" ? dedupeStart(p.events) : p.events) }));
}

function Ruler({ value, max = 10, label }: { value: number | [number, number]; max?: number; label: string }) {
  const [lo, hi] = Array.isArray(value) ? value : [value, value];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex gap-0.5" aria-label={`${label}: ${lo === hi ? lo : `${lo}–${hi}`} of ${max}`}>
        {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
          <span key={i} className={cn("h-2.5 w-3 rounded-[2px]", i <= hi ? (i < lo ? "bg-signal" : "bg-signal/55") : "bg-muted")} />
        ))}
      </div>
      <span className="tabular-nums">{lo === hi ? lo : `${lo}–${hi}`}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Degrees of punctuation — Belkin ch. 5                             */
/* ------------------------------------------------------------------ */

const PHRASE_1 = "E2/8! x/16 E2/16 G2/8 E2/8 Bb2/8 A2/8 G2/8 E2/8";
const PHRASE_2 = "E2/8! x/16 E2/16 G2/8 E2/8 D3/8 C3/8 B2/8 A2/8";

type Ending = "elision" | "yesbut" | "deceptive" | "half" | "interrupt" | "full";
const ENDINGS: { id: Ending; label: string; degree: [number, number]; agree: string[]; text: string }[] = [
  {
    id: "elision",
    label: "Elision",
    degree: [1, 2],
    agree: [],
    text: "The phrase's last note is the first note of the next phrase. The boundary is heard, but nothing stops.",
  },
  {
    id: "yesbut",
    label: "“Yes, but…”",
    degree: [3, 4],
    agree: ["melody"],
    text: "The riff lands on the root, but the drums keep the groove and the bass pushes into the next phrase. A breath, not a stop.",
  },
  {
    id: "deceptive",
    label: "Deceptive",
    degree: [3, 4],
    agree: ["rhythm", "texture"],
    text: "Everything slows to a big landing with a crash — on the wrong chord (C, not E). One dimension contradicts the others, so it can't be final.",
  },
  {
    id: "half",
    label: "Half cadence",
    degree: [5, 6],
    agree: ["rhythm", "texture", "dynamics"],
    text: "It lands on B (V) and holds, the drums fill, a beat of silence. Clearly a section seam, clearly not the end.",
  },
  {
    id: "interrupt",
    label: "Cut-off + silence",
    degree: [5, 6],
    agree: [],
    text: "Everything stops mid-pattern. Silence after something incomplete is suspense — the listener fills the gap with expectation.",
  },
  {
    id: "full",
    label: "Full stop",
    degree: [9, 10],
    agree: ["melody", "harmony", "rhythm", "texture", "dynamics"],
    text: "Lowest note, root, a slowing rhythm, a final hit, then silence. All dimensions agree. Use this once, at the end.",
  },
];
const DIMS = ["melody", "harmony", "rhythm", "texture", "dynamics"];

export function buildPunctuation(e: Ending): Layer[] {
  const gtr: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  // bars 1–2: the phrase
  gtr.push(...place(PHRASE_1, 0), ...place(PHRASE_2, 4));
  bass.push(...place("E1/4 E1/4 G1/4 A1/4 E1/4 E1/4 D2/4 A1/4", 0, 0, 0.8));
  kit.push(...groove(2, "normal", "hat8"));
  const next = () => {
    // the next phrase (bars 4–5), to show the music continues
    gtr.push(...place(PHRASE_1, 12), ...place(PHRASE_2, 16));
    bass.push(...place("E1/4 E1/4 G1/4 A1/4 E1/4 E1/4 D2/4 A1/4", 12, 0, 0.8));
    kit.push(...groove(2, "normal", "hat8", 12));
  };
  switch (e) {
    case "elision": {
      // no bar 3: the next phrase starts right away on beat 8
      gtr.push(...place(PHRASE_1, 8), ...place(PHRASE_2, 12));
      bass.push(...place("E1/4 E1/4 G1/4 A1/4 E1/4 E1/4 D2/4 A1/4", 8, 0, 0.8));
      kit.push(...groove(2, "normal", "hat8", 8), note(8, S, [CRASH], 0.6));
      break;
    }
    case "yesbut": {
      gtr.push(note(8, 3.5, [40, 47, 52], 0.85));
      bass.push(note(8, 2, [28], 0.8), ...place("B1/8 C2/8 D2/8 D#2/8", 10, 0, 0.8));
      kit.push(...groove(1, "normal", "hat8", 8));
      next();
      break;
    }
    case "deceptive": {
      gtr.push(note(8, 3.5, [36, 43, 48], 1));
      bass.push(note(8, 3.5, [24], 0.9));
      kit.push(...hit(8), note(10, S, [HAT], 0.5), note(11, S, [SNARE], 0.5), note(11.5, S, [SNARE], 0.6));
      next();
      break;
    }
    case "half": {
      gtr.push(note(8, 2.5, [35, 42, 47], 1));
      bass.push(note(8, 2.5, [23], 0.9));
      kit.push(...hit(8), ...fill(8, 8, 0.8));
      // beat 11: silence; the next phrase enters at 12
      next();
      break;
    }
    case "interrupt": {
      // cut bar 2 at beat 6: remove anything after 6, then 2 beats of silence, then resume at 8
      const cut = (arr: NoteEvent[]) => arr.splice(0, arr.length, ...arr.filter((x) => x.start < 6).map((x) => ({ ...x, dur: Math.min(x.dur, 6 - x.start) })));
      cut(gtr);
      cut(bass);
      cut(kit);
      kit.push(note(5.75, S, [SNARE], 1), note(5.75, S, [CRASH], 0.8));
      gtr.push(...place(PHRASE_1, 8), ...place(PHRASE_2, 12));
      bass.push(...place("E1/4 E1/4 G1/4 A1/4 E1/4 E1/4 D2/4 A1/4", 8, 0, 0.8));
      kit.push(...groove(2, "normal", "hat8", 8));
      break;
    }
    case "full": {
      // slow the end of bar 2: replace beats 6–8 with longer values; land on the lowest E
      const trim = (arr: NoteEvent[]) => arr.splice(0, arr.length, ...arr.filter((x) => x.start < 6));
      trim(gtr);
      trim(bass);
      trim(kit);
      gtr.push(note(6, 0.75, [45], 0.8), note(6.75, 1, [43], 0.8), note(7.75, 1.25, [38], 0.85));
      bass.push(note(6, 0.75, [33], 0.8), note(6.75, 1, [31], 0.8), note(7.75, 1.25, [26], 0.85));
      kit.push(note(6, S, [KICK], 0.8), note(6.75, S, [SNARE], 0.8), note(7.75, S, [SNARE], 0.9), note(8.25, S, [SNARE], 0.95));
      gtr.push(note(9, 4, [28, 35, 40], 1));
      bass.push(note(9, 4, [16], 1));
      kit.push(...hit(9));
      break;
    }
  }
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: gtr, voice: "drive", gain: -2 },
  ]);
}

export function PunctuationLab() {
  const [e, setE] = useState<Ending>("yesbut");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildPunctuation(e), [e]);
  const info = ENDINGS.find((x) => x.id === e)!;
  const key = `pl-${e}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Six ways to end one phrase</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same two-bar phrase, six endings. Before you read the rating, guess it yourself on Belkin&apos;s 1–10 scale
        (10 = the end of the piece).
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {ENDINGS.map((x) => (
          <Chip key={x.id} on={e === x.id} onClick={() => setE(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <div className="mb-3 space-y-1.5">
        <Ruler label="Punctuation" value={info.degree} />
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="w-24 shrink-0 text-muted-foreground">Dimensions closing</span>
          {DIMS.map((d) => (
            <span
              key={d}
              className={cn(
                "rounded-full border px-2 py-0.5",
                info.agree.includes(d) ? "border-signal bg-signal/15" : "text-muted-foreground"
              )}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 100 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Transitions — Belkin ch. 11–12                                    */
/* ------------------------------------------------------------------ */

const A_FIG = "E3/8 B3/8 G3/8 B3/8 F#3/8 B3/8 G3/8 B3/8"; // clean arpeggio, mid register
const A_DRIVE = A_FIG; // same notes, distorted
const B_FIG = "E2/8! x/16 E2/16 x/16 E2/16 G2/8 E2/8! x/16 E2/16 Bb2/8 A2/8"; // low chug riff

type Mode = "cut" | "ladder" | "turn" | "cross";
const MODES: { id: Mode; label: string; text: string }[] = [
  { id: "cut", label: "Hard cut", text: "Four bars of A, then B. Timbre, register, drum feel, cymbal, loudness and riff all change on one downbeat. Belkin's scale: about 8." },
  { id: "ladder", label: "One change at a time", text: "Each step changes one dimension, about 1–2 points on the contrast scale. Long, smooth, and you can hear every rung." },
  { id: "turn", label: "Turning point", text: "A builds to a peak (louder, denser, a fill). The peak is the pivot: B arrives as its resolution, so the big change feels caused." },
  { id: "cross", label: "Cross-cutting", text: "A and B alternate in blocks; B's blocks get longer until it wins (Belkin on Stravinsky). Works only if the cut timing isn't predictable." },
];

function aBar(at: number, opts: { feel?: Feel; cym?: Cymbal; drive?: boolean; vel?: number; tr?: number }) {
  const { feel = "half", cym = "hat8", drive = false, vel = 0.55, tr = 0 } = opts;
  return {
    g: place(drive ? A_DRIVE : A_FIG, at, tr, vel),
    drive,
    b: place("E2/2 F#2/2", at, 0, vel),
    k: groove(1, feel, cym, at, vel + 0.1),
  };
}
function bBar(at: number, vel = 1) {
  return { g: place(B_FIG, at, 0, vel), b: place("E1/4 E1/4 E1/8 G1/8 A1/4", at, 0, vel), k: groove(1, "normal", "crash4", at, vel * 0.95) };
}

export function buildTransition(mode: Mode): { lys: Layer[]; steps: { bar: number; change: string }[]; bars: number } {
  const clean: NoteEvent[] = [];
  const drive: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  const steps: { bar: number; change: string }[] = [];
  const addA = (bar: number, o: Parameters<typeof aBar>[1]) => {
    const r = aBar(bar * 4, o);
    (r.drive ? drive : clean).push(...r.g);
    bass.push(...r.b);
    kit.push(...r.k);
  };
  const addB = (bar: number, vel = 1) => {
    const r = bBar(bar * 4, vel);
    drive.push(...r.g);
    bass.push(...r.b);
    kit.push(...r.k);
  };
  let bars = 0;
  if (mode === "cut") {
    for (let i = 0; i < 4; i++) addA(i, {});
    kit.push(...hit(16));
    for (let i = 4; i < 8; i++) addB(i);
    steps.push({ bar: 1, change: "A: clean, mid register, half-time, quiet" }, { bar: 5, change: "Everything at once → B" });
    bars = 8;
  } else if (mode === "ladder") {
    addA(0, {});
    addA(1, {});
    steps.push({ bar: 1, change: "A as given" });
    addA(2, { feel: "normal" });
    addA(3, { feel: "normal" });
    steps.push({ bar: 3, change: "drums: half-time → normal" });
    addA(4, { feel: "normal", cym: "crash4", vel: 0.7 });
    addA(5, { feel: "normal", cym: "crash4", vel: 0.75 });
    steps.push({ bar: 5, change: "cymbal hat → crash, a bit louder" });
    addA(6, { feel: "normal", cym: "crash4", drive: true, vel: 0.8 });
    addA(7, { feel: "normal", cym: "crash4", drive: true, vel: 0.85 });
    steps.push({ bar: 7, change: "guitar: clean → distorted (same notes)" });
    addA(8, { feel: "normal", cym: "crash4", drive: true, vel: 0.9, tr: -12 });
    addA(9, { feel: "normal", cym: "crash4", drive: true, vel: 0.95, tr: -12 });
    steps.push({ bar: 9, change: "register: an octave down" });
    for (let i = 10; i < 13; i++) addB(i);
    steps.push({ bar: 11, change: "riff: A's figure → B's chug (the last change)" });
    bars = 13;
  } else if (mode === "turn") {
    addA(0, {});
    addA(1, { vel: 0.62 });
    addA(2, { feel: "normal", vel: 0.72 });
    addA(3, { feel: "normal", cym: "hat16", vel: 0.85, drive: true });
    kit.push(...fill(12, 8, 1));
    steps.push({ bar: 1, change: "A" }, { bar: 2, change: "louder…" }, { bar: 3, change: "drums to normal feel" }, { bar: 4, change: "16th hats, guitar distorts, fill = the peak" });
    kit.push(...hit(16));
    for (let i = 4; i < 8; i++) addB(i);
    steps.push({ bar: 5, change: "B lands as the peak's resolution" });
    bars = 8;
  } else {
    const plan: ("A" | "B")[] = ["A", "A", "B", "A", "A", "A", "B", "B", "A", "B", "B", "B", "B"];
    let prev: "A" | "B" | null = null;
    plan.forEach((s, i) => {
      if (s === "A") addA(i, {});
      else addB(i, 0.95);
      if (s !== prev) {
        steps.push({ bar: i + 1, change: prev === null ? "A" : s === "A" ? "cut → A" : "cut → B" });
        if (s === "B") kit.push(note(i * 4, S, [CRASH], 0.9));
      }
      prev = s;
    });
    bars = plan.length;
  }
  return {
    lys: layers([
      { events: kit, voice: "kit" },
      { events: bass, voice: "bass" },
      { events: clean, voice: "guitar" },
      { events: drive, voice: "drive", gain: -3 },
    ]),
    steps,
    bars,
  };
}

export function TransitionLab() {
  const [mode, setMode] = useState<Mode>("cut");
  const { playing, active, toggle } = usePlayer();
  const { lys, steps, bars } = useMemo(() => buildTransition(mode), [mode]);
  const key = `tr-${mode}`;
  const kitIdx = active[0];
  const curBar = playing === key && kitIdx !== undefined ? Math.floor((lys[0].events[kitIdx]?.start ?? 0) / 4) + 1 : null;
  const info = MODES.find((m) => m.id === mode)!;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">From A to B, four ways</div>
      <p className="mb-4 text-sm text-muted-foreground">
        A is a clean, half-time arpeggio. B is a low, distorted chug with crashes. Same departure, same arrival — only
        the route changes.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {MODES.map((m) => (
          <Chip key={m.id} on={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <div className="mb-3 flex gap-0.5" aria-hidden>
        {Array.from({ length: bars }, (_, i) => i + 1).map((b) => (
          <div key={b} className={cn("h-2 flex-1 rounded-sm", curBar === b ? "bg-foreground" : "bg-muted")} />
        ))}
      </div>
      <ol className="mb-4 space-y-1 text-sm">
        {steps.map((s) => (
          <li key={`${s.bar}-${s.change}`} className={cn("flex gap-3", curBar !== null && curBar >= s.bar && "text-foreground", curBar !== null && curBar < s.bar && "text-muted-foreground")}>
            <span className="w-12 shrink-0 tabular-nums text-muted-foreground">bar {s.bar}</span>
            <span>{s.change}</span>
          </li>
        ))}
      </ol>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 108 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Riff cycles as variations — Belkin ch. 10                         */
/* ------------------------------------------------------------------ */

const CYCLE = "E2/8! x/16 E2/16 G2/8 x/16 E2/16 Bb2/8. A2/16 G2/8 E2/8 | E2/8! x/16 E2/16 G2/8 x/16 E2/16 D3/8 C3/8 B2/8 A2/8";
type VarMode = "flat" | "grouped";

type Cell = { group: number; label: string };

export function buildVariations(mode: VarMode): { lys: Layer[]; cells: Cell[] } {
  const clean: NoteEvent[] = [];
  const drive: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  const cells: Cell[] = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const at = i * 8;
    if (mode === "flat") {
      drive.push(...place(CYCLE, at, 0, 0.8));
      bass.push(...place("E1/2 G1/2 E1/2 D2/4 A1/4", at, 0, 0.8));
      kit.push(...groove(2, "normal", "hat8", at, 0.8));
      cells.push({ group: 0, label: "same" });
      continue;
    }
    if (i < 3) {
      // group 1: clean, growing — the climax of each cycle stays early (bar 1)
      clean.push(...place(CYCLE, at, 0, 0.55 + i * 0.08));
      if (i >= 1) bass.push(...place("E1/2 G1/2 E1/2 D2/4 A1/4", at, 0, 0.6));
      kit.push(...groove(2, "half", i === 0 ? "none" : "hat8", at, 0.6 + i * 0.05));
      cells.push({ group: 1, label: ["riff alone", "+ bass, hats", "louder"][i] });
    } else if (i < 6) {
      // group 2: distorted, normal feel; the peak moves to the end of the cycle (octave up on bar 2)
      const j = i - 3;
      drive.push(...place(CYCLE.split("|")[0], at, 0, 0.85), ...place(CYCLE.split("|")[1], at + 4, j >= 1 ? 12 : 0, 0.9));
      bass.push(...place("E1/2 G1/2 E1/2 D2/4 A1/4", at, 0, 0.85));
      kit.push(...groove(2, "normal", j === 2 ? "hat16" : "hat8", at, 0.85));
      if (j === 2) kit.push(...fill(at + 4, 12, 0.9));
      cells.push({ group: 2, label: ["drive, normal feel", "peak moves late", "16ths + fill"][j] });
    } else {
      // last group: breaks the pattern — half-time, octave, then a longer ending
      drive.push(...place(CYCLE, at, 12, 1));
      bass.push(...place("E1/1 E1/1", at, 0, 1));
      kit.push(...groove(2, "half", "crash4", at, 1));
      if (i === N - 1) {
        drive.push(note(at + 8, 4, [28, 35, 40], 1));
        bass.push(note(at + 8, 4, [16], 1));
        kit.push(...hit(at + 8));
      }
      cells.push({ group: 3, label: i === N - 1 ? "half-time, octave + coda" : "half-time, octave up" });
    }
  }
  if (mode === "flat") {
    drive.push(note(N * 8, 2, [28, 35, 40], 0.9));
    kit.push(...hit(N * 8, 0.8));
  }
  return {
    lys: layers([
      { events: kit, voice: "kit" },
      { events: bass, voice: "bass" },
      { events: clean, voice: "guitar" },
      { events: drive, voice: "drive", gain: -3 },
    ]),
    cells,
  };
}

const GROUP_CLS = ["bg-muted", "bg-note-a/40", "bg-note-b/40", "bg-signal/60"];

export function VariationGroupsLab() {
  const [mode, setMode] = useState<VarMode>("grouped");
  const { playing, active, toggle } = usePlayer();
  const { lys, cells } = useMemo(() => buildVariations(mode), [mode]);
  const key = `vg-${mode}`;
  const kitIdx = active[0];
  const cur = playing === key && kitIdx !== undefined ? Math.floor((lys[0].events[kitIdx]?.start ?? 0) / 8) : null;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Eight cycles of one riff</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The riff&apos;s rhythm and shape never change. Compare eight identical cycles with the same eight cycles organized into
        groups, with the peak moving later and a last group that breaks the pattern.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        <Chip on={mode === "flat"} onClick={() => setMode("flat")}>
          Flat: 8 × the same
        </Chip>
        <Chip on={mode === "grouped"} onClick={() => setMode("grouped")}>
          Grouped: 3 + 3 + 2
        </Chip>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {cells.map((c, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md p-2 text-[11px] leading-tight",
              GROUP_CLS[c.group],
              cur === i && "ring-2 ring-foreground"
            )}
          >
            <div className="font-medium tabular-nums">{i + 1}</div>
            <div>{c.label}</div>
          </div>
        ))}
      </div>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 112 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Endings — Belkin ch. 18                                           */
/* ------------------------------------------------------------------ */

type EndKind = "one" | "all" | "fade" | "avoided";
const END_KINDS: { id: EndKind; label: string; text: string }[] = [
  { id: "one", label: "One dimension only", text: "The riff resolves to E, but the drums keep the same groove, the register stays the same, and it just stops. A stop sign, not an ending." },
  { id: "all", label: "Everything agrees", text: "The riff drops to the lowest register, the drums fill, the rhythm broadens, a final hit and a long chord. Every dimension says “end”." },
  { id: "fade", label: "Fade-out", text: "Layers leave one at a time and the dynamics sink further than anywhere before. An extreme of quiet, not just a soft bar." },
  { id: "avoided", label: "Avoided, then final", text: "The expected final hit lands on the wrong chord, the band pushes two more bars, then arrives. Frustrating the ending once makes the real one stronger." },
];

export function buildEnding(kind: EndKind): Layer[] {
  const drive: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  const run = (bars: number, at = 0, vel = 0.9) => {
    for (let i = 0; i < bars; i++) {
      drive.push(...place(CYCLE.split("|")[i % 2], at + i * 4, 0, vel));
      bass.push(...place(i % 2 ? "E1/2 D2/4 A1/4" : "E1/2 G1/2", at + i * 4, 0, vel));
    }
    kit.push(...groove(bars, "normal", "hat8", at, vel));
  };
  if (kind === "one") {
    run(4);
    drive.push(note(16, 1, [40, 47, 52], 0.85));
    bass.push(note(16, 1, [28], 0.85));
    kit.push(...groove(1, "normal", "hat8", 16, 0.9).filter((e) => e.start < 17));
  } else if (kind === "all") {
    run(3);
    // bar 4: broaden, descend, fill
    drive.push(note(12, 1, [43, 50], 0.95), note(13, 1.25, [41, 48], 0.95), note(14.25, 1.75, [38, 45], 1));
    bass.push(note(12, 1, [31], 0.95), note(13, 1.25, [29], 0.95), note(14.25, 1.75, [26], 1));
    kit.push(...fill(12, 0, 1));
    drive.push(note(16.5, 5, [28, 35, 40, 47], 1));
    bass.push(note(16.5, 5, [16], 1));
    kit.push(...hit(16.5), note(17.5, S, [CRASH], 0.35));
  } else if (kind === "fade") {
    for (let i = 0; i < 6; i++) {
      const v = Math.max(0.12, 0.9 - i * 0.15);
      drive.push(...place(CYCLE.split("|")[i % 2], i * 4, i >= 3 ? -12 : 0, v));
      if (i < 4) bass.push(...place(i % 2 ? "E1/2 D2/4 A1/4" : "E1/2 G1/2", i * 4, 0, v));
      if (i < 2) kit.push(...groove(1, "normal", "hat8", i * 4, v));
      else if (i < 4) kit.push(...groove(1, "half", "none", i * 4, v * 0.8));
    }
    drive.push(note(24, 4, [28, 35], 0.1));
  } else {
    run(3);
    kit.push(...fill(12, 8, 1));
    drive.push(...place(CYCLE.split("|")[1], 12, 0, 0.95).filter((e) => e.start < 14));
    // deceptive arrival on C
    drive.push(note(16, 2, [36, 43, 48], 1));
    bass.push(note(16, 2, [24], 1));
    kit.push(...hit(16));
    // push on
    drive.push(...place("E2/8! x/16 E2/16 G2/8 x/16 E2/16 Bb2/8 B2/8 D3/8 D#3/8", 18, 0, 1));
    bass.push(...place("E1/4 G1/4 Bb1/4 B1/4", 18, 0, 1));
    kit.push(...groove(1, "double", "hat16", 18, 1).map((e) => ({ ...e })), ...fill(22, 8, 1));
    drive.push(note(24, 5, [28, 35, 40, 47], 1));
    bass.push(note(24, 5, [16], 1));
    kit.push(...hit(24));
  }
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: drive, voice: "drive", gain: -3 },
  ]);
}

export function EndingLab() {
  const [kind, setKind] = useState<EndKind>("one");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildEnding(kind), [kind]);
  const info = END_KINDS.find((k) => k.id === kind)!;
  const key = `en-${kind}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Four endings for the same riff</div>
      <p className="mb-4 text-sm text-muted-foreground">Listen in order. The first one is the common student mistake.</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {END_KINDS.map((k) => (
          <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </Chip>
        ))}
      </div>
      <p className="mb-4 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 112 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Section or articulation? — Snyder ch. 13                          */
/* ------------------------------------------------------------------ */

type Param = "register" | "drums" | "timbre" | "loudness" | "pattern";
const PARAMS: { id: Param; label: string; kind: "primary" | "secondary" }[] = [
  { id: "pattern", label: "Riff pattern", kind: "primary" },
  { id: "register", label: "Register", kind: "secondary" },
  { id: "timbre", label: "Guitar sound", kind: "secondary" },
  { id: "drums", label: "Drum feel", kind: "secondary" },
  { id: "loudness", label: "Loudness", kind: "secondary" },
];
const RIFF_A = "E2/8! x/16 E2/16 G2/8 E2/8 A2/8 G2/8 E2/8 D2/8";
const RIFF_B = "E2/4! x/8 F2/8 x/8 F2/8 E2/8. x/16";

export function buildSection(on: Param[], brief: boolean): Layer[] {
  const clean: NoteEvent[] = [];
  const drive: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  const has = (p: Param) => on.includes(p);
  const total = 12;
  const changedBars = brief ? [4] : [4, 5, 6, 7, 8, 9, 10, 11];
  for (let bar = 0; bar < total; bar++) {
    const at = bar * 4;
    const ch = changedBars.includes(bar);
    const vel = ch && has("loudness") ? 1 : 0.6;
    const tr = ch && has("register") ? 12 : 0;
    const fig = ch && has("pattern") ? RIFF_B : RIFF_A;
    const g = place(fig, at, tr, vel);
    (ch && has("timbre") ? drive : clean).push(...g);
    bass.push(...place(ch && has("pattern") ? "E1/2 F1/2" : "E1/2 A1/4 D1/4", at, 0, vel));
    kit.push(...groove(1, ch && has("drums") ? "double" : "half", ch && has("drums") ? "crash4" : "hat8", at, vel));
  }
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: clean, voice: "guitar" },
    { events: drive, voice: "drive", gain: -3 },
  ]);
}

export function SectionLab() {
  const [on, setOn] = useState<Param[]>(["register"]);
  const [brief, setBrief] = useState(false);
  const { playing, active, toggle } = usePlayer();
  const lys = useMemo(() => buildSection(on, brief), [on, brief]);
  const key = `sec-${on.slice().sort().join("-")}-${brief}`;
  const kitIdx = active[0];
  const curBar = playing === key && kitIdx !== undefined ? Math.floor((lys[0].events[kitIdx]?.start ?? 0) / 4) : null;
  const n = on.length;
  const verdict = brief
    ? "The change lasts one bar and then everything returns. However many parameters change, it's heard as an interruption inside one section, not a new section."
    : n === 0
      ? "Nothing changes: one section."
      : n === 1
        ? on[0] === "pattern"
          ? "Only the riff changes. A new pattern in a primary parameter is the strongest single change, but with everything else constant it can still sound like a variation inside the section."
          : "One secondary parameter changes. Snyder's rule of thumb: that's an articulation within a section, not a new one."
        : n === 2
          ? "Two parameters: it depends on which ones and how much. Listen for whether it feels like a new place or the same place, intensified."
          : "Three or more parameters change at once and stay changed: almost certainly a new section.";
  const toggleP = (p: Param) => setOn((o) => (o.includes(p) ? o.filter((x) => x !== p) : [...o, p]));
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">New section, or the same one?</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Four bars of a riff, then a change. Choose what changes and decide, before reading the verdict, whether you hear a
        new section.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {PARAMS.map((p) => (
          <Chip key={p.id} on={on.includes(p.id)} onClick={() => toggleP(p.id)}>
            {p.label}
            <span className="ml-1 text-[10px] opacity-60">{p.kind === "primary" ? "primary" : "secondary"}</span>
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        <Chip on={!brief} onClick={() => setBrief(false)}>
          Change stays (8 bars)
        </Chip>
        <Chip on={brief} onClick={() => setBrief(true)}>
          Change lasts 1 bar, then back
        </Chip>
      </div>
      <div className="mb-3 flex gap-0.5" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => i).map((b) => {
          const ch = brief ? b === 4 : b >= 4;
          return <div key={b} className={cn("h-2 flex-1 rounded-sm", curBar === b ? "bg-foreground" : ch && n ? "bg-signal/70" : "bg-muted")} />;
        })}
      </div>
      <p className="mb-4 text-sm">
        <span className="font-medium">{n} parameter{n === 1 ? "" : "s"} changed.</span> {verdict}
      </p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Form plan check — rules from Belkin, Osborn, Snyder               */
/* ------------------------------------------------------------------ */

type Section = {
  id: string;
  name: string;
  material: string;
  seconds: number;
  energy: number;
  contrast: number;
  punct: number;
};

type Plan = { title: string; ending: "climax" | "fade" | "rounding"; sections: Section[] };

const STORAGE_KEY = "learnform.formplan.v1";

const EXAMPLE_PLAN: Plan = {
  title: "Example: a terminally climactic plan",
  ending: "climax",
  sections: [
    { id: "s1", name: "Intro", material: "A", seconds: 40, energy: 2, contrast: 0, punct: 3 },
    { id: "s2", name: "Verse 1", material: "B", seconds: 50, energy: 4, contrast: 4, punct: 3 },
    { id: "s3", name: "Chorus 1", material: "C", seconds: 35, energy: 6, contrast: 4, punct: 5 },
    { id: "s4", name: "Verse 2", material: "B'", seconds: 45, energy: 5, contrast: 4, punct: 3 },
    { id: "s5", name: "Chorus 2", material: "C", seconds: 35, energy: 7, contrast: 3, punct: 6 },
    { id: "s6", name: "Break (quiet)", material: "A'", seconds: 60, energy: 2, contrast: 7, punct: 4 },
    { id: "s7", name: "Build", material: "D", seconds: 70, energy: 7, contrast: 4, punct: 3 },
    { id: "s8", name: "Terminal climax", material: "E", seconds: 90, energy: 10, contrast: 6, punct: 10 },
  ],
};

const EMPTY_PLAN: Plan = { title: "", ending: "climax", sections: [] };

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

function baseLetter(m: string) {
  return m.trim().replace(/['′’]+$/, "").toUpperCase();
}

type Finding = { level: "warn" | "ok" | "info"; text: string; source: string };

export function checkPlan(plan: Plan): Finding[] {
  const s = plan.sections;
  const out: Finding[] = [];
  if (s.length < 2) return [{ level: "info", text: "Add at least two sections to check the plan.", source: "" }];
  const last = s[s.length - 1];
  const energies = s.map((x) => x.energy);
  const maxE = Math.max(...energies);
  const total = s.reduce((a, x) => a + (x.seconds || 0), 0);

  // 1. ending
  if (plan.ending === "climax") {
    if (last.energy < maxE)
      out.push({ level: "warn", text: `You chose a climactic ending, but the last section (energy ${last.energy}) is not the peak (${maxE}). Ending on a secondary climax tends to disappoint.`, source: "Belkin ch. 18" });
    else out.push({ level: "ok", text: "The ending is the energy peak.", source: "Belkin ch. 18" });
  }
  if (plan.ending === "fade") {
    const minE = Math.min(...energies);
    if (last.energy > minE) out.push({ level: "warn", text: "A fade-out ending should go further than any internal calm; the last section isn't the lowest energy.", source: "Belkin ch. 18" });
  }
  if (plan.ending === "rounding") {
    const letters = new Set(s.slice(0, -1).map((x) => baseLetter(x.material)));
    if (!letters.has(baseLetter(last.material)))
      out.push({ level: "warn", text: "A rounding-off ending needs familiar material, but the last section's material hasn't been heard before.", source: "Belkin ch. 17–18" });
  }
  // 2. final punctuation strongest
  const maxMidPunct = Math.max(...s.slice(0, -1).map((x) => x.punct));
  if (last.punct <= maxMidPunct)
    out.push({ level: "warn", text: `The final punctuation (${last.punct}) should be stronger than every internal one (strongest so far: ${maxMidPunct}).`, source: "Belkin ch. 5, 18" });
  // 3. heavy internal punctuation
  const heavy = s.slice(0, -1).filter((x) => x.punct >= 7);
  if (heavy.length)
    out.push({ level: "warn", text: `Strong stops inside the piece (${heavy.map((x) => x.name || "?").join(", ")}) cost momentum. Consider “yes, but…” endings — let one dimension keep going.`, source: "Belkin ch. 5, 18" });
  // 4. equal peaks
  const peaks = s.filter((x, i) => (i === 0 || x.energy > s[i - 1].energy) && (i === s.length - 1 || x.energy >= s[i + 1].energy) && x.energy >= 6);
  const peakVals = peaks.map((p) => p.energy);
  const dup = peakVals.filter((v, i) => peakVals.indexOf(v) !== i);
  if (dup.length)
    out.push({ level: "warn", text: `Several peaks share the same height (${[...new Set(dup)].join(", ")}). Repeated equal climaxes are heard as getting weaker; give the peaks a hierarchy.`, source: "Belkin ch. 13" });
  // 5. contrast budget
  for (let i = 1; i < s.length - 1; i++)
    if (s[i].contrast >= 7 && s[i + 1].contrast >= 7)
      out.push({ level: "warn", text: `Two big contrasts in a row (into “${s[i].name}” and “${s[i + 1].name}”). Too many strong contrasts close together sound like fragments.`, source: "Belkin ch. 11" });
  const big = s.filter((x) => x.contrast >= 7).length;
  if (big === 0 && s.length >= 5)
    out.push({ level: "info", text: "No contrast above 6 anywhere. Fine for a process piece; for a long song, check that something really changes.", source: "Belkin ch. 11" });
  // 6. falling stretches
  let fall = 0;
  for (let i = 1; i < s.length; i++) {
    fall = s[i].energy < s[i - 1].energy ? fall + 1 : 0;
    if (fall >= 2 && i < s.length - 1) {
      out.push({ level: "warn", text: `Energy falls for ${fall + 1} sections in a row before “${s[i].name}”. Long descents mid-piece lose curiosity; shorten it or end it with a surprise.`, source: "Belkin ch. 13" });
      break;
    }
  }
  // 7. returns / through-composition
  const seen: string[] = [];
  let returns = 0;
  s.forEach((x, i) => {
    const L = baseLetter(x.material);
    if (L && seen.includes(L) && baseLetter(s[i - 1].material) !== L) returns++;
    if (L) seen.push(L);
  });
  if (returns === 0)
    out.push({ level: "info", text: "No material returns after contrast: this plan is through-composed. It needs another unifier — shared motive, groove, timbre or key — and usually its most memorable material at the end.", source: "Osborn 2011" });
  else out.push({ level: "ok", text: `${returns} return${returns > 1 ? "s" : ""} of earlier material after contrast.`, source: "Belkin ch. 17" });
  // 8. short sections
  const brief = s.slice(1, -1).filter((x) => x.seconds > 0 && x.seconds < 10);
  if (brief.length)
    out.push({ level: "info", text: `Very short sections (${brief.map((x) => x.name).join(", ")}): a change that lasts less than short-term memory and then goes back is heard as an interruption, not a section. Fine if that's the intent.`, source: "Snyder ch. 13" });
  // 9. memory
  const long = s.filter((x) => x.seconds > 90);
  if (long.length)
    out.push({ level: "info", text: `Long sections (${long.map((x) => x.name).join(", ")}) are remembered by their landmarks, not their detail. Make sure something salient happens inside them.`, source: "Snyder" });
  if (total) out.push({ level: "info", text: `Total length about ${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}.`, source: "" });
  return out;
}

function planAsText(p: Plan) {
  const rows = p.sections.map(
    (x, i) => `${i + 1}. ${x.name} [${x.material}] ${x.seconds}s · energy ${x.energy} · contrast in ${x.contrast} · punctuation ${x.punct}`
  );
  return [`# ${p.title || "Form plan"} (ending: ${p.ending})`, ...rows, "", ...checkPlan(p).map((f) => `- ${f.level === "warn" ? "⚠ " : ""}${f.text}${f.source ? ` (${f.source})` : ""}`)].join("\n");
}

function NumCell({ value, onChange, max = 10, min = 0, w = "w-14" }: { value: number; onChange: (n: number) => void; max?: number; min?: number; w?: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className={cn("h-8 px-2 tabular-nums", w)}
    />
  );
}

export function FormPlanner() {
  const [plan, setPlan] = useState<Plan>(EXAMPLE_PLAN);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (raw) setPlan(JSON.parse(raw) as Plan);
    } catch {
      /* storage unavailable: keep the example */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      /* ignore */
    }
  }, [plan, loaded]);

  const findings = useMemo(() => checkPlan(plan), [plan]);
  const upd = (id: string, patch: Partial<Section>) =>
    setPlan((p) => ({ ...p, sections: p.sections.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const maxSec = Math.max(1, ...plan.sections.map((x) => x.seconds));

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Form plan check</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One row per section. Energy 0–10; <em>contrast</em> = how big the change is coming <em>into</em> the section
        (1–10); <em>punctuation</em> = how strongly it ends (1–10). Use letters for material (A, B, A′). The plan is kept
        in this browser only.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Song title"
          value={plan.title}
          onChange={(e) => setPlan((p) => ({ ...p, title: e.target.value }))}
          className="h-8 max-w-xs"
        />
        <span className="text-xs text-muted-foreground">Ending:</span>
        {(["climax", "fade", "rounding"] as const).map((k) => (
          <Chip key={k} on={plan.ending === k} onClick={() => setPlan((p) => ({ ...p, ending: k }))}>
            {k === "climax" ? "Climactic" : k === "fade" ? "Fade-out" : "Rounding-off"}
          </Chip>
        ))}
      </div>

      {/* energy curve */}
      <div className="mb-3 flex h-28 gap-1 rounded-md bg-muted/40 p-2" aria-label="Energy curve">
        {plan.sections.map((x) => (
          <div key={x.id} className="flex h-full min-w-0 flex-col" style={{ flexGrow: Math.max(1, x.seconds / maxSec) * 10, flexBasis: 0 }}>
            <div className="flex flex-1 items-end">
              <div className="w-full rounded-t-sm bg-signal" style={{ height: `${(x.energy / 10) * 100}%`, minHeight: 2 }} title={`${x.name}: ${x.energy}`} />
            </div>
            <div className="mt-1 h-3 truncate text-center text-[10px] leading-3 text-muted-foreground">{x.material || "·"}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-2 font-normal">Section</th>
              <th className="py-1 pr-2 font-normal">Material</th>
              <th className="py-1 pr-2 font-normal">Seconds</th>
              <th className="py-1 pr-2 font-normal">Energy</th>
              <th className="py-1 pr-2 font-normal">Contrast in</th>
              <th className="py-1 pr-2 font-normal">Punctuation</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plan.sections.map((x) => (
              <tr key={x.id}>
                <td className="py-1 pr-2">
                  <Input value={x.name} onChange={(e) => upd(x.id, { name: e.target.value })} className="h-8" />
                </td>
                <td className="py-1 pr-2">
                  <Input value={x.material} onChange={(e) => upd(x.id, { material: e.target.value })} className="h-8 w-16" />
                </td>
                <td className="py-1 pr-2">
                  <NumCell value={x.seconds} max={1200} onChange={(n) => upd(x.id, { seconds: n })} w="w-20" />
                </td>
                <td className="py-1 pr-2">
                  <NumCell value={x.energy} onChange={(n) => upd(x.id, { energy: n })} />
                </td>
                <td className="py-1 pr-2">
                  <NumCell value={x.contrast} onChange={(n) => upd(x.id, { contrast: n })} />
                </td>
                <td className="py-1 pr-2">
                  <NumCell value={x.punct} min={1} onChange={(n) => upd(x.id, { punct: n })} />
                </td>
                <td className="py-1">
                  <Button size="icon" variant="ghost" aria-label={`Remove ${x.name}`} onClick={() => setPlan((p) => ({ ...p, sections: p.sections.filter((y) => y.id !== x.id) }))}>
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setPlan((p) => ({
              ...p,
              sections: [...p.sections, { id: newId(), name: `Section ${p.sections.length + 1}`, material: "", seconds: 30, energy: 5, contrast: 4, punct: 4 }],
            }))
          }
        >
          <Plus /> Add section
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPlan(EXAMPLE_PLAN)}>
          Load example
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPlan(EMPTY_PLAN)}>
          Clear
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(planAsText(plan));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          <Copy /> {copied ? "Copied" : "Copy as text"}
        </Button>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {findings.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", f.level === "warn" ? "bg-destructive" : f.level === "ok" ? "bg-signal" : "bg-muted-foreground/50")} />
            <span>
              {f.text} {f.source && <span className="text-xs text-muted-foreground">({f.source})</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
