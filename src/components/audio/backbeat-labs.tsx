"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, CRASH, HAT, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* 1. Where the backbeat sits: pickups, rebounds, push and lay-back      */
/* ------------------------------------------------------------------ */

export type Backbeat = "plain" | "pickup" | "rebound" | "pushed" | "laidback";

/** Offset in beats for pushed / laid-back snares: about 25 ms at 100 bpm. */
const PUSH = 0.042;

export function buildBackbeat(kind: Backbeat): Layer[] {
  const kit: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  const bars = 4;
  for (let b = 0; b < bars; b++) {
    const t = b * 4;
    const off = kind === "pushed" ? -PUSH : kind === "laidback" ? PUSH : 0;
    // kick on 1 and 3
    kit.push(note(t, S, [KICK], 0.9), note(t + 2, S, [KICK], 0.85));
    // snare on 2 and 4
    kit.push(note(t + 1 + off, S, [SNARE], 0.95), note(t + 3 + off, S, [SNARE], 0.95));
    for (let i = 0; i < 8; i++) kit.push(note(t + i * 0.5, S, [HAT], i % 2 ? 0.35 : 0.6));
    if (kind === "pickup") {
      // sixteenth pickups into the snare: the backbeat leans forward
      kit.push(note(t + 0.75, S, [SNARE], 0.45), note(t + 2.75, S, [SNARE], 0.45));
    }
    if (kind === "rebound") {
      // kick pairs on 1 and 3: the snare answers them
      kit.push(note(t + 0.5, S, [KICK], 0.7), note(t + 2.5, S, [KICK], 0.7));
    }
    const root = b % 2 ? 31 : 28;
    bass.push(note(t, 0.9, [root], 0.8), note(t + 1.5, 0.4, [root], 0.6), note(t + 2, 0.9, [root], 0.75), note(t + 3.5, 0.4, [root + 2], 0.6));
    gtr.push(note(t, 1.8, [root + 24, root + 31], 0.55), note(t + 2, 1.8, [root + 24, root + 31], 0.5));
  }
  kit.push(note(16, S, [CRASH], 0.8), note(16, S, [KICK], 0.9));
  bass.push(note(16, 2, [28], 0.8));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: gtr, voice: "drive", gain: 0.6 },
  ]);
}

const BACKBEAT_INFO: { id: Backbeat; label: string; text: string }[] = [
  {
    id: "plain",
    label: "Standard beat",
    text: "Kick on 1 and 3, snare on 2 and 4, hats in eighths. Biamonte treats this as consonant in rock: it's the timeline everything else is measured against, and nobody expects it to resolve.",
  },
  {
    id: "pickup",
    label: "Snare pickups",
    text: "A ghost note a sixteenth before each snare. The snare is now approached by a shorter note, so it sounds like a goal: the groove leans forward.",
  },
  {
    id: "rebound",
    label: "Kick pairs",
    text: "Two kicks on beats 1 and 3, then the snare. Now the snare follows a short pair, so it sounds like a rebound off the kick: the groove settles back.",
  },
  {
    id: "pushed",
    label: "Pushed snare",
    text: "Every snare about 25 ms early, on top of the beat. Same notes, more drive and nervous energy.",
  },
  {
    id: "laidback",
    label: "Laid-back snare",
    text: "Every snare about 25 ms late, behind the beat. Same notes, more relaxed and heavier. The difference is small; listen to the space between kick and snare.",
  },
];

