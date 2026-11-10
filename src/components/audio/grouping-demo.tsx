"use client";

import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";

import { groupingScenarios } from "@/content/examples/module1";
import { parseNotation } from "@/lib/music/notation";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

export function GroupingDemo() {
  const [id, setId] = useState(groupingScenarios[0].id);
  const [showBrackets, setShowBrackets] = useState(false);
  const { playing, active, toggle } = usePlayer();
  const sc = groupingScenarios.find((s) => s.id === id)!;
  const p = useMemo(() => parseNotation(sc.notation), [sc]);
  const isPlaying = playing === sc.id;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">Grouping lab</div>
      <p className="mb-4 text-sm text-muted-foreground">
        The same twelve pitches in the same order. Only timing, register or accent changes. Listen first, decide where
        the groups are, then reveal.
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Grouping scenarios">
        {groupingScenarios.map((s) => (
          <Button
            key={s.id}
            size="sm"
            role="tab"
            aria-selected={s.id === id}
            variant={s.id === id ? "secondary" : "ghost"}
            onClick={() => {
              setId(s.id);
              setShowBrackets(false);
            }}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant={isPlaying ? "secondary" : "signal"}
          aria-label={isPlaying ? "Stop" : "Play"}
          onClick={() => toggle(sc.id, [{ events: p.events, voice: "guitar" }], { bpm: 112, loops: 3 })}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowBrackets((b) => !b)}>
          {showBrackets ? "Hide groups" : "Reveal groups"}
        </Button>
        <span className="text-xs text-muted-foreground">plays 3 times</span>
      </div>
      <div className="mt-3">
        <PianoRoll
          events={p.events}
          totalBeats={p.totalBeats}
          active={isPlaying ? active[0] : null}
          height={80}
          groupStarts={showBrackets ? sc.groupStarts : undefined}
          ambiguous={showBrackets ? sc.ambiguous : undefined}
        />
      </div>
      <p className={cn("mt-3 text-sm transition-opacity", showBrackets ? "opacity-100" : "opacity-0")} aria-hidden={!showBrackets}>
        {sc.principle}
        {sc.ambiguous && (
          <span className="text-muted-foreground"> Dashed marks: where the accents try to start a group instead.</span>
        )}
      </p>
    </div>
  );
}
