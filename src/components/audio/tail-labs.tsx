"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { note, S, HAT, KICK, SNARE, CRASH, twosAndThrees } from "@/lib/music/patterns";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { layers } from "./arch-labs";

/* ------------------------------------------------------------------ */
/* Fitting the riff to the frame (Pieslak 2007): tail, cut-off, drift  */
/* ------------------------------------------------------------------ */

export type TailRiff = "25" | "22" | "5";
export type TailMode = "tail" | "cut" | "drift";

/** Frame = 8 bars of 4/4 in sixteenths, i.e. two 4-bar hypermeasures. */
export const TAIL_FRAME = 128;
const FRAMES = 2;

const RIFFS: Record<TailRiff, { len: number; label: string; bpm: number; text: string }> = {
  "25": {
    len: 25,
    label: "25 sixteenths",
    bpm: 134,
    text: "Four statements of a 25-sixteenth riff fill 100 sixteenths; a last bar of 28 sixteenths makes 128, exactly eight bars of 4/4. Pieslak finds this layout in Meshuggah's “Rational Gaze”.",
  },
  "22": {
    len: 22,
    label: "11 eighths",
    bpm: 124,
    text: "Five statements of 11/8 fill 110 sixteenths; the sixth is shortened by a quarter note to 9/8 (18 sixteenths), which makes 128. Pieslak's example is “Stengah”.",
  },
  "5": {
    len: 5,
    label: "5 sixteenths",
    bpm: 120,
    text: "A short cell. Repeated without adjustment it realigns with the bar every 5 bars, the plain metric dissonance Pieslak hears in “Humiliative”. With a tail, the last statement stretches to 8 sixteenths so the frame closes cleanly.",
  },
};

/** How the riff fills one frame in each mode: list of statement lengths (sixteenths). */
export function tailPlan(len: number, mode: TailMode, frame = TAIL_FRAME): { lens: number[]; tail: boolean } {
  if (mode === "drift") return { lens: [], tail: false };
  const full = Math.floor(frame / len);
  const rest = frame - full * len;
  if (rest === 0) return { lens: Array(full).fill(len), tail: false };
  if (mode === "cut") return { lens: [...Array(full).fill(len), rest], tail: false };
  // tail: fold the remainder into the last statement (lengthen it) unless the remainder is a large part of a riff,
  // in which case the extra statement is a shortened one.
  if (rest < len / 2 && full > 0) return { lens: [...Array(full - 1).fill(len), len + rest], tail: true };
  return { lens: [...Array(full).fill(len), rest], tail: true };
}

const ROOTS = [40, 41, 43, 40, 46, 38, 45];

const END_ROOT = 46;

/** The riff's groups of 2 and 3; its last group is the riff's ending gesture. */
function riffGroups(len: number): number[] {
  return twosAndThrees(len);
}

/** A tail: the same ending gesture, with the middle recomposed to fit `l` sixteenths. */
function tailGroups(len: number, l: number): number[] {
  const end = riffGroups(len).at(-1)!;
  return [...twosAndThrees(l - end), end];
}

/** Plays a riff statement of `groups` from t0, cut after `play` sixteenths. The last group is the ending gesture
 * (a higher, held note), heard only if the statement is complete. Kick doubles each attack. */
function riffStatement(t0: number, groups: number[], play: number, accent: number, kit: NoteEvent[], gtr: NoteEvent[], bass: NoteEvent[]) {
  let k = 0;
  groups.forEach((g, gi) => {
    if (k >= play) return;
    const t = t0 + k * S;
    const ending = gi === groups.length - 1 && gi > 0;
    const dur = Math.min(g, play - k) * S * (ending ? 0.95 : 0.85);
    const root = ending ? END_ROOT : ROOTS[gi % ROOTS.length];
    gtr.push(note(t, dur, ending ? [root, root + 5, root + 10] : [root, root + 7], gi === 0 ? accent : ending ? 0.85 : 0.6));
    bass.push(note(t, dur, [root - 12], gi === 0 ? 0.9 : 0.65));
    kit.push(note(t, S, [KICK], gi === 0 ? 0.95 : 0.7));
    k += g;
  });
}

