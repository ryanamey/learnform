"use client";

import { useMemo, useState } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import type { Layer } from "@/lib/music/engine";
import { groove, note, CRASH, HAT, KICK, S } from "@/lib/music/patterns";
import { Button } from "@/components/ui/button";
import { Chip, PlayButton } from "./meter-labs";
import { usePlayer } from "./use-player";
import { fill, hit, layers, place } from "./arch-labs";
import { cn } from "@/lib/utils";

/* Shared material ---------------------------------------------------- */

const RIFF = "E2/8! x/16 E2/16 G2/8 E2/8 A2/8 G2/8 E2/8 D2/8"; // one 4/4 bar
const ARP = "E3/8 B3/8 G3/8 B3/8 F#3/8 B3/8 G3/8 B3/8"; // clean figure
const BASS_RIFF = "E1/2 A1/4 D1/4";

type Parts = { kit: NoteEvent[]; bass: NoteEvent[]; clean: NoteEvent[]; drive: NoteEvent[] };
const empty = (): Parts => ({ kit: [], bass: [], clean: [], drive: [] });
const toLayers = (p: Parts): Layer[] =>
  layers([
    { events: p.kit, voice: "kit" },
    { events: p.bass, voice: "bass" },
    { events: p.clean, voice: "guitar" },
    { events: p.drive, voice: "drive", gain: -3 },
  ]);

function bar(p: Parts, at: number, o: { tr?: number; vel?: number; feel?: "normal" | "half" | "double"; cym?: "hat8" | "hat16" | "crash4" | "none"; riff?: string; clean?: boolean }) {
  const { tr = 0, vel = 0.8, feel = "normal", cym = "hat8", riff = RIFF, clean = false } = o;
  (clean ? p.clean : p.drive).push(...place(riff, at, tr, vel));
  p.bass.push(...place(BASS_RIFF, at, tr, vel));
  if (cym !== "none" || feel) p.kit.push(...groove(1, feel, cym, at, vel));
}

/* 1. Kinds of musical time ------------------------------------------- */

type TMode = "goal" | "nondirected" | "multiply" | "moment" | "vertical";
const TMODES: { id: TMode; label: string; text: string; shape: string }[] = [
  {
    id: "goal",
    label: "Goal-directed",
    text: "Each bar raises the stakes (louder, higher, denser) and you can hear where it's going: a big arrival on E. Implication, then fulfilment.",
    shape: "▁▂▃▄▅▆█▇",
  },
  {
    id: "nondirected",
    label: "Nondirected linear",
    text: "Constant motion, every bar leads to the next by step, but there's no destination you can predict. It moves; it doesn't arrive.",
    shape: "▃▄▃▅▄▃▅▄",
  },
  {
    id: "multiply",
    label: "Multiply-directed",
    text: "The same build as “goal-directed”, but it's cut off by an unrelated block. The build resumes later and reaches its goal somewhere else. Direction is clear; the order is scrambled.",
    shape: "▁▂▃ ░░ ▄▅█",
  },
  {
    id: "moment",
    label: "Moment time",
    text: "Self-contained, static blocks, cut together with no transitions. It starts as if it were already going and stops as if it continues elsewhere. An earlier block returns without preparation.",
    shape: "▅▅ ▂▂▂ ▇ ▃▃▃▃ ▅",
  },
  {
    id: "vertical",
    label: "Vertical time",
    text: "One texture, no phrase endings, no build. Nothing implies anything else. If you stop expecting change, attention goes inside the sound.",
    shape: "▄▄▄▄▄▄▄▄",
  },
];

