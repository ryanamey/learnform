"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, HAT, KICK, SNARE, CRASH } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Non-isochronous meters (London ch. 7–8): one pulse, beats of 2 and 3 */
/* ------------------------------------------------------------------ */

export type NiPattern = "7-223" | "7-322" | "9-2223" | "9-333" | "11-3332" | "11-22223" | "8-332" | "8-35";
export type NiTempo = "slow" | "mid" | "fast";

const GROUPS: Record<NiPattern, number[]> = {
  "7-223": [2, 2, 3],
  "7-322": [3, 2, 2],
  "9-2223": [2, 2, 2, 3],
  "9-333": [3, 3, 3],
  "11-3332": [3, 3, 3, 2],
  "11-22223": [2, 2, 2, 2, 3],
  "8-332": [3, 3, 2],
  "8-35": [3, 5],
};

/** Pulse (N-cycle) interval in ms for each tempo choice. */
export const PULSE_MS: Record<NiTempo, number> = { slow: 280, mid: 170, fast: 105 };

const BARS = 6;

/** Builds the pattern with the pulse as a sixteenth (S beats). bpm is chosen by the caller from PULSE_MS. */
export function buildNi(p: NiPattern, pulseAudible: boolean): Layer[] {
  const g = GROUPS[p];
  const n = g.reduce((a, b) => a + b, 0);
  const kit: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * n * S;
    let k = 0;
    g.forEach((len, i) => {
      const t = t0 + k * S;
      const first = i === 0;
      // beat marker: kick on the downbeat, snare on the other beats (long beats get a lower, longer bass note)
      kit.push(note(t, S, [first ? KICK : len === 3 ? KICK : SNARE], first ? 0.95 : 0.7));
      bass.push(note(t, len * S * 0.9, [len === 3 ? 28 : 31], first ? 0.9 : 0.7));
      gtr.push(note(t, len * S * 0.8, first ? [52, 59, 64] : len === 3 ? [52, 59] : [55, 62], first ? 0.75 : 0.55));
      k += len;
    });
    if (pulseAudible) for (let i = 0; i < n; i++) kit.push(note(t0 + i * S, S, [HAT], i === 0 ? 0.55 : 0.35));
    if (bar === 0) kit.push(note(t0, S, [CRASH], 0.7));
  }
  const end = BARS * n * S;
  kit.push(note(end, S, [CRASH], 0.85), note(end, S, [KICK], 0.9));
  bass.push(note(end, 1, [28], 0.8));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass" },
    { events: gtr, voice: "drive", gain: 0.55 },
  ]);
}

const PATTERN_INFO: { id: NiPattern; label: string; text: string }[] = [
  { id: "7-223", label: "7: 2-2-3", text: "Seven pulses as short-short-long. The long beat comes last, so each bar leans into the next downbeat." },
  { id: "7-322", label: "7: 3-2-2", text: "The same seven pulses rotated: long beat first. London treats the rotations as different meters: the bar now lands heavily and then speeds up." },
  { id: "9-2223", label: "9: 2-2-2-3", text: "Nine pulses in four uneven beats, the 'Blue Rondo' pattern. Four beats can't divide nine evenly, so this is as even as four beats in nine can be." },
  { id: "9-333", label: "9: 3-3-3", text: "The same nine pulses in three even beats: ordinary compound triple. Same length as 2-2-2-3, a completely different meter." },
  { id: "11-3332", label: "11: 3-3-3-2", text: "Eleven pulses with three long beats and one short. Odd lengths force uneven beats; the short beat works like a hiccup before the downbeat." },
  { id: "11-22223", label: "11: 2-2-2-2-3", text: "Eleven pulses as five beats, four short and one long. Faster-feeling than 3-3-3-2 at the same pulse rate, because there are more beats per bar." },
  { id: "8-332", label: "8: 3-3-2", text: "Eight pulses as 3-3-2, the tresillo. You can hear it as three uneven beats, or as 4/4 with syncopation. Which one you hear depends on what the drums do." },
  { id: "8-35", label: "8: 3-5", text: "Two beats of 3 and 5. London found this only works as a meter in a narrow tempo window with the pulse audible; slower, the 5 splits into 3+2, faster, it blurs." },
];

const TEMPO_INFO: Record<NiTempo, string> = {
  slow: "Pulse 280 ms: long beats of 840 ms. The 3s start to feel like separate slow beats, and the pattern can fall apart into its pulses.",
  mid: "Pulse 170 ms: long beats around 510 ms, near the most natural beat rate. The uneven beats are clearest here.",
  fast: "Pulse 105 ms, near the 100 ms floor for countable notes. The pulses blur and you start hearing whole bars or pairs of beats instead.",
};

export function NiMeterLab() {
  const [p, setP] = useState<NiPattern>("7-223");
  const [tempo, setTempo] = useState<NiTempo>("mid");
  const [pulse, setPulse] = useState(true);
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildNi(p, pulse), [p, pulse]);
  const bpm = Math.round(60000 / (4 * PULSE_MS[tempo]));
  const info = PATTERN_INFO.find((x) => x.id === p)!;
  const key = `ni-${p}-${tempo}-${pulse}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Beats of two and three</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One steady pulse; the kick, snare and bass mark the uneven beats. Change the grouping, the pulse speed, and whether
        the pulse itself is audible.
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {PATTERN_INFO.map((x) => (
          <Chip key={x.id} on={p === x.id} onClick={() => setP(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {(["slow", "mid", "fast"] as NiTempo[]).map((t) => (
          <Chip key={t} on={tempo === t} onClick={() => setTempo(t)}>
            {t === "slow" ? "Slow pulse" : t === "mid" ? "Middle pulse" : "Fast pulse"}
          </Chip>
        ))}
        <span className="mx-1 text-muted-foreground">·</span>
        <Chip on={pulse} onClick={() => setPulse(!pulse)}>
          {pulse ? "Pulse audible" : "Pulse silent"}
        </Chip>
      </div>
      <p className="mb-1 text-sm">{info.text}</p>
      <p className="mb-3 text-xs text-muted-foreground">{TEMPO_INFO[tempo]}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm })} />
    </div>
  );
}