export function buildTail(riff: TailRiff, mode: TailMode): Layer[] {
  const len = RIFFS[riff].len;
  const kit: NoteEvent[] = [];
  const gtr: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const total = FRAMES * TAIL_FRAME;
  // frame layer: ride/hat on quarters, snare on beat 3, crash on each 4-bar hypermeasure
  for (let i = 0; i < total; i += 4) kit.push(note(i * S, S, [HAT], i % 16 === 0 ? 0.6 : 0.4));
  for (let b = 0; b < total / 16; b++) kit.push(note((b * 16 + 8) * S, S, [SNARE], 0.85));
  for (let h = 0; h < total; h += 64) kit.push(note(h * S, S, [CRASH], h % TAIL_FRAME === 0 ? 0.85 : 0.6));

  if (mode === "drift") {
    const groups = riffGroups(len);
    for (let t = 0; t < total; t += len) riffStatement(t * S, groups, Math.min(len, total - t), 1, kit, gtr, bass);
  } else {
    const { lens, tail } = tailPlan(len, mode);
    for (let f = 0; f < FRAMES; f++) {
      let t = f * TAIL_FRAME;
      lens.forEach((l, i) => {
        const last = i === lens.length - 1;
        // a tail is a recomposed statement of its own length; a cut-off is the normal riff stopped early
        const groups = last && tail ? tailGroups(len, l) : riffGroups(len);
        riffStatement(t * S, groups, l, last && tail ? 0.9 : 1, kit, gtr, bass);
        t += l;
      });
    }
  }
  const end = total * S;
  kit.push(note(end, S, [CRASH], 0.9), note(end, S, [KICK], 0.9));
  bass.push(note(end, 1, [28], 0.8));
  return layers([
    { events: kit, voice: "kit" },
    { events: bass, voice: "bass", gain: -3 },
    { events: gtr, voice: "drive", gain: -2 },
  ]);
}

const MODE_TEXT: Record<TailMode, string> = {
  tail: "Tail: the last statement is lengthened or shortened in the middle, keeping its ending chord, so the riff ends exactly on the frame. Mixed meter in the service of a symmetrical frame: Pieslak's description of Meshuggah up to 2002.",
  cut: "Cut-off: the riff keeps its length and is stopped mid-stride when the frame ends, then restarts on the downbeat. The lurch Lucas describes on obZen.",
  drift: "Drift: no adjustment. The riff runs on across the frame boundary and only realigns when the arithmetic says so. This is true metric dissonance, and the second frame no longer starts with the riff.",
};

function lcm(a: number, b: number) {
  const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
  return (a * b) / g(a, b);
}

export function TailLab() {
  const [riff, setRiff] = useState<TailRiff>("25");
  const [mode, setMode] = useState<TailMode>("tail");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildTail(riff, mode), [riff, mode]);
  const r = RIFFS[riff];
  const key = `tail-${riff}-${mode}`;

  // one frame as blocks for the picture
  const blocks: { start: number; len: number; kind: "riff" | "tail" | "cut" }[] = [];
  if (mode === "drift") {
    for (let t = 0; t < TAIL_FRAME; t += r.len) blocks.push({ start: t, len: Math.min(r.len, TAIL_FRAME - t), kind: t + r.len > TAIL_FRAME ? "cut" : "riff" });
  } else {
    const { lens, tail } = tailPlan(r.len, mode);
    let t = 0;
    lens.forEach((l, i) => {
      const last = i === lens.length - 1;
      blocks.push({ start: t, len: l, kind: last && tail ? "tail" : last && l !== r.len ? "cut" : "riff" });
      t += l;
    });
  }
  const realign = lcm(r.len, 16) / 16;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Tail, cut-off or drift</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The cymbals keep quarters with the snare on beat 3 and a crash every four bars: an 8-bar frame, played twice.
        Guitar, bass and kick play an odd-length riff that ends on a higher, held chord. Choose how the riff meets the end
        of the frame, and listen for whether that ending chord lands on the frame or gets lost.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Riff:</span>
        {(Object.keys(RIFFS) as TailRiff[]).map((id) => (
          <Chip key={id} on={riff === id} onClick={() => setRiff(id)}>
            {RIFFS[id].label}
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">At the frame end:</span>
        {(["tail", "cut", "drift"] as TailMode[]).map((m) => (
          <Chip key={m} on={mode === m} onClick={() => setMode(m)}>
            {m === "tail" ? "Tail (fit)" : m === "cut" ? "Cut off" : "Drift"}
          </Chip>
        ))}
      </div>
      <div className="relative mb-1 h-8 w-full overflow-hidden rounded-md bg-muted" aria-hidden>
        {blocks.map((b, i) => (
          <div
            key={i}
            className={
              "absolute top-0 h-full border-r border-background " +
              (b.kind === "tail" ? "bg-signal" : b.kind === "cut" ? "bg-destructive/60" : i % 2 ? "bg-signal/35" : "bg-signal/55")
            }
            style={{ left: `${(b.start / TAIL_FRAME) * 100}%`, width: `${(b.len / TAIL_FRAME) * 100}%` }}
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={"absolute top-0 h-full w-px " + (i === 3 ? "bg-foreground/70" : "bg-foreground/25")} style={{ left: `${((i + 1) / 8) * 100}%` }} />
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        One frame (8 bars; thin lines = bars, thick line = the 4-bar hypermeasure). Shaded = riff statements
        {mode === "tail" ? ", bright = the tail" : ", red = the statement that gets cut"}. Unadjusted, this riff would realign
        with the bar line every {realign} bar{realign > 1 ? "s" : ""}.
      </p>
      <p className="mb-1 text-sm">{r.text}</p>
      <p className="mb-3 text-xs text-muted-foreground">{MODE_TEXT[mode]}</p>
      <PlayButton playing={playing === key} label="Play 2 frames" onClick={() => toggle(key, lys, { bpm: r.bpm })} />
    </div>
  );
}
