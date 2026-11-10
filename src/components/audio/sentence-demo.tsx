"use client";

import { useMemo, useState } from "react";
import { Drum, Pause, Play } from "lucide-react";

import { SENTENCE_GROOVE, SENTENCE_STAGES } from "@/content/examples/module1";
import { parseNotation, type NoteEvent } from "@/lib/music/notation";
import { concat } from "@/lib/music/transform";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

const BPM = 104;

export function SentenceDemo() {
  const { playing, active, toggle } = usePlayer();
  const [drums, setDrums] = useState(true);

  const stages = useMemo(() => SENTENCE_STAGES.map((s) => ({ ...s, parsed: parseNotation(s.notation) })), []);
  const whole = useMemo(() => {
    const events: NoteEvent[] = concat(...stages.map((s) => s.parsed.events));
    // map global event index -> stage
    const owner: number[] = [];
    stages.forEach((s, si) => s.parsed.events.forEach(() => owner.push(si)));
    const bars = [4, 8, 12, 16, 20, 24, 28];
    return { events, owner, bars, total: 32 };
  }, [stages]);
  const groove = useMemo(() => parseNotation(SENTENCE_GROOVE).events, []);

  const allPlaying = playing === "all";
  const currentStage = allPlaying && active[0] !== undefined ? whole.owner[active[0]] : null;

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-4">
      <div className="mb-1 font-serif text-lg">The sentence, as an 8-bar riff section</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Presentation → repetition → fragmentation → liquidation → arrival. Play the whole thing, then each stage alone.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={allPlaying ? "secondary" : "signal"}
          onClick={() =>
            toggle(
              "all",
              [
                { events: whole.events, voice: "drive" },
                ...(drums ? [{ events: groove, voice: "kit" as const }] : []),
              ],
              { bpm: BPM, countIn: 4 }
            )
          }
        >
          {allPlaying ? <Pause /> : <Play />}
          {allPlaying ? "Stop" : "Play all 8 bars"}
        </Button>
        <Button variant={drums ? "secondary" : "ghost"} size="sm" aria-pressed={drums} onClick={() => setDrums((d) => !d)}>
          <Drum /> Drums
        </Button>
      </div>
      <div className="mt-4">
        <PianoRoll
          events={whole.events}
          bars={whole.bars}
          totalBeats={whole.total}
          active={allPlaying ? active[0] : null}
          height={110}
          beatGrid={4}
        />
        <div className="mt-1 grid grid-cols-4 text-[11px] text-muted-foreground">
          {stages.map((s, i) => (
            <div key={s.id} className={cn("border-l pl-1.5", currentStage === i && "font-medium text-signal")}>
              bars {s.bars}
            </div>
          ))}
        </div>
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {stages.map((s, i) => {
          const key = `stage-${s.id}`;
          const isPlaying = playing === key;
          return (
            <li
              key={s.id}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                (currentStage === i || isPlaying) && "border-signal bg-signal/5"
              )}
            >
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant={isPlaying ? "secondary" : "outline"}
                  aria-label={isPlaying ? `Stop ${s.label}` : `Play ${s.label}`}
                  onClick={() => toggle(key, [{ events: s.parsed.events, voice: "drive" }], { bpm: BPM })}
                >
                  {isPlaying ? <Pause /> : <Play />}
                </Button>
                <div>
                  <div className="text-sm font-medium">
                    {i + 1}. {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground">bars {s.bars}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
