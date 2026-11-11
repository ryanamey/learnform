"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, HAT, KICK, SNARE, CRASH } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Garza: riff types and timekeeping cymbals agree with or contradict   */
/* the feel set by kick and snare.                                      */
/* ------------------------------------------------------------------ */

export type FeelPlan = "slow" | "fast" | "contained" | "fastslow" | "compound";

const E = [40, 47];
const B_LOW = [35, 42];
const HIGH_DISS = [59, 65, 70];

type Parts = { kit: NoteEvent[]; gtr: NoteEvent[]; bass: NoteEvent[] };

/** Kick/snare alternation. rate = number of kick→snare pairs per bar (1 half, 2 normal, 4 double, 8 quadruple). */
/** Quarter time: kick on the downbeat of even bars, snare on the downbeat of odd bars. */
function quarterTime(p: Parts, at: number, bar: number) {
  p.kit.push(note(at, S, [bar % 2 ? SNARE : KICK], 0.9));
}

function kickSnare(p: Parts, at: number, rate: number, bars = 1) {
  const pairLen = 4 / rate; // beats per kick+snare pair
  const total = bars * 4;
  for (let t = 0; t < total - 1e-6; t += pairLen) {
    p.kit.push(note(at + t, S, [KICK], 0.85));
    if (t + pairLen / 2 < total) p.kit.push(note(at + t + pairLen / 2, S, [SNARE], 0.85));
  }
}

/** Timekeeping cymbal: every other beat (EOB), once per beat (OpB), beat divisions (BD). */
function cymbal(p: Parts, at: number, kind: "eob" | "opb" | "bd", vel = 0.55) {
  const step = kind === "eob" ? 2 : kind === "opb" ? 1 : 0.5;
  for (let t = 0; t < 4 - 1e-6; t += step) p.kit.push(note(at + t, S, [kind === "eob" ? CRASH : HAT], kind === "eob" ? vel * 0.7 : vel));
}

function longDurations(p: Parts, at: number, alternate = false) {
  if (alternate) {
    p.gtr.push(note(at, 1.9, B_LOW, 0.7), note(at + 2, 1.9, HIGH_DISS, 0.6));
    p.bass.push(note(at, 3.9, [23], 0.7));
  } else {
    p.gtr.push(note(at, 2.9, E, 0.7), note(at + 3, 0.9, [43, 50], 0.65));
    p.bass.push(note(at, 2.9, [28], 0.7), note(at + 3, 0.9, [31], 0.65));
  }
}

function pedalTone(p: Parts, at: number) {
  // palm-muted low E on sixteenths, open stabs on beats 1 and 3
  for (let i = 0; i < 16; i++) {
    const stab = i === 0 || i === 8 || i === 11;
    p.gtr.push(note(at + i * S, S * 0.9, stab ? (i === 11 ? [43, 50] : E) : [40], stab ? 0.75 : 0.45));
  }
  p.bass.push(note(at, 1.9, [28], 0.7), note(at + 2, 1.9, [28], 0.7));
}

function breakdown(p: Parts, at: number) {
  // uneven, palm-muted, low, in unison with the kick, with silence between
  const hits = [0, 0.75, 1.5, 2.5, 3.25];
  hits.forEach((h) => {
    p.gtr.push(note(at + h, 0.2, [40], 0.85));
    p.kit.push(note(at + h, S, [KICK], 0.85));
    p.bass.push(note(at + h, 0.2, [28], 0.8));
  });
}

function tremolo(p: Parts, at: number) {
  const notes = [64, 65, 67, 65];
  for (let i = 0; i < 16; i++) p.gtr.push(note(at + i * S, S * 0.9, [notes[Math.floor(i / 4)]], 0.55));
  p.bass.push(note(at, 3.9, [28], 0.6));
}