export function BackbeatLab() {
  const [kind, setKind] = useState<Backbeat>("plain");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildBackbeat(kind), [kind]);
  const info = BACKBEAT_INFO.find((x) => x.id === kind)!;
  const key = `bb-${kind}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Where the backbeat leans</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One groove, five ways of placing or preparing the snare. Nothing else changes.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {BACKBEAT_INFO.map((x) => (
          <Chip key={x.id} on={kind === x.id} onClick={() => setKind(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 100 })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Making a changing meter legible: |6|7|6|7|6|8| (after Rush)         */
/* ------------------------------------------------------------------ */

export type Legible = "none" | "starts" | "ends" | "both";

const BARS = [6, 7, 6, 7, 6, 8];

export function buildLegible(mode: Legible): Layer[] {
  const kit: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  const marksStart = mode === "starts" || mode === "both";
  const marksEnd = mode === "ends" || mode === "both";
  let t = 0;
  BARS.forEach((len, bi) => {
    const root = bi % 2 ? 26 : 28; // E, D
    // bass: steady eighths on the root, the same in every version
    for (let i = 0; i < len * 2; i++) bass.push(note(t + i * 0.5, 0.45, [root], i === 0 && marksStart ? 0.85 : 0.6));
    // guitar
    if (marksStart) {
      // bar-start motive: rising fifth, then a note anticipating beat 2
      gtr.push(note(t, 0.5, [root + 24], 0.85, true), note(t + 0.5, 0.25, [root + 31], 0.75), note(t + 0.75, 1.25, [root + 36], 0.7));
      gtr.push(note(t + 2, len - 2 - 0.1, [root + 24, root + 31], 0.45));
    } else {
      gtr.push(note(t, len - 0.1, [root + 24, root + 31], 0.45));
    }
    // drums
    const body = marksEnd ? len - 2 : len; // last two beats become a fill when ends are marked
    for (let b = 0; b < body; b++) {
      const at = t + b;
      if (b % 2 === 0) kit.push(note(at, S, [KICK], b === 0 && marksStart ? 0.9 : 0.75));
      else kit.push(note(at, S, [SNARE], 0.85));
      kit.push(note(at, S, [HAT], 0.55), note(at + 0.5, S, [HAT], 0.3));
    }
    if (marksStart) kit.push(note(t, S, [CRASH], 0.75));
    if (marksEnd) {
      const f = t + len - 2;
      for (let i = 0; i < 8; i++) kit.push(note(f + i * 0.25, S, [SNARE], 0.45 + i * 0.06));
      kit.push(note(f + 1.75, S, [KICK], 0.8));
    }
    t += len;
  });
  kit.push(note(t, S, [CRASH], 0.9), note(t, S, [KICK], 0.9));
  bass.push(note(t, 2, [28], 0.8));
  gtr.push(note(t, 2, [52, 59], 0.6));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: gtr, voice: "drive", gain: 0.65 },
  ]);
}

const LEGIBLE_INFO: { id: Legible; label: string; text: string }[] = [
  {
    id: "none",
    label: "Nothing marked",
    text: "Bars of 6, 7, 6, 7, 6 and 8 beats, but the bass chugs evenly, the kit alternates kick and snare straight through, and the chord just changes. You can count it, but you can't hear where a bar begins.",
  },
  {
    id: "starts",
    label: "Starts marked",
    text: "Each bar now opens with the same motive (a rising fifth and a note pushed ahead of beat 2) and a crash. The beginnings are clear; the endings still arrive by surprise.",
  },
  {
    id: "ends",
    label: "Ends marked",
    text: "No motive, but the drummer drops the backbeat for the last two beats of every bar and plays a fill that lands on the next downbeat. You can feel each bar closing, whatever its length.",
  },
  {
    id: "both",
    label: "Both (the Rush solution)",
    text: "Motive at the start, fill at the end: Biamonte's reading of the verse of Rush's \"Free Will\". The bars are still irregular, but every one has a clear beginning and a clear ending, so the listener follows without counting.",
  },
];

export function LegibleMeterLab() {
  const [mode, setMode] = useState<Legible>("none");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildLegible(mode), [mode]);
  const info = LEGIBLE_INFO.find((x) => x.id === mode)!;
  const key = `lg-${mode}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Making a changing meter legible</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same six bars of 6/4, 7/4, 6/4, 7/4, 6/4, 8/4 four ways. Only the markers at the edges of the bars change.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {LEGIBLE_INFO.map((x) => (
          <Chip key={x.id} on={mode === x.id} onClick={() => setMode(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 132 })} />
    </div>
  );
}
