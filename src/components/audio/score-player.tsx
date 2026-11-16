"use client";

import { useMemo, useState } from "react";
import { Code2, Download, Pause, Play, Repeat } from "lucide-react";

import { parseNotation } from "@/lib/music/notation";
import { downloadMusicXML } from "@/lib/music/musicxml";
import type { VoiceName } from "@/lib/music/engine";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

type Part = { name: string; notation: string; voice?: VoiceName; gain?: number };

type Props = {
  /** first part is the melody (drawn in the roll); the rest accompany */
  parts: Part[];
  label: string;
  bpm?: number;
  time?: string;
  /** key signature for the download: number of sharps (+) or flats (-) */
  fifths?: number;
  composer?: string;
  caption?: string;
  /** where the example is printed in the books */
  source?: string;
  /** labelled spans over the roll, in beats: e.g. basic idea, repetition, continuation */
  spans?: { from: number; to: number; label: string }[];
};

/**
 * A book example with its accompaniment: melody and accompaniment play together,
 * the roll shows the melody, and the download writes every part to MusicXML.
 */
export function ScorePlayer({ parts, label, bpm = 96, time = "4/4", fifths = 0, composer, caption, source, spans }: Props) {
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, parts: parts.map((p) => ({ ...p, ...parseNotation(p.notation) })) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [parts]);
  const { playing, active, toggle } = usePlayer();
  const [loop, setLoop] = useState(false);
  const [solo, setSolo] = useState(false);
  const [showCode, setShowCode] = useState(false);

  if (!parsed.ok) return <p className="text-sm text-destructive">Notation error: {parsed.error}</p>;
  const melody = parsed.parts[0];
  const isPlaying = playing === "score";
  const total = Math.max(...parsed.parts.map((p) => p.totalBeats));

  const layers = parsed.parts
    .filter((_, i) => !solo || i === 0)
    .map((p) => ({ events: p.events, voice: p.voice ?? "guitar", gain: p.gain }));

  return (
    <figure className="not-prose my-6 rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="icon"
          variant={isPlaying ? "secondary" : "signal"}
          aria-label={isPlaying ? "Stop" : "Play"}
          onClick={() => toggle("score", layers, { bpm, loops: loop ? 4 : 1, loopBeats: total })}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            {bpm} bpm · {time}
            {source ? ` · ${source}` : ""}
          </div>
        </div>
        {parsed.parts.length > 1 && (
          <Button
            size="sm"
            variant={solo ? "secondary" : "ghost"}
            aria-pressed={solo}
            onClick={() => setSolo((s) => !s)}
            title="Play the melody alone"
          >
            {solo ? "melody only" : "with accompaniment"}
          </Button>
        )}
        <Button size="icon" variant={loop ? "secondary" : "ghost"} aria-label="Loop" aria-pressed={loop} onClick={() => setLoop((l) => !l)}>
          <Repeat />
        </Button>
        <Button
          size="icon"
          variant={showCode ? "secondary" : "ghost"}
          aria-label="Show notation"
          aria-pressed={showCode}
          onClick={() => setShowCode((s) => !s)}
        >
          <Code2 />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Download MusicXML for Guitar Pro"
          title="Download MusicXML (opens in Guitar Pro: File › Import › MusicXML)"
          onClick={() => downloadMusicXML(parts, { title: label, bpm, time, fifths, composer })}
        >
          <Download />
        </Button>
      </div>
      {spans && spans.length > 0 && (
        <div className="relative mb-1 h-5 text-[10px] text-muted-foreground">
          {spans.map((s) => (
            <div
              key={s.label + s.from}
              className="absolute top-0 border-t-2 border-x border-signal/60 px-1 pt-0.5 leading-tight"
              style={{ left: `${(s.from / total) * 100}%`, width: `${((s.to - s.from) / total) * 100}%` }}
            >
              <span className="block truncate">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <PianoRoll
        events={melody.events}
        bars={melody.bars}
        totalBeats={total}
        active={isPlaying ? active[0] : null}
        height={110}
      />
      {showCode && (
        <div className="mt-3 space-y-1">
          {parts.map((p) => (
            <code key={p.name} className={cn("block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs")}>
              <span className="text-muted-foreground">{p.name}: </span>
              {p.notation}
            </code>
          ))}
        </div>
      )}
      {caption && <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
