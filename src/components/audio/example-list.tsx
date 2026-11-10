"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Eye, EyeOff, Pause, Play } from "lucide-react";

import { exampleSets, type Example } from "@/content/examples/module1";
import { parseNotation, type NoteEvent } from "@/lib/music/notation";
import { concat, displace } from "@/lib/music/transform";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { usePlayer } from "./use-player";
import { cn } from "@/lib/utils";

const SIM_LABEL: Record<number, string> = {
  1: "1 · same idea",
  2: "2 · close",
  3: "3 · medium",
  4: "4 · distant",
  5: "5 · new to the ear",
};

function SimilarityPips({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Similarity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-2 w-2 rounded-full", i <= value ? "bg-signal" : "bg-muted")} />
      ))}
    </span>
  );
}

type Props = {
  set: string;
  /** "quiz" hides the ratings until you guess */
  quiz?: boolean;
  /** offer A/B (source then variant) buttons */
  ab?: boolean;
  showLyrics?: boolean;
};

export function ExampleList({ set, quiz: quizDefault = false, ab = false, showLyrics }: Props) {
  const data = exampleSets[set];
  const { playing, active, toggle } = usePlayer();
  const [quiz, setQuiz] = useState(quizDefault);
  const [guesses, setGuesses] = useState<Record<string, number>>({});

  const parsed = useMemo(() => {
    const out: Record<string, ReturnType<typeof parseNotation>> = {};
    if (data.source) out[data.source.id] = parseNotation(data.source.notation);
    data.items.forEach((it) => (out[it.id] = parseNotation(it.notation)));
    return out;
  }, [data]);

  if (!data) return null;
  const hasRatings = data.items.some((i) => i.similarity);

  const playOne = (key: string, events: NoteEvent[], voice = data.voice) =>
    toggle(key, [{ events, voice }], { bpm: data.bpm });

  const playAB = (it: Example) => {
    const src = parsed[data.source!.id].events;
    const v = parsed[it.id].events;
    // A, a beat of silence, then B
    const both = concat(src, displace(v, 1));
    toggle(`ab-${it.id}`, [{ events: both, voice: it.voice ?? data.voice }], { bpm: data.bpm });
  };

  const renderRow = (it: Example, isSource = false) => {
    const p = parsed[it.id];
    const key = it.id;
    const isPlaying = playing === key;
    const guess = guesses[it.id];
    const revealed = !quiz || guess !== undefined || !it.similarity;
    return (
      <li
        key={it.id}
        className={cn(
          "rounded-lg border p-3 transition-colors",
          isSource ? "border-signal/50 bg-signal/5" : "bg-card",
          (isPlaying || playing === `ab-${it.id}`) && "border-signal"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon"
            variant={isPlaying ? "secondary" : isSource ? "signal" : "outline"}
            aria-label={isPlaying ? `Stop ${it.label}` : `Play ${it.label}`}
            onClick={() => playOne(key, p.events, it.voice)}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          {ab && data.source && !isSource && (
            <Button
              size="sm"
              variant={playing === `ab-${it.id}` ? "secondary" : "ghost"}
              onClick={() => playAB(it)}
              aria-label={`Play source then ${it.label}`}
            >
              <ArrowLeftRight /> A/B
            </Button>
          )}
          <div className="min-w-0 flex-1 text-sm font-medium">{it.label}</div>
          {it.similarity && revealed && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <SimilarityPips value={it.similarity} />
              <span className="hidden sm:inline">{SIM_LABEL[it.similarity]}</span>
            </span>
          )}
        </div>
        <div className="mt-2">
          <PianoRoll
            events={p.events}
            bars={p.bars}
            totalBeats={p.totalBeats}
            active={isPlaying ? active[0] : null}
            height={56}
            showLyrics={showLyrics}
            tone={isSource ? "a" : "b"}
          />
        </div>
        {quiz && it.similarity && guess === undefined && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">How related does it sound? 1 = same idea, 5 = new</span>
            {[1, 2, 3, 4, 5].map((g) => (
              <Button key={g} size="sm" variant="outline" onClick={() => setGuesses((s) => ({ ...s, [it.id]: g }))}>
                {g}
              </Button>
            ))}
          </div>
        )}
        {revealed && it.how && (
          <p className="mt-2 text-sm text-muted-foreground">
            {quiz && guess !== undefined && it.similarity && (
              <span className={cn("mr-2 font-medium", Math.abs(guess - it.similarity) <= 1 ? "text-signal" : "text-foreground")}>
                You said {guess}
                {Math.abs(guess - it.similarity) <= 1 ? " — close." : ` — suggested ${it.similarity}. Listen again with A/B.`}
              </span>
            )}
            {it.how}
          </p>
        )}
      </li>
    );
  };

  return (
    <div className="not-prose my-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-serif text-lg">{data.title}</div>
        {hasRatings && (
          <Button size="sm" variant="ghost" onClick={() => setQuiz((q) => !q)} aria-pressed={quiz}>
            {quiz ? <Eye /> : <EyeOff />}
            {quiz ? "Show ratings" : "Ear-training mode"}
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {data.source && renderRow(data.source, true)}
        {data.items.map((it) => renderRow(it))}
      </ul>
      {hasRatings && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ratings use Belkin&apos;s 1–5 similarity scale. They are my suggestions for this motif — trust your ear when it
          disagrees, and note why.
        </p>
      )}
    </div>
  );
}
