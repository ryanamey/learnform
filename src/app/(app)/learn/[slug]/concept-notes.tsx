"use client";

import { useEffect, useRef, useState } from "react";

import { saveConceptNote } from "@/app/actions";
import { Textarea } from "@/components/ui/textarea";

export function ConceptNotes({ slug, initial }: { slug: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setState("saving");
    timer.current = window.setTimeout(async () => {
      const res = await saveConceptNote(slug, value);
      setState(res.ok ? "saved" : "error");
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, slug]);

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Exercise answers, ratings you disagreed with, ideas for the EP…"
        className="min-h-40 font-mono text-sm"
        aria-label="Your notes for this concept"
      />
      <div className="mt-1.5 h-4 text-xs text-muted-foreground" aria-live="polite">
        {state === "saving" && "Saving…"}
        {state === "saved" && "Saved"}
        {state === "error" && <span className="text-destructive">Couldn&apos;t save — check your connection.</span>}
      </div>
    </div>
  );
}