export function buildFeel(plan: FeelPlan): Layer[] {
  const p: Parts = { kit: [], gtr: [], bass: [] };
  for (let rep = 0; rep < 2; rep++) {
    for (let b = 0; b < 4; b++) {
      const t = (rep * 4 + b) * 4;
      if (plan === "slow") {
        quarterTime(p, t, b);
        cymbal(p, t, "eob");
        longDurations(p, t);
      } else if (plan === "fast") {
        kickSnare(p, t, 4);
        cymbal(p, t, "bd");
        pedalTone(p, t);
      } else if (plan === "contained") {
        if (b < 3) {
          quarterTime(p, t, b);
          cymbal(p, t, "bd");
          pedalTone(p, t);
        } else {
          // release: soloistic open sixteenths and a fill
          for (let i = 0; i < 16; i++) p.gtr.push(note(t + i * S, S * 0.9, [64 + (i % 8), 71 + (i % 8)], 0.6));
          for (let i = 0; i < 16; i++) p.kit.push(note(t + i * S, S, [SNARE], 0.4 + i * 0.03));
          p.bass.push(note(t, 3.9, [28], 0.7));
        }
      } else if (plan === "fastslow") {
        kickSnare(p, t, 8);
        cymbal(p, t, "eob");
        longDurations(p, t, true);
      } else {
        // compound riff type over normal time: breakdown, pedal tone, breakdown, tremolo
        if (b === 0 || b === 2) breakdown(p, t);
        else {
          kickSnare(p, t, 2);
          if (b === 1) pedalTone(p, t);
          else tremolo(p, t);
        }
        if (b === 0 || b === 2) p.kit.push(note(t + 1, S, [SNARE], 0.8), note(t + 3, S, [SNARE], 0.8));
        cymbal(p, t, "opb");
      }
    }
  }
  p.kit.push(note(32, S, [CRASH], 0.9), note(32, S, [KICK], 0.9));
  p.bass.push(note(32, 2, [28], 0.8));
  p.gtr.push(note(32, 2, E, 0.7));
  return layers([
    { events: p.kit, voice: "kit" },
    { events: p.bass, voice: "bass" },
    { events: p.gtr, voice: "drive", gain: 0.6 },
  ]);
}

const INFO: { id: FeelPlan; label: string; text: string }[] = [
  {
    id: "slow",
    label: "Slow, all agree",
    text: "Quarter time (kick and snare alternate once per bar), a cymbal every other beat, and a riff of long notes. Every layer says 'slow': space and weight.",
  },
  {
    id: "fast",
    label: "Fast, all agree",
    text: "Double time, hats on the eighths, a palm-muted pedal-tone riff with open stabs. Every layer says 'fast': constant power.",
  },
  {
    id: "contained",
    label: "Contained intensity",
    text: "Quarter-time kick and snare, but a fast pedal-tone riff and a ride in eighths. The slow drums hold back the fast parts for three bars; in bar 4 the guitar breaks into open sixteenths and the drummer fills. (After Garza's reading of a Psycroptic passage.)",
  },
  {
    id: "fastslow",
    label: "Fast and slow at once",
    text: "Blast-beat speed in kick and snare, but long notes and a cymbal every other beat on top. The guitar's low-chord/high-chord alternation works like an even slower kick and snare. (After Garza's reading of an Inter Arma passage.)",
  },
  {
    id: "compound",
    label: "Compound riff",
    text: "Normal-time drums, but the riff itself changes type every bar: breakdown, pedal tone, breakdown, tremolo. The contradiction is inside one player's part. (Garza's 'compound riff type', from technical death metal.)",
  },
];

export function FeelContradictionLab() {
  const [plan, setPlan] = useState<FeelPlan>("contained");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildFeel(plan), [plan]);
  const info = INFO.find((x) => x.id === plan)!;
  const key = `fc-${plan}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">When the band disagrees about the feel</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Same tempo throughout. The kick and snare set the feel; the riff and the timekeeping cymbal either agree or argue.
      </p>
      <div className="mb-4 flex flex-wrap gap-1">
        {INFO.map((x) => (
          <Chip key={x.id} on={plan === x.id} onClick={() => setPlan(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 92 })} />
    </div>
  );
}
