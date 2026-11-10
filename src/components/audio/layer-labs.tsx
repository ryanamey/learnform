"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { groove, note } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { fill, hit, layers, place } from "./arch-labs";

/* Functional layers: beat, bass, melody, filler, novelty ------------- */

export type LayerId = "beat" | "bass" | "melody" | "filler" | "novelty";
export type NoveltyTimbre = "odd" | "blended";
export type NoveltyRole = "answers" | "joins";

const ALL: { id: LayerId; label: string; what: string }[] = [
  { id: "beat", label: "Beat", what: "Explicit beat layer: the kit, nominally unpitched. With bass, the groove." },
  { id: "bass", label: "Bass", what: "Functional bass layer: roots in a rhythm of its own." },
  { id: "melody", label: "Melody", what: "Melodic layer: the tune that carries the words (here a synth voice)." },
  { id: "filler", label: "Filler", what: "Harmonic filler: fills the register between bass and melody. Much metal drops it." },
  { id: "novelty", label: "Novelty", what: "Novelty layer (Lavengood): hooks and colour in the gaps the melody leaves." },
];

// E minor, Em | C | G | D, twice. Each melody bar leaves its last beat free.
const MELODY = ["B4/4 G4/8 A4/8 B4/4 r/4", "C5/4 B4/8 A4/8 G4/4 r/4", "B4/4 D5/8 B4/8 G4/4 r/4", "A4/4 F#4/8 G4/8 A4/4 r/4"];
const ANSWER = ["r/2 r/4 E5/16 G5/16 B5/8", "r/2 r/4 G5/16 E5/16 C6/8", "r/2 r/4 D6/16 B5/16 G5/8", "r/2 r/4 F#5/8 A5/8"];
const ROOTS = [28, 24, 31, 26]; // E1 C1 G1 D1 (bass voice)
const CHORDS = [
  [52, 55, 59],
  [52, 55, 60],
  [50, 55, 59],
  [50, 54, 57],
];

export function buildLayers(on: LayerId[], timbre: NoveltyTimbre, role: NoveltyRole): Layer[] {
  const kit: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const mel: NoteEvent[] = [];
  const pad: NoteEvent[] = [];
  const nov: NoteEvent[] = [];
  for (let b = 0; b < 8; b++) {
    const at = b * 4;
    const i = b % 4;
    if (on.includes("beat")) {
      kit.push(...groove(1, "normal", "hat8", at, 0.75));
      if (b === 7) kit.push(...fill(at, 12, 0.7));
    }
    if (on.includes("bass")) bass.push(note(at, 1.5, [ROOTS[i]], 0.8), note(at + 1.5, 0.5, [ROOTS[i]], 0.6), note(at + 2, 2, [ROOTS[i]], 0.75));
    if (on.includes("filler")) pad.push(note(at, 4, CHORDS[i], 0.6));
    if (on.includes("melody")) mel.push(...place(MELODY[i], at, 0, 0.8));
    if (on.includes("novelty")) {
      if (role === "joins" && b >= 4) nov.push(...place(MELODY[i], at, 12, 0.7));
      else nov.push(...place(ANSWER[i], at, 0, 0.75));
    }
  }
  if (on.includes("beat")) kit.push(...hit(32, 0.9));
  if (on.includes("bass")) bass.push(note(32, 2, [28], 0.85));
  if (on.includes("filler")) pad.push(note(32, 2, CHORDS[0], 0.6));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: pad, voice: "pad" },
    { events: mel, voice: "voice" },
    { events: nov, voice: timbre === "odd" ? "bell" : "voice", gain: timbre === "odd" ? 0 : -3 },
  ]);
}

const PRESETS: { label: string; on: LayerId[] }[] = [
  { label: "All five", on: ["beat", "bass", "melody", "filler", "novelty"] },
  { label: "Core only", on: ["beat", "bass", "melody", "filler"] },
  { label: "Metal-style: no filler", on: ["beat", "bass", "melody", "novelty"] },
  { label: "Groove only", on: ["beat", "bass"] },
];

export function LayersLab() {
  const [on, setOn] = useState<LayerId[]>(["beat", "bass", "melody", "filler", "novelty"]);
  const [timbre, setTimbre] = useState<NoveltyTimbre>("odd");
  const [role, setRole] = useState<NoveltyRole>("answers");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildLayers(on, timbre, role), [on, timbre, role]);
  const key = `ly-${on.join("")}-${timbre}-${role}`;
  const flip = (id: LayerId) => setOn((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Five functional layers</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Eight bars, one texture. Switch layers off to hear what each one does, then change how the novelty layer sounds and
        what it does.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {ALL.map((x) => (
          <Chip key={x.id} on={on.includes(x.id)} onClick={() => flip(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <span className="mr-1">Presets:</span>
        {PRESETS.map((p) => (
          <Chip key={p.label} on={p.on.length === on.length && p.on.every((x) => on.includes(x))} onClick={() => setOn(p.on)}>
            {p.label}
          </Chip>
        ))}
      </div>
      <ul className="mb-3 space-y-1 text-sm">
        {ALL.filter((x) => on.includes(x.id)).map((x) => (
          <li key={x.id}>
            <span className="font-medium">{x.label}:</span> <span className="text-muted-foreground">{x.what}</span>
          </li>
        ))}
      </ul>
      {on.includes("novelty") && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="mr-1 text-muted-foreground">Novelty sound:</span>
            <Chip on={timbre === "odd"} onClick={() => setTimbre("odd")}>
              Marked (bell-like)
            </Chip>
            <Chip on={timbre === "blended"} onClick={() => setTimbre("blended")}>
              Blended (same as melody)
            </Chip>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="mr-1 text-muted-foreground">Novelty role:</span>
            <Chip on={role === "answers"} onClick={() => setRole("answers")}>
              Answers in the gaps
            </Chip>
            <Chip on={role === "joins"} onClick={() => setRole("joins")}>
              Joins the melody in bars 5–8
            </Chip>
          </div>
          <p className="text-sm text-muted-foreground">
            {timbre === "odd"
              ? "Inharmonic, sparse, sharp attack: it refuses to blend, so every answer is heard as a hook."
              : "Same timbre as the melody: the answers merge into the tune and the hook loses its edge."}{" "}
            {role === "joins"
              ? "In the second half the novelty sound leaves its slot and doubles the melody an octave up, a change of role you hear as an event."
              : ""}
          </p>
        </div>
      )}
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 96 })} />
    </div>
  );
}