export function buildTimeMode(m: TMode): Layer[] {
  const p = empty();
  if (m === "goal") {
    for (let i = 0; i < 6; i++)
      bar(p, i * 4, { tr: i >= 3 ? 5 : 0, vel: 0.5 + i * 0.08, feel: i < 2 ? "half" : "normal", cym: i < 4 ? "hat8" : "hat16" });
    p.kit.push(...fill(20, 8, 1));
    p.drive.push(note(24, 6, [28, 35, 40, 47], 1));
    p.bass.push(note(24, 6, [16], 1));
    p.kit.push(...hit(24), ...groove(1, "half", "crash4", 26, 0.9));
  } else if (m === "nondirected") {
    const route = [0, 2, -1, 3, 1, 4, 2, 5];
    route.forEach((t, i) => bar(p, i * 4, { tr: t, vel: 0.75, cym: "hat8" }));
  } else if (m === "multiply") {
    for (let i = 0; i < 3; i++) bar(p, i * 4, { vel: 0.5 + i * 0.08, feel: i < 2 ? "half" : "normal" });
    // interruption: unrelated, quiet clean block
    p.clean.push(...place(ARP, 12, 7, 0.45), ...place(ARP, 16, 7, 0.4));
    p.kit.push(note(12, S, [CRASH], 0.3));
    // build resumes where it left off
    for (let i = 3; i < 6; i++) bar(p, (i + 2) * 4, { tr: i >= 3 ? 5 : 0, vel: 0.5 + i * 0.08, cym: i < 4 ? "hat8" : "hat16" });
    p.kit.push(...fill(28, 8, 1));
    p.drive.push(note(32, 6, [28, 35, 40, 47], 1));
    p.bass.push(note(32, 6, [16], 1));
    p.kit.push(...hit(32));
  } else if (m === "moment") {
    // block A: heavy riff (starts mid-texture), 2 bars
    bar(p, 0, { vel: 0.85 });
    bar(p, 4, { vel: 0.85 });
    // block B: clean arpeggio, static, 3 bars
    for (let i = 0; i < 3; i++) p.clean.push(...place(ARP, 8 + i * 4, 0, 0.5));
    // block C: one chord held 1 bar with crash
    p.drive.push(note(20, 4, [33, 40, 45], 0.9));
    p.bass.push(note(20, 4, [21], 0.9));
    p.kit.push(...hit(20, 0.8));
    // block D: hats + bass ostinato, 4 bars
    for (let i = 0; i < 4; i++) {
      p.kit.push(...groove(1, "double", "hat16", 24 + i * 4, 0.55));
      p.bass.push(...place("B1/8 B1/8 D2/8 B1/8 A1/8 B1/8 D2/8 E2/8", 24 + i * 4, 0, 0.7));
    }
    // block A returns, no preparation, and the piece just stops
    bar(p, 40, { vel: 0.85 });
    p.drive.push(...place(RIFF, 44, 0, 0.85).filter((e) => e.start < 46));
  } else {
    // vertical: drone + repeating figure with tiny variations, no phrase endings
    p.bass.push(note(0, 32, [28], 0.55));
    p.drive.push(note(0, 32, [40, 47], 0.35));
    for (let i = 0; i < 8; i++) {
      const fig = i % 3 === 2 ? "E4/8 B3/8 F#4/8 B3/8 E4/8 B3/8 G4/8 B3/8" : "E4/8 B3/8 F#4/8 B3/8 E4/8 B3/8 F#4/8 B3/8";
      p.clean.push(...place(fig, i * 4, 0, 0.42));
      p.kit.push(note(i * 4, S, [HAT], 0.3), note(i * 4 + 2, S, [HAT], 0.25));
    }
  }
  return toLayers(p);
}

