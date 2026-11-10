import type { Metadata } from "next";

import { getJournal } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { JournalForm } from "./journal-form";
import { DeleteEntry } from "./delete-entry";

export const metadata: Metadata = { title: "Journal" };

const FIELDS = [
  ["studied", "Studied"],
  ["analyzed", "Analyzed"],
  ["wrote", "Wrote"],
  ["worked", "What worked"],
  ["bored", "What bored me"],
] as const;

function mondayOf(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export default async function JournalPage() {
  const user = await requireUser();
  const entries = await getJournal(user.id);
  return (
    <PageBody>
      <PageHeader eyebrow="Journal" title="Five lines a week">
        The “bored me” line matters as much as the others: boredom is information about form.
      </PageHeader>
      <JournalForm defaultWeek={mondayOf()} />
      <section className="mt-12 space-y-4">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Your entries will appear here.</p>}
        {entries.map((e) => (
          <article key={e.id} className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg">Week of {e.weekOf}</h3>
              <DeleteEntry id={e.id} />
            </div>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
              {FIELDS.map(([k, label]) =>
                e[k] ? (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-wrap">{e[k]}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </article>
        ))}
      </section>
    </PageBody>
  );
}
