import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Sparkles } from "lucide-react";

import { createPlan } from "@/app/actions";
import { getPlans } from "@/lib/data";
import { formatTime, planDataSchema, timeline } from "@/lib/form-plan";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Form plans" };

export default async function PlansPage() {
  const user = await requireUser();
  const plans = await getPlans(user.id);
  return (
    <PageBody wide>
      <PageHeader
        eyebrow="Form planner"
        title="Design the form before the material exists"
        actions={
          <div className="flex flex-wrap gap-2">
            <form action={createPlan.bind(null, false)}>
              <Button type="submit" variant="signal">
                <FilePlus2 /> New plan
              </Button>
            </form>
            <form action={createPlan.bind(null, true)}>
              <Button type="submit" variant="outline">
                <Sparkles /> Start from the example
              </Button>
            </form>
          </div>
        }
      >
        Lay out the sections, then shape them lane by lane: the five tension levers, the climb to the peak, the voice,
        how thick the meter is, and two sets of landmarks. The planner checks the design against what the reading
        found, and copies a clean table to hand to the band.
      </PageHeader>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No plans yet. Start from the example to see every lane filled in, or begin with an empty plan.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const data = planDataSchema.safeParse(p.data);
            const rows = data.success ? timeline(data.data) : [];
            const total = rows.at(-1)?.end ?? 0;
            return (
              <li key={p.id}>
                <Link href={`/plans/${p.id}`} className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
                  <div className="font-serif text-lg">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.song ? `${p.song} · ` : ""}
                    {rows.length} sections · {formatTime(total)} · edited{" "}
                    {p.updatedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </div>
                  {rows.length > 0 && (
                    <div className="mt-3 flex h-6 items-end gap-px overflow-hidden rounded">
                      {rows.map((s) => (
                        <div
                          key={s.id}
                          title={`${s.name || s.letter} · tension ${s.tension}`}
                          className={s.peak ? "bg-signal" : "bg-muted-foreground/40"}
                          style={{ flexGrow: Math.max(s.seconds, 1), height: `${Math.max(12, s.tension * 10)}%` }}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageBody>
  );
}
