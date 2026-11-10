"use client";

import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";

import { parseNotation, type NoteEvent } from "@/lib/music/notation";
import { finalize, groove, lcm, note, S, twosAndThrees, CRASH, type Cymbal, type Feel } from "@/lib/music/patterns";
import { Button } from "@/components/ui/button";
import { StepGrid, type GridRow } from "./step-grid";
import { usePlayer } from "./use-player";

const E2 = 40;
const B2 = 47;
const CHUG = -1;

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button size="sm" variant={on ? "secondary" : "ghost"} aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}

function PlayButton({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return (
    <Button variant={playing ? "secondary" : "signal"} onClick={onClick}>
      {playing ? <Pause /> : <Play />} {playing ? "Stop" : label}
    </Button>
  );
}

/** Index of the pulse (sixteenth) currently sounding, from the drum layer's active event. */
function stepOf(events: NoteEvent[], idx: number | undefined) {
  if (idx === undefined) return null;
  const e = events[idx];
  return e ? Math.round(e.start / S) : null;
}

/* ------------------------------------------------------------------ */
/* 1. Grouping vs displacement dissonance (Krebs; Biamonte)            */
/* ------------------------------------------------------------------ */

type MeterPreset = { id: string; label: string; kind: "G" | "D"; n: number; offset: number; note: string };
const METER_PRESETS: MeterPreset[] = [
  { id: "c", label: "Consonant (riff in 4s)", kind: "G", n: 4, offset: 0, note: "Riff accents line up with every beat. No dissonance: this is the reference." },
  { id: "g43", label: "G4/3 — riff in 3s", kind: "G", n: 3, offset: 0, note: "Riff accents every 3 sixteenths against beats every 4. They realign every 12 sixteenths (3 beats) — but the bar line only every 3 bars." },
  { id: "g45", label: "G5/4 — riff in 5s", kind: "G", n: 5, offset: 0, note: "A 5-sixteenth cell against the 4-sixteenth beat. Alignment every 20 sixteenths; with the bar, every 5 bars. Chancellor: five 'keeps snapping back'." },
  { id: "g47", label: "G7/4 — riff in 7s", kind: "G", n: 7, offset: 0, note: "A 7-sixteenth cell. The phase relation keeps changing for 7 bars before the riff lands on a downbeat again. Long cycle = long tension." },
  { id: "d41", label: "D4+1 — riff shifted 1/16", kind: "D", n: 4, offset: 1, note: "Same grouping as the beat (4s) but displaced by one sixteenth: every accent falls just after the beat. It never realigns — the tension is constant until you move it back." },
  { id: "d42", label: "D4+2 — riff on the '&'", kind: "D", n: 4, offset: 2, note: "Displaced by an eighth: accents on every off-beat. Strong pull, easy to hear as syncopation rather than a new meter." },
];

export function MeterLab() {
  const [id, setId] = useState("g43");
  const preset = METER_PRESETS.find((p) => p.id === id)!;
  const { playing, active, toggle } = usePlayer();

  const { layers, rows, marks, total } = useMemo(() => {
    const n = preset.n;
    const steps = preset.kind === "G" ? Math.max(lcm(16, n), 32) : 32;
    const bars = steps / 16;
    const drums = finalize(groove(bars, "normal", "hat8"));
    const gtr: NoteEvent[] = [];
    const gCells: number[] = [];
    for (let i = 0; i < steps; i++) {
      const pos = (i - preset.offset + n * 100) % n;
      const start = pos === 0;
      gCells.push(start ? 2 : 1);
      gtr.push(start ? note(i * S, S * 1.5, [E2, B2], 1) : note(i * S, S, [CHUG], 0.3));
    }
    const beatCells = Array.from({ length: steps }, (_, i) => (i % 4 === 0 ? 2 : 0));
    const mk: number[] = [];
    for (let i = 0; i < steps; i++) if (i % 4 === 0 && gCells[i] === 2) mk.push(i);
    return {
      layers: [
        { events: drums, voice: "kit" as const },
        { events: finalize(gtr), voice: "drive" as const, gain: -2 },
      ],
      rows: [
        { label: "Beat (4s)", cells: beatCells, tone: "b" as const },
        { label: `Riff (${n}s)`, cells: gCells, tone: "a" as const },
      ] satisfies GridRow[],
      marks: mk,
      total: steps,
    };
  }, [preset]);

  const isPlaying = playing === id;
  const step = isPlaying ? stepOf(layers[1].events, active[1]) : null;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Metric dissonance lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Drums keep a plain 4/4 backbeat. The guitar plays a continuous sixteenth-note chug; only its <em>accents</em>{" "}
        change. Orange marks under the grid = points where riff and beat realign.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {METER_PRESETS.map((p) => (
          <Chip key={p.id} on={p.id === id} onClick={() => setId(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-3">
        <PlayButton playing={isPlaying} label="Play" onClick={() => toggle(id, layers, { bpm: 96, loops: 2, loopBeats: total / 4 })} />
        <span className="text-xs text-muted-foreground">
          {total / 16} bar{total / 16 > 1 ? "s" : ""} × 2 · 96 bpm
        </span>
      </div>
      <StepGrid rows={rows} active={step} marks={marks} />
      <p className="mt-3 text-sm">{preset.note}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Frame vs cycle (Lucas 2018; Pieslak 2007)                        */
/* ------------------------------------------------------------------ */

const RIFF_LENGTHS = [
  { len: 7, label: "7 sixteenths" },
  { len: 9, label: "9 sixteenths" },
  { len: 11, label: "11 sixteenths" },
  { len: 13, label: "13 sixteenths" },
  { len: 18, label: "9 eighths" },
  { len: 25, label: "25 sixteenths" },
];
const ROOTS = [40, 43, 41, 46, 38, 45];

export function FrameCycleLab() {
  const [len, setLen] = useState(9);
  const [rot, setRot] = useState(0);
  const { playing, active, toggle } = usePlayer();
  const FRAME = 64; // 4 bars of 4/4

  const { layers, rows } = useMemo(() => {
    const groups = twosAndThrees(len);
    // build one riff cycle as step roles
    const cycle: { root: number | null; groupStart: boolean; riffStart: boolean }[] = [];
    groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++) cycle.push({ root: k === 0 ? ROOTS[gi % ROOTS.length] : null, groupStart: k === 0, riffStart: gi === 0 && k === 0 });
    });
    const gtr: NoteEvent[] = [];
    const roles: number[] = [];
    const band: number[] = [];
    for (let seg = 0; seg < 2; seg++) {
      for (let i = 0; i < FRAME; i++) {
        const abs = seg * FRAME + i;
        const ci = (i + rot) % len;
        const cyc = Math.floor((i + rot) / len);
        const c = cycle[ci];
        const remaining = FRAME - i;
        const cutPart = Math.floor((i + rot) / len) === Math.floor((FRAME - 1 + rot) / len) && (FRAME + rot) % len !== 0;
        if (seg === 0) {
          roles.push(c.riffStart ? 2 : cutPart ? 3 : c.groupStart ? 1 : 0);
          band.push(cyc);
        }
        if (c.root !== null) gtr.push(note(abs * S, S * Math.min(2, remaining), [c.root, c.root + 7], c.riffStart ? 1 : 0.8));
        else gtr.push(note(abs * S, S, [CHUG], 0.3));
      }
    }
    const drums = groove(8, "normal", "hat8");
    drums.push(note(0, S, [CRASH], 0.9), note(16, S, [CRASH], 0.9));
    const rowsOut: GridRow[] = [0, 1, 2, 3].map((b) => ({
      label: `Bar ${b + 1}`,
      cells: roles.slice(b * 16, b * 16 + 16).map((v) => (v === 0 ? 0 : v)),
      band: band.slice(b * 16, b * 16 + 16),
      tone: "a",
    }));
    return {
      layers: [
        { events: finalize(drums), voice: "kit" as const },
        { events: finalize(gtr), voice: "drive" as const, gain: -2 },
      ],
      rows: rowsOut,
    };
  }, [len, rot]);

  const key = `fc-${len}-${rot}`;
  const isPlaying = playing === key;
  const absStep = isPlaying ? stepOf(layers[1].events, active[1]) : null;
  const inFrame = absStep === null ? null : absStep % FRAME;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Frame vs. cycle lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The drums hold a 4-bar frame of 4/4 (crash on each new frame). The riff loops at its own length and is{" "}
        <span className="text-destructive">cut off</span> when the frame ends, then restarts on the next downbeat. Shaded
        bands = successive riff cycles; bright cells = riff start.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Riff length:</span>
        {RIFF_LENGTHS.map((r) => (
          <Chip key={r.len} on={r.len === len} onClick={() => { setLen(r.len); setRot(0); }}>
            {r.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Start the riff from step
          <input
            type="range"
            min={0}
            max={len - 1}
            value={rot}
            onChange={(e) => setRot(Number(e.target.value))}
            className="accent-[var(--signal)]"
            aria-label="Rotation"
          />
          <span className="w-6 font-mono text-foreground">{rot}</span>
        </label>
        <PlayButton playing={isPlaying} label="Play 2 frames" onClick={() => toggle(key, layers, { bpm: 112 })} />
      </div>
      <StepGrid rows={rows} active={inFrame === null ? null : inFrame % 16} activeRow={inFrame === null ? null : Math.floor(inFrame / 16)} />
      <p className="mt-3 text-sm text-muted-foreground">
        {rot === 0
          ? "Rotation 0: the riff starts where you'd expect. Now move the slider — the same riff, entered 'from the middle', makes the listener re-decide where it begins (Lucas's 'unexpected beginnings')."
          : `Rotation ${rot}: the frame opens mid-riff. Listen for the moment your ear re-hears where the riff 'really' starts.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Time feel & cymbals (Garza 2021)                                 */
/* ------------------------------------------------------------------ */

const FEELS: { id: Feel; label: string }[] = [
  { id: "quarter", label: "Quarter time" },
  { id: "half", label: "Half time" },
  { id: "normal", label: "Normal time" },
  { id: "double", label: "Double time" },
];
const CYMBALS: { id: Cymbal; label: string }[] = [
  { id: "crash4", label: "Crash on beats" },
  { id: "hat8", label: "Hat 8ths" },
  { id: "hat16", label: "Hat 16ths" },
  { id: "none", label: "No cymbal" },
];

// one 2-bar riff (fixed) — 7+9 sixteenths grouping across 2 bars
const FEEL_RIFF = "E2/8! x/16 x/16 E2/16 x/16 G2/8 E2/8! x/16 x/16 F2/16 x/16 Bb1/8 E2/8! x/16 x/16 E2/16 x/16 G2/8 A2/8 G2/16 F2/16 E2/4";

export function TimeFeelLab() {
  const [feel, setFeel] = useState<Feel>("normal");
  const [cym, setCym] = useState<Cymbal>("hat8");
  const { playing, toggle } = usePlayer();

  const layers = useMemo(() => {
    const riff = parseNotation(FEEL_RIFF).events;
    return [
      { events: finalize(groove(2, feel, cym)), voice: "kit" as const },
      { events: riff, voice: "drive" as const, gain: -2 },
    ];
  }, [feel, cym]);

  const key = `tf-${feel}-${cym}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Time-feel lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The riff and the tempo never change. Only the kick/snare alternation (the <em>feel</em>) and the cymbal layer do.
        Switch while it loops and listen to how a new section appears without a single new note.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {FEELS.map((f) => (
          <Chip key={f.id} on={feel === f.id} onClick={() => setFeel(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {CYMBALS.map((c) => (
          <Chip key={c.id} on={cym === c.id} onClick={() => setCym(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>
      <PlayButton playing={playing === key} label="Play (4 loops)" onClick={() => toggle(key, layers, { bpm: 100, loops: 4, loopBeats: 8 })} />
      <p className="mt-3 text-xs text-muted-foreground">
        Changing a setting while playing? Press play again to hear the new version.
      </p>
    </div>
  );
}

/* shared helpers for other labs */
export { Chip, PlayButton, stepOf };
