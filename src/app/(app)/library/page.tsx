import type { Metadata } from "next";
import Link from "next/link";

import { books, concepts, type BookVerdict } from "@/content/curriculum";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Library" };

const GROUPS: { verdict: BookVerdict; title: string; note: string }[] = [
  { verdict: "core", title: "Core", note: "Read closely, in this order." },
  { verdict: "selective", title: "Selective", note: "Specific chapters, when the module calls for them." },
  { verdict: "reference", title: "Reference", note: "Look things up; don't read cover to cover." },
  { verdict: "later", title: "Later / optional", note: "Low priority, or you don't have the full text yet." },
  { verdict: "drop", title: "Dropped", note: "Not worth the time for this goal." },
];

export default function LibraryPage() {
  return (
    <PageBody>
      <PageHeader eyebrow="Library" title="Your books, in reading order">
        The books you own, re-ranked after the source search: what each is for, what you have, and which pages use it.
        New sources to add are in the{" "}
        <Link href="/docs/sources" className="text-signal underline underline-offset-4">
          master source list
        </Link>
        .
      </PageHeader>
      <div className="space-y-10">
        {GROUPS.map((g) => (
          <section key={g.verdict}>
            <div className="mb-3">
              <h2 className="font-serif text-xl">{g.title}</h2>
              <p className="text-sm text-muted-foreground">{g.note}</p>
            </div>
            <ol className="space-y-3">
              {books
                .filter((b) => b.verdict === g.verdict)
                .map((b) => {
                  const uses = concepts.filter((c) => c.sources.some((s) => s.book === b.id));
                  return (
                    <li key={b.id} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-mono text-xs text-muted-foreground">{String(b.order).padStart(2, "0")}</span>
                        <span className="font-medium">{b.title}</span>
                        <span className="text-sm text-muted-foreground">{b.author}</span>
                      </div>
                      <p className="mt-2 text-sm">{b.why}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{b.copy}</Badge>
                        {b.readFirst && <Badge variant="signal">Read: {b.readFirst}</Badge>}
                        {b.modules.map((m) => (
                          <Badge key={m} variant="secondary">
                            Module {m}
                          </Badge>
                        ))}
                      </div>
                      {uses.length > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Used in:{" "}
                          {uses.map((c, i) => (
                            <span key={c.slug}>
                              {i > 0 && ", "}
                              <Link href={`/learn/${c.slug}`} className="text-foreground underline-offset-4 hover:underline">
                                {c.title}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ol>
          </section>
        ))}
      </div>
    </PageBody>
  );
}
