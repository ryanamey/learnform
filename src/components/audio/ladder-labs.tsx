"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { groove, note, CRASH, KICK, SNARE } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* The climactic ladder (Osborn 2010/2013): one riff, three rungs      */
/* ------------------------------------------------------------------ */

export type Rung = "verse" | "chorus" | "tc" | "climb";

const BARS = 4;
/** A two-bar riff over an A pedal: eighth-note pulse with a moving top. */
const RIFF = [45, 45, 52, 45, 48, 45, 50, 47, 45, 45, 52, 45, 53, 52, 50, 48];
const MEL: Record<Exclude<Rung, "climb">, number[]> = {
  verse: [57, 57, 60, 59, 57, 55, 57, 57],
  chorus: [64, 64, 67, 65, 64, 62, 64, 64],
  tc: [69, 72, 71, 69, 74, 72, 69, 69],
};

function rung(r: Exclude<Rung, "climb">, t0: number, kit: NoteEvent[], gtr: NoteEvent[], dirt: NoteEvent[], bass: NoteEvent[], bell: NoteEvent[], voice: NoteEvent[]) {
  if (r === "tc") {
    // half-time backbeat, four-on-the-floor eighth kicks, crash wash on every quarter
    for (let b = 0; b < BARS; b++) {
      const t = t0 + b * 4;
      for (let i = 0; i < 8; i++) kit.push(note(t + i * 0.5, 0.25, [KICK], i % 2 ? 0.6 : 0.8));
      kit.push(note(t + 2, 0.25, [SNARE], 0.95));
      for (let i = 0; i < 4; i++) kit.push(note(t + i, 0.25, [CRASH], i === 0 ? 0.8 : 0.55));
    }
  } else {
    kit.push(...groove(BARS, "normal", r === "verse" ? "hat8" : "none", t0, r === "verse" ? 0.7 : 0.85));
    if (r === "chorus") for (let i = 0; i < BARS * 8; i++) bell.push(note(t0 + i * 0.5, 0.3, [84], i % 2 ? 0.35 : 0.55)); // ride
    kit.push(note(t0, 0.25, [CRASH], 0.7));
  }
  for (let i = 0; i < BARS * 8; i++) {
    const m = RIFF[i % RIFF.length];
    const t = t0 + i * 0.5;
    if (r === "verse") gtr.push(note(t, 0.18, [m], 0.6)); // palm-muted single notes
    else dirt.push(note(t, 0.45, r === "tc" ? [m, m + 7, m + 12] : [m, m + 7], r === "tc" ? 0.9 : 0.75)); // open, then overdriven octaves
    if (i % 2 === 0) bass.push(note(t, 0.9, [33], 0.8));
  }
  const mel = MEL[r];
  // verse: one statement in bars 2–3; chorus: the hook twice; climax: one statement in half-time values
  const starts = r === "verse" ? [t0 + 4] : r === "chorus" ? [t0, t0 + 8] : [t0];
  const step = r === "tc" ? 2 : 1;
  starts.forEach((s0) => mel.forEach((m, i) => voice.push(note(s0 + i * step, step * 0.9, [m], 0.85))));
}

export function buildLadder(r: Rung): Layer[] {
  const kit: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  const dirt: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const bell: NoteEvent[] = [];
  const voice: NoteEvent[] = [];
  const order: Exclude<Rung, "climb">[] = r === "climb" ? ["verse", "chorus", "tc"] : [r];
  order.forEach((x, i) => rung(x, i * BARS * 4, kit, gtr, dirt, bass, bell, voice));
  const end = order.length * BARS * 4;
  kit.push(note(end, 0.25, [CRASH], 0.9), note(end, 0.25, [KICK], 0.9));
  bass.push(note(end, 2, [33], 0.8));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass", gain: -2 },
    { events: gtr, voice: "guitar", gain: -2 },
    { events: dirt, voice: "drive", gain: -1 },
    { events: bell, voice: "bell", gain: -14 },
    { events: voice, voice: "voice", gain: 2 },
  ]);
}

const TEXT: Record<Rung, string> = {
  verse: "Verse rung: palm-muted single notes, closed hi-hat, the voice low, one phrase in the middle of the four bars.",
  chorus: "Chorus rung: open, ringing power chords, a ride cymbal instead of the hi-hat, the voice a fifth higher, singing its hook twice.",
  tc: "Terminal-climax rung: overdriven octave chords, a crash wash on every beat, four-on-the-floor kick under a half-time backbeat, and the voice at its highest, in long half-time notes.",
  climb: "The three rungs in a row: the riff never changes. Only technique, cymbal, register and feel climb.",
};

export function LadderLab() {
  const [r, setR] = useState<Rung>("climb");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildLadder(r), [r]);
  const key = `ladder-${r}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">One riff, three rungs</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same two-bar riff over an A pedal, arranged for each rung of Osborn&apos;s climactic ladder. Each rung uses
        louder techniques, not louder playing.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {(["verse", "chorus", "tc", "climb"] as Rung[]).map((x) => (
          <Chip key={x} on={r === x} onClick={() => setR(x)}>
            {x === "verse" ? "Verse" : x === "chorus" ? "Chorus" : x === "tc" ? "Terminal climax" : "Play the climb"}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{TEXT[r]}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 96 })} />
    </div>
  );
}
