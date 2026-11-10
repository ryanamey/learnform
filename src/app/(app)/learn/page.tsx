import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, Clock, Lock } from "lucide-react";

import { concepts, modules } from "@/content/curriculum";
import { getProgress } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage() {
  const user = await requireUser();
  const progress = await getProgress(user.id);

  return (
    <PageBody>
      <PageHeader eyebrow="Learn" title="Concepts">
        Organized by idea, not by book. Each page draws on the relevant chapters of several books, with sound you can
        play and practice tasks.
      </PageHeader>

      <div className="space-y-10">
        {modules.map((m) => {
          const list = concepts.filter((c) => c.module === m.number);
          return (
            <section key={m.number}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">MODULE 0{m.number}</span>
                <h2 className="font-serif text-xl">{m.title}</h2>
                {!m.available && (
                  <Badge variant="outline" className="gap-1">
                    <Lock /> coming
                  </Badge>
                )}
              </div>
              {m.available ? (
                <ol className="divide-y rounded-xl border">
                  {list.map((c) => {
                    const s = progress[c.slug];
                    const Icon = s === "done" ? CheckCircle2 : s === "started" ? CircleDot : Circle;
                    return (
                      <li key={c.slug}>
                        <Link href={`/learn/${c.slug}`} className="flex items-start gap-4 p-4 transition-colors hover:bg-accent/40">
                          <Icon className={s ? "mt-0.5 size-5 text-signal" : "mt-0.5 size-5 text-muted-foreground"} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {c.order}. {c.title}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">{c.summary}</p>
                          </div>
                          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                            <Clock className="size-3" /> {c.minutes} min
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  {m.focus}. Builds the <span className="text-foreground">{m.tool}</span>.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </PageBody>
  );
}
