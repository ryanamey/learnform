"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Repeat, Code2 } from "lucide-react";

import { parseNotation } from "@/lib/music/notation";
import type { VoiceName } from "@/lib/music/engine";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

type Props = {
  notation: string;
  bpm?: number;
  voice?: VoiceName;
  label?: string;
  caption?: string;
  loops?: number;
  showLyrics?: boolean;
  className?: string;
  compact?: boolean;
};

export function MotifPlayer({
  notation,
  bpm = 96,
  voice = "guitar",
  label,
  caption,
  loops = 1,
  showLyrics,
  className,
  compact,
}: Props) {
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, ...parseNotation(notation) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [notation]);
  const { playing, active, toggle } = usePlayer();
  const [loop, setLoop] = useState(loops > 1);
  const [showCode, setShowCode] = useState(false);

  if (!parsed.ok) {
    return <p className="text-sm text-destructive">Notation error: {parsed.error}</p>;
  }

  const isPlaying = playing === "main";

  return (
    <figure className={cn("not-prose my-6 rounded-xl border bg-card p-4", compact && "my-3 p-3", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="icon"
          variant={isPlaying ? "secondary" : "signal"}
          aria-label={isPlaying ? "Stop" : "Play"}
          onClick={() =>
            toggle("main", [{ events: parsed.events, voice }], { bpm, loops: loop ? Math.max(loops, 4) : 1 })
          }
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1">
          {label && <div className="truncate text-sm font-medium">{label}</div>}
          <div className="text-xs text-muted-foreground">
            {bpm} bpm · {voice}
          </div>
        </div>
        <Button
          size="icon"
          variant={loop ? "secondary" : "ghost"}
          aria-label="Loop"
          aria-pressed={loop}
          onClick={() => setLoop((l) => !l)}
        >
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
      </div>
      <PianoRoll
        events={parsed.events}
        bars={parsed.bars}
        totalBeats={parsed.totalBeats}
        active={isPlaying ? active[0] : null}
        height={compact ? 64 : 96}
        showLyrics={showLyrics}
      />
      {showCode && (
        <code className="mt-3 block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">{notation}</code>
      )}
      {caption && <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
