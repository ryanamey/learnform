"use client";

import { useMemo } from "react";

import type { NoteEvent } from "@/lib/music/notation";
import { midiToPitch } from "@/lib/music/notation";
import { cn } from "@/lib/utils";

type Props = {
  events: NoteEvent[];
  bars?: number[];
  totalBeats: number;
  active?: number | null;
  /** fixed beat width; when omitted the roll fills its container */
  height?: number;
  className?: string;
  showLyrics?: boolean;
  /** draw group brackets above the roll: start indices among sounding notes */
  groupStarts?: number[];
  ambiguous?: number[];
  tone?: "a" | "b" | "c";
  /** beats per bar line drawn as faint grid (defaults to 1) */
  beatGrid?: number;
};

const TONE_CLASS = {
  a: "fill-note-a",
  b: "fill-note-b",
  c: "fill-note-c",
};

export function PianoRoll({
  events,
  bars = [],
  totalBeats,
  active,
  height = 96,
  className,
  showLyrics,
  groupStarts,
  ambiguous,
  tone = "a",
  beatGrid = 1,
}: Props) {
  const { lo, hi } = useMemo(() => {
    const pitches = events.flatMap((e) => e.midi.filter((m) => m >= 0));
    if (pitches.length === 0) return { lo: 48, hi: 60 };
    return { lo: Math.min(...pitches) - 2, hi: Math.max(...pitches) + 2 };
  }, [events]);

  const W = 1000;
  const top = groupStarts ? 18 : 4;
  const H = height + top;
  const rollH = height;
  const span = Math.max(1, hi - lo);
  const x = (b: number) => (b / Math.max(totalBeats, 0.001)) * W;
  const y = (m: number) => top + rollH - ((m - lo) / span) * rollH;
  const noteH = Math.max(4, Math.min(10, rollH / span));

  const sounding = events.filter((e) => e.midi.length > 0);

  return (
    <div className={cn("w-full", className)}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-auto w-full"
      style={{ height: H }}
      role="img"
      aria-label={`Piano roll: ${sounding
        .map((e) => (e.midi[0] === -1 ? "hit" : e.midi.map((m) => midiToPitch(m)).join("+")))
        .join(", ")}`}
    >
      {/* beat grid */}
      {Array.from({ length: Math.floor(totalBeats / beatGrid) + 1 }, (_, i) => (
        <line
          key={`g${i}`}
          x1={x(i * beatGrid)}
          x2={x(i * beatGrid)}
          y1={top}
          y2={top + rollH}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {bars.map((b) => (
        <line
          key={`b${b}`}
          x1={x(b)}
          x2={x(b)}
          y1={top - 2}
          y2={top + rollH + 2}
          className="stroke-muted-foreground/60"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* group brackets */}
      {groupStarts &&
        groupStarts.map((gs, gi) => {
          const startEv = sounding[gs];
          const nextStart = groupStarts[gi + 1];
          const endEv = sounding[(nextStart ?? sounding.length) - 1];
          if (!startEv || !endEv) return null;
          const x1 = x(startEv.start) + 2;
          const x2 = x(endEv.start + endEv.dur) - 6;
          return (
            <path
              key={`grp${gi}`}
              d={`M${x1},14 L${x1},6 L${x2},6 L${x2},14`}
              fill="none"
              className="stroke-signal"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      {ambiguous &&
        ambiguous.map((ai) => {
          const e = sounding[ai];
          if (!e) return null;
          return (
            <path
              key={`amb${ai}`}
              d={`M${x(e.start) + 2},16 L${x(e.start) + 2},4`}
              className="stroke-note-c"
              strokeDasharray="3 3"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

      {/* notes */}
      {events.map((e) => {
        if (e.midi.length === 0) return null;
        const isActive = active === e.index;
        const w = Math.max(6, x(e.dur) - 3);
        if (e.midi[0] === -1) {
          return (
            <rect
              key={e.index}
              x={x(e.start) + 1}
              y={top + rollH - 10}
              width={Math.min(w, 14)}
              height={8}
              rx={2}
              className={cn(isActive ? "fill-foreground" : "fill-muted-foreground")}
            />
          );
        }
        return e.midi.map((m, k) => (
          <rect
            key={`${e.index}-${k}`}
            x={x(e.start) + 1}
            y={y(m) - noteH / 2}
            width={w}
            height={noteH}
            rx={3}
            className={cn(
              "transition-[fill,opacity] duration-75",
              isActive ? "fill-foreground" : TONE_CLASS[tone],
              !isActive && !e.accent && "opacity-75"
            )}
            stroke={e.accent ? "currentColor" : "none"}
            strokeWidth={e.accent ? 1.5 : 0}
            vectorEffect="non-scaling-stroke"
          />
        ));
      })}

    </svg>
      {showLyrics && (
        <div className="relative mt-1 h-5 text-xs">
          {events.map((e) =>
            e.lyric ? (
              <span
                key={`l${e.index}`}
                className={cn(
                  "absolute whitespace-nowrap text-muted-foreground transition-colors",
                  active === e.index && "font-medium text-foreground"
                )}
                style={{ left: `${(e.start / Math.max(totalBeats, 0.001)) * 100}%` }}
              >
                {e.lyric}
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
