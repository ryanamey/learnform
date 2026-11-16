import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, Clock, Lock, MessagesSquare } from "lucide-react";

import { concepts, courses, type Concept } from "@/content/curriculum";
import { getProgress } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Learn" };

const STATUS: Record<string, { label: string; variant: "signal" | "outline" | "secondary" }> = {
  built: { label: "built from the books", variant: "signal" },
  open: { label: "earlier pages · rewrite pending", variant: "secondary" },
  coming: { label: "coming", variant: "outline" },
};

function Row({ c, status }: { c: Concept; status?: string }) {
  const Icon = status === "done" ? CheckCircle2 : status === "started" ? CircleDot : Circle;
  const seminar = c.kind === "seminar";
  return (
    <li>
      <Link href={`/learn/${c.slug}`} className="flex items-start gap-4 p-4 transition-colors hover:bg-accent/40">
        {seminar ? (
          <MessagesSquare className={status ? "mt-0.5 size-5 text-signal" : "mt-0.5 size-5 text-note-b"} />
        ) : (
          <Icon className={status ? "mt-0.5 size-5 text-signal" : "mt-0.5 size-5 text-muted-foreground"} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {seminar ? "Seminar · " : `${c.order}. `}
            {c.title}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{c.summary}</p>
        </div>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Clock className="size-3" /> {c.minutes} min
        </span>
      </Link>
    </li>
  );
}

export default async function LearnPage() {
  const user = await requireUser();
  const progress = await getProgress(user.id);

  return (
    <PageBody>
      <PageHeader eyebrow="Learn" title="Courses">
        Organized by idea, not by book. Each lesson sets out what each writer says, in his own terms, with sound you can
        play and practice tasks. Where the writers disagree, a seminar puts them side by side for you to decide.
      </PageHeader>

      <div className="space-y-10">
        {courses.map((m) => {
          const all = concepts.filter((c) => c.course === m.number).sort((a, b) => a.order - b.order);
          const lessons = all.filter((c) => c.kind !== "seminar");
          const seminars = all.filter((c) => c.kind === "seminar");
          const st = STATUS[m.status];
          return (
            <section key={m.number} id={`course-${m.number}`}>
              <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {m.number === 0 ? "START" : `COURSE ${m.roman}`}
                </span>
                <h2 className="font-serif text-xl">{m.title}</h2>
                <Badge variant={st.variant} className="gap-1">
                  {m.status === "coming" && <Lock />} {st.label}
                </Badge>
              </div>
              {m.number > 0 && <p className="mb-3 text-xs text-muted-foreground">Readings: {m.readings}</p>}
              {all.length > 0 ? (
                <div className="space-y-3">
                  <ol className="divide-y rounded-xl border">
                    {lessons.map((c) => (
                      <Row key={c.slug} c={c} status={progress[c.slug]} />
                    ))}
                  </ol>
                  {seminars.length > 0 && (
                    <ol className="divide-y rounded-xl border border-note-b/40 bg-note-b/5">
                      {seminars.map((c) => (
                        <Row key={c.slug} c={c} status={progress[c.slug]} />
                      ))}
                    </ol>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{m.focus}.</p>
              )}
            </section>
          );
        })}
      </div>
    </PageBody>
  );
}