export function TimeModesLab() {
  const [m, setM] = useState<TMode>("goal");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildTimeMode(m), [m]);
  const info = TMODES.find((x) => x.id === m)!;
  const key = `tm-${m}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Five kinds of musical time, one riff</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same riff and band, arranged five ways. Listen to how your expectation behaves in each, not to the notes.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {TMODES.map((x) => (
          <Chip key={x.id} on={m === x.id} onClick={() => setM(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-2 font-mono text-lg tracking-widest text-signal" aria-hidden>
        {info.shape}
      </div>
      <p className="mb-4 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}

/* 2. Gestural time: endings out of place ----------------------------- */

type GMode = "normal" | "endfirst" | "three";
const GMODES: { id: GMode; label: string; text: string; plan: string[] }[] = [
  { id: "normal", label: "Normal order", text: "Opening riff, a build, then the closing gesture. Gesture and position agree.", plan: ["riff", "riff", "build", "build", "ENDING"] },
  {
    id: "endfirst",
    label: "Start with the ending",
    text: "The closing gesture comes first. It sounds final, so everything after it is heard as coming after an ending. When it returns at the end, it means something different.",
    plan: ["ENDING", "riff", "riff", "build", "build", "ENDING"],
  },
  {
    id: "three",
    label: "The ending, three times",
    text: "The same closing gesture ends the song three times. Each time you know more about what's being ended, and the gesture itself carries less news. Only the last one is final.",
    plan: ["riff", "ENDING", "riff", "build", "ENDING", "build", "build", "ENDING"],
  },
];

function endingGesture(p: Parts, at: number, final: boolean) {
  // descending cadential figure, broadening, crash + long chord
  p.drive.push(note(at, 1, [43, 50], 0.95), note(at + 1, 1.25, [41, 48], 0.95), note(at + 2.25, 1.75, [38, 45], 1));
  p.bass.push(note(at, 1, [31], 0.95), note(at + 1, 1.25, [29], 0.95), note(at + 2.25, 1.75, [26], 1));
  p.kit.push(...fill(at, 4, 0.9));
  p.drive.push(note(at + 4, final ? 6 : 3.5, [28, 35, 40, 47], 1));
  p.bass.push(note(at + 4, final ? 6 : 3.5, [16], 1));
  p.kit.push(...hit(at + 4));
}

export function buildGestural(m: GMode): Layer[] {
  const p = empty();
  const plan = GMODES.find((x) => x.id === m)!.plan;
  let at = 0;
  let builds = 0;
  plan.forEach((s, i) => {
    if (s === "riff") {
      bar(p, at, { vel: 0.7, feel: "half" });
      at += 4;
    } else if (s === "build") {
      bar(p, at, { vel: 0.75 + builds * 0.06, tr: builds % 2 ? 5 : 0, cym: "hat16" });
      builds++;
      at += 4;
    } else {
      const final = i === plan.length - 1;
      endingGesture(p, at, final);
      at += final ? 10 : 8;
    }
  });
  return toLayers(p);
}

export function GesturalLab() {
  const [m, setM] = useState<GMode>("endfirst");
  const { playing, toggle } = usePlayer();
  const lys = useMemo(() => buildGestural(m), [m]);
  const info = GMODES.find((x) => x.id === m)!;
  const key = `gt-${m}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">An ending in the wrong place</div>
      <p className="mb-4 text-sm text-muted-foreground">
        One closing gesture (a broadening descent, a fill, a crash and a long low chord), placed three ways.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {GMODES.map((x) => (
          <Chip key={x.id} on={m === x.id} onClick={() => setM(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1 text-xs">
        {info.plan.map((s, i) => (
          <span key={i} className={cn("rounded px-2 py-0.5", s === "ENDING" ? "bg-signal/70 font-medium" : "bg-muted")}>
            {s === "ENDING" ? "ending gesture" : s}
          </span>
        ))}
      </div>
      <p className="mb-4 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 104 })} />
    </div>
  );
}

/* 3. Stratification, interlock, synthesis --------------------------- */

type SMode = "strat" | "synth";

export function buildStrata(m: SMode): { lys: Layer[]; cells: ("A" | "B" | "AB")[] } {
  const p = empty();
  const cells: ("A" | "B" | "AB")[] = [];
  // strand A: clean figure that climbs each time it returns; strand B: heavy riff that thickens
  const aBlock = (at: number, n: number) => {
    p.clean.push(...place(ARP, at, n * 2, 0.5 + n * 0.05), ...place(ARP, at + 4, n * 2, 0.5 + n * 0.05));
    p.kit.push(note(at, S, [HAT], 0.3));
  };
  const bBlock = (at: number, n: number) => {
    bar(p, at, { vel: 0.7 + n * 0.08, cym: n >= 1 ? "hat16" : "hat8", feel: n >= 2 ? "double" : "normal" });
  };
  let at = 0;
  for (let n = 0; n < 3; n++) {
    aBlock(at, n);
    cells.push("A");
    at += 8;
    bBlock(at, n);
    cells.push("B");
    at += 4;
  }
  if (m === "synth") {
    // both strands together: A's latest register over B's latest intensity
    for (let i = 0; i < 2; i++) {
      p.clean.push(...place(ARP, at + i * 4, 6, 0.7));
      bar(p, at + i * 4, { vel: 0.95, cym: "crash4", feel: "normal" });
    }
    cells.push("AB");
    at += 8;
    p.drive.push(note(at, 4, [28, 35, 40], 1));
    p.clean.push(note(at, 4, [64, 71], 0.7));
    p.bass.push(note(at, 4, [16], 1));
    p.kit.push(...hit(at));
  }
  return { lys: toLayers(p), cells };
}

export function StrataLab() {
  const [m, setM] = useState<SMode>("strat");
  const { playing, toggle } = usePlayer();
  const { lys, cells } = useMemo(() => buildStrata(m), [m]);
  const key = `st-${m}`;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Two strands, cut together</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Strand A (clean figure) climbs a step every time it comes back. Strand B (heavy riff) gets denser every time.
        Neither is heard continuously, yet each one continues in your head across the other.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        <Chip on={m === "strat"} onClick={() => setM("strat")}>
          Stratification + interlock
        </Chip>
        <Chip on={m === "synth"} onClick={() => setM("synth")}>
          …then synthesis
        </Chip>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 text-xs">
        {cells.map((c, i) => (
          <span key={i} className={cn("rounded px-2 py-0.5", c === "A" ? "bg-note-a/40" : c === "B" ? "bg-note-b/40" : "bg-signal/70 font-medium")}>
            {c === "AB" ? "A + B together" : `${c}${cells.slice(0, i + 1).filter((x) => x === c).length}`}
          </span>
        ))}
      </div>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 108 })} />
    </div>
  );
}

