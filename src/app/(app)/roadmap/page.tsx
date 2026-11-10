import type { Metadata } from "next";

import { foundInReading, modules, rules, weeklyLoop } from "@/content/curriculum";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Roadmap" };

const maps = [
  { name: "Material map", what: "Which ideas exist, where they return, how they change (with 1–5 ratings)." },
  { name: "Energy curve", what: "Density, dynamics and register together, scored 0–10 every 15–20 seconds." },
  { name: "Meter map", what: "Written meter vs. felt pulse vs. grouping vs. cycle length." },
];

const listening = [
  "Steve Reich — Music for 18 Musicians (form as process)",
  "Béla Bartók — String Quartet No. 4 or 5 (arch forms)",
  "A Hindustani tabla solo or a performance ending in a tihai (cycle-based form)",
  "Godspeed You! Black Emperor — any long track (form as one energy curve)",
];

export default function RoadmapPage() {
  return (
    <PageBody>
      <PageHeader eyebrow="Roadmap" title="Twelve months, writing every week">
        Concepts first, then a tool that uses them.
      </PageHeader>

      <ol className="relative space-y-4 border-l pl-6">
        {modules.map((m) => (
          <li key={m.number} className="relative">
            <span
              className={`absolute -left-[31px] top-1.5 size-3 rounded-full border-2 ${m.available ? "border-signal bg-signal" : "border-border bg-background"}`}
            />
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-xs text-muted-foreground">0{m.number}</span>
                <span className="font-serif text-lg">{m.title}</span>
                <span className="text-sm text-muted-foreground">{m.weeks}</span>
                {m.available ? <Badge variant="signal">open</Badge> : <Badge variant="outline">coming</Badge>}
              </div>
              <p className="mt-2 text-sm">{m.focus}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tool: {m.tool}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-12">
        <h2 className="mb-1 font-serif text-2xl">Found in the reading, not built yet</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every source read ends with a sweep for ideas the app doesn&apos;t teach yet. They wait here, with where they came
          from and where they&apos;ll go, until a page or section covers them.
        </p>
        <ul className="space-y-2">
          {foundInReading.map((f) => (
            <li key={f.idea} className="rounded-lg border p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1">{f.idea}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">Module {f.module}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.source}
                {f.note ? ` · ${f.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-serif text-2xl">Every week</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {weeklyLoop.map((s) => (
            <div key={s.step} className="rounded-xl border p-4">
              <div className="flex justify-between text-sm font-semibold">
                {s.step} <span className="font-normal text-muted-foreground">{s.time}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-serif text-2xl">Three maps, every analysis</h2>
        <ul className="space-y-2">
          {maps.map((m) => (
            <li key={m.name} className="rounded-lg border p-3 text-sm">
              <span className="font-medium">{m.name}:</span> <span className="text-muted-foreground">{m.what}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 font-serif text-2xl">Rules</h2>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r} className="rounded-lg border-l-2 border-signal bg-card px-4 py-3 text-sm">
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-serif text-2xl">Outside rock, on purpose</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            So your form ideas don&apos;t all come from the bands you admire.
          </p>
          <ul className="space-y-2 text-sm">
            {listening.map((l) => (
              <li key={l} className="rounded-lg border px-4 py-3">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageBody>
  );
}
