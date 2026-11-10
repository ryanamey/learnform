"use client";

import { useMemo, useState } from "react";

import { parseNotation, type NoteEvent } from "@/lib/music/notation";
import { finalize, groove, note, S, CRASH, HAT, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

const CHUG = -1;

/* ------------------------------------------------------------------ */
/* 1. Tension builder — Farbood 2012 (loudness & pitch weight 3,        */
/*    tempo & onset density weight 2, harmony 1)                        */
/* ------------------------------------------------------------------ */

const BASE_RIFF = parseNotation("E2/8! x/16 E2/16 G2/8 x/16 E2/16 Bb2/8. A2/16 G2/8 E2/8").events; // 1 bar
type Lever = "loud" | "register" | "density" | "tempo";
const LEVERS: { id: Lever; label: string; weight: number }[] = [
  { id: "loud", label: "Loudness", weight: 3 },
  { id: "register", label: "Register", weight: 3 },
  { id: "density", label: "Density", weight: 2 },
  { id: "tempo", label: "Tempo", weight: 2 },
];
const BARS = 8;

function buildTension(on: Record<Lever, boolean>) {
  const gtr: NoteEvent[] = [];
  const kit: NoteEvent[] = [];
  let t = 0;
  const curve: number[] = [];
  for (let b = 0; b < BARS; b++) {
    const p = b / (BARS - 1); // 0 → 1
    const vel = on.loud ? 0.35 + 0.65 * p : 0.7;
    const transpose = on.register ? [0, 0, 2, 3, 5, 7, 10, 12][b] : 0;
    const scale = on.tempo ? 1 - 0.28 * p : 1; // shrinking bar = faster
    const barLen = 4 * scale;
    for (const e of BASE_RIFF) {
      const midi = e.midi[0] === CHUG ? e.midi : e.midi.map((m) => m + transpose);
      gtr.push(note(t + e.start * scale, e.dur * scale, midi, e.midi[0] === CHUG ? vel * 0.5 : vel));
    }
    // drums: kick on 1, snare on 3 (half-time) → backbeat → 8ths → 16ths as density grows
    const level = on.density ? Math.min(3, Math.floor(p * 4)) : 1;
    kit.push(note(t, S, [KICK], vel));
    if (level === 0) kit.push(note(t + 2 * scale, S, [SNARE], vel * 0.8));
    else {
      kit.push(note(t + 1 * scale, S, [SNARE], vel), note(t + 3 * scale, S, [SNARE], vel), note(t + 2 * scale, S, [KICK], vel));
    }
    const hatSteps = level >= 3 ? 16 : level >= 2 ? 8 : level >= 1 ? 4 : 0;
    for (let i = 0; i < hatSteps; i++) kit.push(note(t + (i * 4 * scale) / hatSteps, S, [HAT], vel * (i % 2 ? 0.5 : 0.8)));
    if (on.density && level >= 3) for (let i = 0; i < 4; i++) kit.push(note(t + i * scale + 0.5 * scale, S, [KICK], vel * 0.7));
    // Farbood-style weighted sum of the active trends
    let tension = 0;
    let wsum = 0;
    for (const l of LEVERS) {
      wsum += l.weight;
      if (on[l.id]) tension += l.weight * p;
    }
    curve.push(wsum ? tension / wsum : 0);
    t += barLen;
  }
  // arrival
  kit.push(note(t, S, [CRASH], 1), note(t, S, [KICK], 1));
  gtr.push(note(t, 2, [40, 47, 52], 1));
  return {
    layers: [
      { events: finalize(kit), voice: "kit" as const },
      { events: finalize(gtr), voice: "drive" as const, gain: -2 },
    ],
    curve,
  };
}

export function TensionLab() {
  const [on, setOn] = useState<Record<Lever, boolean>>({ loud: true, register: false, density: false, tempo: false });
  const { playing, active, toggle } = usePlayer();
  const { layers, curve } = useMemo(() => buildTension(on), [on]);
  const key = `tl-${Object.entries(on).map(([k, v]) => (v ? k : "")).join("")}`;
  const isPlaying = playing === key;
  // current bar from guitar layer
  const gIdx = active[1];
  const cur = isPlaying && gIdx !== undefined ? Math.min(BARS - 1, Math.floor((gIdx ?? 0) / BASE_RIFF.length)) : null;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Tension builder</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One bar of riff, eight times, then an arrival. Switch on the levers one by one. The bars show a rough
        Farbood-style estimate (loudness and register weigh most, then tempo and density).
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {LEVERS.map((l) => (
          <Chip key={l.id} on={on[l.id]} onClick={() => setOn((s) => ({ ...s, [l.id]: !s[l.id] }))}>
            {l.label} <span className="text-[10px] text-muted-foreground">×{l.weight}</span>
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex items-end gap-1.5" style={{ height: 80 }} aria-label="Estimated tension per bar">
        {curve.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-t-sm transition-all", cur === i ? "bg-foreground" : "bg-signal")}
              style={{ height: `${Math.max(4, v * 64)}px` }}
            />
            <span className="text-[10px] text-muted-foreground">{i + 1}</span>
          </div>
        ))}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full rounded-t-sm bg-note-c" style={{ height: 70 }} />
          <span className="text-[10px] text-muted-foreground">↓</span>
        </div>
      </div>
      <PlayButton playing={isPlaying} label="Play the build" onClick={() => toggle(key, layers, { bpm: 104 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Textural cues — Schwitzgebel 2025                                 */
/* ------------------------------------------------------------------ */

type Cue = "none" | "acceleration" | "withholding" | "soar" | "upbeat";
const CUES: { id: Cue; label: string; text: string }[] = [
  { id: "none", label: "No cue", text: "The new section just starts. Clear, but nothing announces it." },
  { id: "acceleration", label: "Acceleration", text: "The beat layer speeds up (8ths → 16ths → 32nds on the snare) into the boundary." },
  { id: "withholding", label: "Withholding", text: "Layers drop out suddenly — here the drums vanish for the last bar. The gap makes the arrival land." },
  { id: "soar", label: "Soar", text: "A fast rising line (a 'riser') pulls the ear upward into the boundary." },
  { id: "upbeat", label: "Upbeat", text: "One new event on the upbeat before the downbeat: a pickup fill and hit." },
];
const A_RIFF = parseNotation("E2/4! x/8 E2/8 G2/4 x/8 E2/8").events; // sparse section A (1 bar)
const B_RIFF = parseNotation("[E2,B2]/8! x/16 x/16 [E2,B2]/8 x/16 [G2,D3]/16 [G2,D3]/8 x/16 x/16 [Bb2,F3]/8! [A2,E3]/8").events; // full section B

export function CueLab() {
  const [cue, setCue] = useState<Cue>("withholding");
  const { playing, toggle } = usePlayer();

  const layers = useMemo(() => {
    const gtr: NoteEvent[] = [];
    const kit: NoteEvent[] = [];
    // Section A: 3 bars sparse (half time)
    for (let b = 0; b < 3; b++) for (const e of A_RIFF) gtr.push(note(b * 4 + e.start, e.dur, e.midi, e.midi[0] === CHUG ? 0.3 : 0.7));
    kit.push(...groove(3, "half", "hat8", 0, 0.6));
    // Cue bar (bar 4)
    const c0 = 12;
    if (cue === "withholding") {
      for (const e of A_RIFF) gtr.push(note(c0 + e.start, e.dur, e.midi, e.midi[0] === CHUG ? 0.3 : 0.7));
    } else {
      for (const e of A_RIFF) gtr.push(note(c0 + e.start, e.dur, e.midi, e.midi[0] === CHUG ? 0.3 : 0.7));
      if (cue === "acceleration") {
        kit.push(note(c0, S, [KICK], 0.7));
        for (let i = 0; i < 4; i++) kit.push(note(c0 + i * 0.5, S, [SNARE], 0.5 + i * 0.05));
        for (let i = 0; i < 4; i++) kit.push(note(c0 + 2 + i * 0.25, S, [SNARE], 0.65 + i * 0.05));
        for (let i = 0; i < 8; i++) kit.push(note(c0 + 3 + i * 0.125, S, [SNARE], 0.8 + i * 0.025));
      } else {
        kit.push(...groove(1, "half", "hat8", c0, 0.6));
      }
      if (cue === "soar") for (let i = 0; i < 16; i++) gtr.push(note(c0 + 2 + i * 0.125, 0.125, [52 + i * 2], 0.35 + i * 0.03));
      if (cue === "upbeat") {
        kit.push(note(c0 + 3.5, S, [SNARE], 0.9), note(c0 + 3.75, S, [SNARE], 1));
        gtr.push(note(c0 + 3.5, 0.5, [47, 52], 0.9));
      }
    }
    // Section B: 2 bars full, normal time + crash
    const b0 = 16;
    for (let b = 0; b < 2; b++) for (const e of B_RIFF) gtr.push(note(b0 + b * 4 + e.start, e.dur, e.midi, e.midi[0] === CHUG ? 0.35 : 1));
    kit.push(...groove(2, "normal", "hat8", b0, 0.95), note(b0, S, [CRASH], 1));
    return [
      { events: finalize(kit), voice: "kit" as const },
      { events: finalize(gtr), voice: "drive" as const, gain: -2 },
    ];
  }, [cue]);

  const c = CUES.find((x) => x.id === cue)!;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Textural cue lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Section A (sparse, 3 bars) → <strong>cue bar</strong> → Section B (full). Same A, same B — only the cue changes.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {CUES.map((x) => (
          <Chip key={x.id} on={cue === x.id} onClick={() => setCue(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <PlayButton playing={playing === cue} label="Play A → cue → B" onClick={() => toggle(cue, layers, { bpm: 100 })} />
      <p className="mt-3 text-sm">{c.text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Climax shapes — energy-curve sketches                             */
/* ------------------------------------------------------------------ */

const SHAPES: { id: string; label: string; source: string; points: number[]; peak: number[]; text: string }[] = [
  {
    id: "telos",
    label: "Telos chorus (pop/rock norm)",
    source: "Nobile 2022",
    points: [3, 4, 7, 4, 5, 8, 5, 6, 9, 9],
    peak: [2, 5, 8],
    text: "Energy rises toward each chorus and falls back. The goal is the repeated chorus; the last one is biggest.",
  },
  {
    id: "stair",
    label: "Stairstepper",
    source: "Schwitzgebel 2025",
    points: [3, 4, 5, 4, 5, 6.5, 5, 6, 8, 9.5],
    peak: [9],
    text: "Each chorus adds texture: a terraced climb. The listener learns the steps and the last one fulfils them.",
  },
  {
    id: "release",
    label: "Release",
    source: "Schwitzgebel 2025",
    points: [3, 5, 6, 4, 6, 7, 6.5, 2, 1, 9.5],
    peak: [9],
    text: "A bridge builds, then drops to near-silence; an upbeat launches the full final chorus. Contrast is the climax.",
  },
  {
    id: "tcf",
    label: "Terminal climax",
    source: "Osborn 2013 (Tool, “Pushit”)",
    points: [2, 3, 4, 5, 6, 3, 2, 7, 6, 9.8],
    peak: [9],
    text: "Verses and choruses stay understated; a loud–soft–loud middle; then a single new section at the end carries the peak. It never returns.",
  },
  {
    id: "cumulative",
    label: "Cumulative build",
    source: "Spicer 2004",
    points: [1, 2, 3, 4, 5, 6, 7, 8, 9, 9.8],
    peak: [9],
    text: "Layers are added one by one over a stable base until the full texture arrives — the post-rock / Reich model.",
  },
];

export function ClimaxShapes() {
  const [id, setId] = useState("tcf");
  const s = SHAPES.find((x) => x.id === id)!;
  const W = 600;
  const H = 140;
  const x = (i: number) => 20 + (i / (s.points.length - 1)) * (W - 40);
  const y = (v: number) => H - 14 - (v / 10) * (H - 28);
  const d = s.points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-3 font-serif text-lg">Where the climax goes</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {SHAPES.map((x) => (
          <Chip key={x.id} on={id === x.id} onClick={() => setId(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Energy curve: ${s.label}`}>
        <line x1={20} x2={W - 20} y1={H - 14} y2={H - 14} className="stroke-border" />
        <path d={d} fill="none" className="stroke-signal" strokeWidth={3} strokeLinejoin="round" />
        {s.points.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={s.peak.includes(i) ? 6 : 3} className={s.peak.includes(i) ? "fill-note-c" : "fill-signal"} />
        ))}
        <text x={20} y={12} className="fill-muted-foreground" style={{ fontSize: 11 }}>
          energy
        </text>
        <text x={W - 20} y={H - 2} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 11 }}>
          time →
        </text>
      </svg>
      <p className="mt-2 text-sm">
        {s.text} <span className="text-muted-foreground">— {s.source}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Gradual process — Reich; perceptual decoupling — Hove 2016        */
/* ------------------------------------------------------------------ */

const OSTINATO = parseNotation("E3/16 B3/16 D4/16 E3/16 B3/16 D4/16 G3/16 B3/16 E3/16 B3/16 D4/16 E3/16 A3/16 B3/16 D4/16 B3/16").events; // 1 bar
const MELODY = [64, 67, 69, 71, 74, 71, 69, 67]; // slow layer, one note added per cycle

type ProcessMode = "addition" | "phase";

export function ProcessLab() {
  const [mode, setMode] = useState<ProcessMode>("addition");
  const { playing, toggle } = usePlayer();
  const CYCLES = 10;

  const layers = useMemo(() => {
    const ost: NoteEvent[] = [];
    for (let c = 0; c < CYCLES; c++) for (const e of OSTINATO) ost.push(note(c * 4 + e.start, e.dur, e.midi, 0.55));
    if (mode === "addition") {
      const slow: NoteEvent[] = [];
      for (let c = 1; c < CYCLES; c++) {
        const k = Math.min(c, MELODY.length); // c-th cycle has c notes of the slow melody
        for (let j = 0; j < k; j++) slow.push(note(c * 4 + (j * 4) / MELODY.length, 4 / MELODY.length, [MELODY[j]], 0.5 + 0.04 * c));
      }
      return [
        { events: finalize(ost), voice: "guitar" as const },
        { events: finalize(slow), voice: "voice" as const, gain: 2 },
      ];
    }
    // phase: second copy plays 1/16 of a bar slower per 4 cycles → drifts against the first
    const ph: NoteEvent[] = [];
    const stretch = 1 + 1 / (16 * 4); // gains one sixteenth every 4 bars
    for (let c = 0; c < CYCLES; c++) for (const e of OSTINATO) ph.push(note((c * 4 + e.start) * stretch, e.dur, e.midi.map((m) => m + 12), 0.4));
    return [
      { events: finalize(ost), voice: "guitar" as const },
      { events: finalize(ph), voice: "guitar" as const, gain: -3 },
    ];
  }, [mode]);

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Gradual process lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        A one-bar ostinato repeats ten times. Listen to <em>where your attention goes</em> as it repeats.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        <Chip on={mode === "addition"} onClick={() => setMode("addition")}>
          Additive: one new note per cycle
        </Chip>
        <Chip on={mode === "phase"} onClick={() => setMode("phase")}>
          Phase: a copy slowly drifts
        </Chip>
      </div>
      <PlayButton playing={playing === mode} label="Play 10 cycles" onClick={() => toggle(mode, layers, { bpm: 92 })} />
      <p className="mt-3 text-sm">
        {mode === "addition"
          ? "The ostinato quickly stops being 'news' — that is the carrier. The slow melody grows by one note each cycle, so the change is audible but gradual: Reich's 'minute hand on a watch'."
          : "A second copy, an octave up, runs a hair slower and gradually slips against the first. Nothing new is added — the texture changes on its own as the alignment shifts."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Groove and syncopation — Witek et al. 2014 (inverted U)            */
/* ------------------------------------------------------------------ */

const GROOVES: { id: string; label: string; kick: number[]; snare: number[]; text: string }[] = [
  { id: "low", label: "Low syncopation", kick: [0, 8], snare: [4, 12], text: "Every hit on a strong position. Clear, but little to engage prediction." },
  {
    id: "mid",
    label: "Medium syncopation",
    kick: [0, 6, 10],
    snare: [4, 12, 15],
    text: "A few off-beat kicks against a clear backbeat: the meter is contradicted but not undermined. In Witek's study, medium syncopation scored highest for pleasure and the urge to move.",
  },
  {
    id: "high",
    label: "High syncopation",
    kick: [3, 6, 9, 13],
    snare: [2, 7, 11, 14],
    text: "Most hits avoid strong positions. The listener struggles to find the beat — interesting to analyse, harder to move to.",
  },
];

export function GrooveLab() {
  const [id, setId] = useState("mid");
  const { playing, toggle } = usePlayer();
  const g = GROOVES.find((x) => x.id === id)!;
  const layers = useMemo(() => {
    const kit: NoteEvent[] = [];
    for (let b = 0; b < 4; b++) {
      for (const k of g.kick) kit.push(note(b * 4 + k * S, S, [KICK], 0.9));
      for (const s of g.snare) kit.push(note(b * 4 + s * S, S, [SNARE], 0.85));
      for (let i = 0; i < 8; i++) kit.push(note(b * 4 + i * 0.5, S, [HAT], i % 2 ? 0.4 : 0.6));
    }
    const bass: NoteEvent[] = [];
    for (let b = 0; b < 4; b++) for (const k of g.kick) bass.push(note(b * 4 + k * S, 0.4, [28 + (b % 2 ? 3 : 0)], 0.8));
    return [
      { events: finalize(kit), voice: "kit" as const },
      { events: finalize(bass), voice: "bass" as const },
    ];
  }, [g]);
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Groove lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Same tempo, same sounds. Rate each one: how much do you want to move? Then ask the same of someone who isn&apos;t a
        drummer.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {GROOVES.map((x) => (
          <Chip key={x.id} on={id === x.id} onClick={() => setId(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <PlayButton playing={playing === id} label="Play 4 bars" onClick={() => toggle(id, layers, { bpm: 100 })} />
      <p className="mt-3 text-sm">{g.text}</p>
    </div>
  );
}
