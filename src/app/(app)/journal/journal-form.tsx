"use client";

import { useActionState, useEffect, useRef } from "react";

import { saveJournal, type JournalFormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  ["studied", "Studied", "Which concept, which pages"],
  ["analyzed", "Analyzed", "Which piece, which map"],
  ["wrote", "Wrote", "What you sketched — link it to a motif"],
  ["worked", "What worked", "One thing to keep"],
  ["bored", "What bored me", "Where your attention dropped, in what you heard or wrote"],
] as const;

export function JournalForm({ defaultWeek }: { defaultWeek: string }) {
  const [state, action, pending] = useActionState<JournalFormState, FormData>(saveJournal, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4 rounded-xl border p-5">
      <div className="max-w-48 space-y-1.5">
        <Label htmlFor="weekOf">Week of</Label>
        <Input id="weekOf" name="weekOf" type="date" defaultValue={defaultWeek} required />
      </div>
      {FIELDS.map(([name, label, hint]) => (
        <div key={name} className="space-y-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Textarea id={name} name={name} placeholder={hint} className="min-h-12" />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="signal" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        {state?.ok && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </form>
  );
}