/* 4. Does information stretch time? --------------------------------- */

const SEQ_NOTES = [52, 55, 59, 57, 52, 55, 59, 62, 52, 55, 59, 57, 50, 53, 57, 55]; // a patterned 16-note cell
function shuffled(arr: number[], seed: number) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDurationPair(): { chunked: Layer[]; random: Layer[]; chunkedSec: number; randomSec: number } {
  // 4 notes per second at bpm 60 with 16ths (0.25 beat)
  const chunked: NoteEvent[] = [];
  for (let r = 0; r < 5; r++) SEQ_NOTES.forEach((m, i) => chunked.push(note((r * 16 + i) * 0.25, 0.22, [m], i % 4 === 0 ? 0.75 : 0.6)));
  const random: NoteEvent[] = [];
  let k = 0;
  for (let r = 0; r < 5; r++) {
    const perm = shuffled(SEQ_NOTES, 17 + r * 31);
    perm.forEach((m) => {
      if (k < 72) random.push(note(k * 0.25, 0.22, [m], 0.62));
      k++;
    });
  }
  return {
    chunked: layers([{ events: chunked, voice: "guitar" }]),
    random: layers([{ events: random, voice: "guitar" }]),
    chunkedSec: 20,
    randomSec: 18,
  };
}

export function DurationLab() {
  const { playing, toggle } = usePlayer();
  const pair = useMemo(() => buildDurationPair(), []);
  const [answer, setAnswer] = useState<"1" | "2" | "same" | null>(null);
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Which one is longer?</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Two sequences of the same notes at the same speed. Play both once, without looking at a clock, then say which
        felt longer.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <PlayButton playing={playing === "dur-1"} label="Play sequence 1" onClick={() => toggle("dur-1", pair.chunked, { bpm: 60 })} />
        <PlayButton playing={playing === "dur-2"} label="Play sequence 2" onClick={() => toggle("dur-2", pair.random, { bpm: 60 })} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        <span className="mr-1 text-muted-foreground">Felt longer:</span>
        {(["1", "2", "same"] as const).map((a) => (
          <Chip key={a} on={answer === a} onClick={() => setAnswer(a)}>
            {a === "same" ? "About the same" : `Sequence ${a}`}
          </Chip>
        ))}
      </div>
      {answer && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p>
            <b>Sequence 1</b> repeats one 16-note pattern ({pair.chunkedSec} s by the clock).{" "}
            <b>Sequence 2</b> uses the same notes in a different random order each time ({pair.randomSec} s, actually
            shorter).
          </p>
          <p className="mt-2">
            In Kramer&apos;s classroom version and Ornstein&apos;s experiments, most people judge the unpatterned sequence as
            longer even when it&apos;s shorter: it takes more memory to store, so it&apos;s remembered as more time. If you
            heard it the other way, that&apos;s data too: attention, mood and familiarity all move the result.
          </p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAnswer(null)}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

/* 5. Hypermeter: extension, contraction, overlap -------------------- */

type HMode = "regular" | "extension" | "contraction" | "overlap";
const HMODES: { id: HMode; label: string; text: string; groups: number[]; overlapAt?: number }[] = [
  { id: "regular", label: "Regular 4 + 4 + 4", text: "Three four-bar hypermeasures. Each starts with a crash on its downbeat; you feel bar 1 of each group without counting.", groups: [4, 4, 4] },
  { id: "extension", label: "Extension 4 + 5 + 4", text: "The second group repeats its last bar. You expect the crash after bar 4 of that group and it's one bar late: an extra weak hyperbeat.", groups: [4, 5, 4] },
  { id: "contraction", label: "Contraction 4 + 3 + 4", text: "The second group skips a bar. The next downbeat arrives early, which pushes forward.", groups: [4, 3, 4] },
  {
    id: "overlap",
    label: "Overlap 4 + 4 (shared bar)",
    text: "The cadence that ends group 1 is also the downbeat of group 2. One bar is weak (an ending) and strong (a beginning) at once. Overlaps are where the music grips hardest.",
    groups: [4, 4, 4],
    overlapAt: 3,
  },
];

export function buildHypermeter(m: HMode): { lys: Layer[]; bars: { group: number; pos: number; hyper: boolean; overlap?: boolean }[] } {
  const info = HMODES.find((x) => x.id === m)!;
  const p = empty();
  const bars: { group: number; pos: number; hyper: boolean; overlap?: boolean }[] = [];
  let b = 0;
  info.groups.forEach((len, g) => {
    for (let i = 0; i < len; i++) {
      const isOverlapBar = info.overlapAt !== undefined && g === 1 && i === 0;
      if (isOverlapBar) {
        // the previous group's last bar was its cadence; it doubles as this downbeat — do not add a bar
        bars[bars.length - 1] = { ...bars[bars.length - 1], overlap: true, hyper: true };
        continue;
      }
      const at = b * 4;
      const last = i === len - 1;
      const cadential = last && g < info.groups.length - 1 && !(info.overlapAt !== undefined && g === 0);
      if (m === "overlap" && g === 0 && last) {
        // cadence bar that also launches group 2: arrival chord + crash
        p.drive.push(note(at, 2, [28, 35, 40], 0.95), ...place("E2/8! x/16 E2/16 G2/8 E2/8", at + 2, 0, 0.8));
        p.bass.push(note(at, 2, [16], 0.95), ...place("E1/4 A1/4", at + 2, 0, 0.8));
        p.kit.push(...groove(1, "normal", "hat8", at, 0.85), note(at, S, [CRASH], 1));
      } else {
        bar(p, at, { vel: i === 0 ? 0.85 : 0.72, riff: cadential ? "E2/4 G2/4 A2/4 B2/4" : RIFF });
        if (i === 0) p.kit.push(note(at, S, [CRASH], 1), note(at, S, [KICK], 1));
        if (last) p.kit.push(...fill(at, 12, 0.7));
      }
      bars.push({ group: g, pos: i + 1, hyper: i === 0 });
      b++;
    }
  });
  p.drive.push(note(b * 4, 3, [28, 35, 40], 0.9));
  p.kit.push(...hit(b * 4, 0.9));
  return { lys: toLayers(p), bars };
}

export function HypermeterLab() {
  const [m, setM] = useState<HMode>("regular");
  const { playing, active, toggle } = usePlayer();
  const { lys, bars } = useMemo(() => buildHypermeter(m), [m]);
  const info = HMODES.find((x) => x.id === m)!;
  const key = `hm-${m}`;
  const kitIdx = active[0];
  const cur = playing === key && kitIdx !== undefined ? Math.floor((lys[0].events[kitIdx]?.start ?? 0) / 4) : null;
  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Hypermeasures that stretch, shrink and overlap</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Bars group into larger “measures” with a strong first bar. The crash marks each hypermeasure downbeat.
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {HMODES.map((x) => (
          <Chip key={x.id} on={m === x.id} onClick={() => setM(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {bars.map((x, i) => (
          <div
            key={i}
            className={cn(
              "flex h-9 w-9 flex-col items-center justify-center rounded text-[11px]",
              x.group % 2 ? "bg-note-b/30" : "bg-note-a/30",
              x.hyper && "font-semibold",
              x.overlap && "bg-signal/70",
              cur === i && "ring-2 ring-foreground"
            )}
          >
            <span>{x.overlap ? "4=1" : x.pos}</span>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm">{info.text}</p>
      <PlayButton playing={playing === key} label="Play" onClick={() => toggle(key, lys, { bpm: 112 })} />
    </div>
  );
}
