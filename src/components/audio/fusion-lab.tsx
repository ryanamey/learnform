"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Snyder's click-train demonstration (Music and Memory, ch. 2 and 10): the same click,
 * repeated faster and faster. Below about 5 per second you can follow the order of events;
 * around 10–16 per second the train is heard as one grainy whole; around 20 per second and
 * above it fuses into a buzz and then a pitch. The clicks are generated directly as audio,
 * so the timing is exact.
 */

const RATES = [
  { r: 2, note: "events you can count" },
  { r: 4, note: "still separate, a fast rhythm" },
  { r: 8, note: "too fast to follow a pattern in detail" },
  { r: 12, note: "heard as a whole: a rattle" },
  { r: 16, note: "Snyder's grainy buzz" },
  { r: 20, note: "the fusion threshold: a low buzz-pitch" },
  { r: 40, note: "a low pitch" },
  { r: 110, note: "a clear pitch (about A2)" },
  { r: 220, note: "an octave higher (about A3)" },
];

type Ctx = AudioContext;

function clickBuffer(ctx: Ctx, rateAt: (t: number) => number, seconds: number) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const clickLen = Math.floor(sr * 0.0015);
  let t = 0;
  while (t < seconds) {
    const i0 = Math.floor(t * sr);
    for (let k = 0; k < clickLen && i0 + k < len; k++) {
      // a short decaying burst: an "edge in time"
      data[i0 + k] += (k % 2 === 0 ? 1 : -1) * Math.exp(-k / (clickLen / 4)) * 0.6;
    }
    t += 1 / rateAt(t);
  }
  // fade in/out to avoid thumps
  const fade = Math.floor(sr * 0.01);
  for (let k = 0; k < fade; k++) {
    data[k] *= k / fade;
    data[len - 1 - k] *= k / fade;
  }
  return buf;
}

export function FusionLab() {
  const ctxRef = useRef<Ctx | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [sweepRate, setSweepRate] = useState<number | null>(null);

  const stop = () => {
    srcRef.current?.stop();
    srcRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(null);
    setSweepRate(null);
  };

  useEffect(() => () => stop(), []);

  const start = async (key: string, rateAt: (t: number) => number, seconds: number, showSweep = false) => {
    stop();
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = clickBuffer(ctx, rateAt, seconds);
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(gain).connect(ctx.destination);
    const t0 = ctx.currentTime;
    src.start();
    src.onended = () => {
      if (srcRef.current === src) stop();
    };
    srcRef.current = src;
    setPlaying(key);
    if (showSweep) {
      timerRef.current = window.setInterval(() => setSweepRate(rateAt(ctx.currentTime - t0)), 100);
    }
  };

  // exponential sweep from 2 to 200 per second over 16 seconds
  const sweep = (t: number) => 2 * Math.pow(100, Math.min(t, 16) / 16);

  return (
    <div className="not-prose my-6 rounded-xl border bg-card p-4">
      <div className="mb-1 text-sm font-medium">The same click, faster and faster</div>
      <p className="mb-3 text-xs text-muted-foreground">
        After Snyder&apos;s tape demonstration (ch. 2, 10). Use headphones or decent speakers: the lowest pitches are
        weak on laptop speakers.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant={playing === "sweep" ? "secondary" : "signal"}
          onClick={() => (playing === "sweep" ? stop() : start("sweep", sweep, 16, true))}
        >
          {playing === "sweep" ? <Pause /> : <Play />} Sweep 2 → 200 per second (16 s)
        </Button>
        {playing === "sweep" && sweepRate !== null && (
          <span className="font-mono text-sm">
            {sweepRate.toFixed(sweepRate < 10 ? 1 : 0)} per second ·{" "}
            <span className="text-muted-foreground">{(1000 / sweepRate).toFixed(0)} ms apart</span>
          </span>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {RATES.map(({ r, note }) => {
          const key = `r${r}`;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => (playing === key ? stop() : start(key, () => r, 3))}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/40",
                  playing === key && "border-signal bg-signal/10"
                )}
              >
                {playing === key ? <Pause className="mt-0.5 size-4 shrink-0" /> : <Play className="mt-0.5 size-4 shrink-0" />}
                <span className="min-w-0">
                  <span className="block font-mono text-sm">
                    {r} / s <span className="text-xs text-muted-foreground">· {Math.round(1000 / r)} ms</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{note}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
