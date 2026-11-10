"use client";

import { useOptimistic, useTransition } from "react";
import { Check, CircleDot } from "lucide-react";

import { setProgress } from "@/app/actions";
import { Button } from "@/components/ui/button";

type Status = "started" | "done" | null;

export function ProgressControls({ slug, status, large }: { slug: string; status: Status; large?: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<Status, Status>(status, (_s, n) => n);

  const set = (next: "started" | "done" | "none") =>
    start(async () => {
      setOptimistic(next === "none" ? null : next);
      await setProgress(slug, next);
    });

  if (optimistic === "done") {
    return (
      <Button size={large ? "default" : "sm"} variant="secondary" disabled={pending} onClick={() => set("started")}>
        <Check className="text-signal" /> Done
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {optimistic !== "started" && !large && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("started")}>
          <CircleDot /> Mark as started
        </Button>
      )}
      <Button size={large ? "default" : "sm"} variant={large ? "signal" : "outline"} disabled={pending} onClick={() => set("done")}>
        <Check /> Mark as done
      </Button>
    </div>
  );
}
