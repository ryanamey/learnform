import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, CircleDot, Lock } from "lucide-react";

import { concepts, courses, rules, weeklyLoop } from "@/content/curriculum";
import { getJournal, getProgress } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function StudioPage() {
  const user = await requireUser();
  const [progress, journal] = await Promise.all([getProgress(user.id), getJournal(user.id)]);

  const openCourses = courses.filter((m) => m.status !== "coming").map((m) => m.number);
  const currentModule =
    openCourses.find((n) => concepts.some((c) => c.course === n && progress[c.slug] !== "done")) ?? openCourses[0];
  const current = courses.find((m) => m.number === currentModule);
  const m1 = concepts.filter((c) => c.course === currentModule).sort((a, b) => a.order - b.order);
  const done = m1.filter((c) => progress[c.slug] === "done").length;
  const next = m1.find((c) => progress[c.slug] !== "done");
  const currentLabel = current ? (current.number === 0 ? "Start here" : `Course ${current.roman} · ${current.title}`) : "";
  const firstName = (user.name || "").split(" ")[0];
  const lastEntry = journal[0];

  return (
    <PageBody wide>
      <PageHeader eyebrow="Studio" title={firstName ? `Welcome back, ${firstName}.` : "Welcome back."}>
        Read a little, hear it, write something with it. One course at a time.
        {progress["method"] !== "done" && (
          <>
            {" "}
            New here? Start with{" "}
            <Link href="/learn/method" className="text-signal underline underline-offset-4">
              How to use this app
            </Link>
            .
          </>
        )}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>
              {currentLabel}
            </CardDescription>
            <CardTitle className="font-serif text-2xl font-normal">
              {next ? next.title : "Course complete"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {next ? next.summary : "Every concept here is marked done. Write a page of your own form principles in the journal before moving on."}
            </p>
            <div className="flex items-center gap-3">
              <Progress value={(done / m1.length) * 100} className="max-w-xs" />
              <span className="text-xs text-muted-foreground">
                {done} of {m1.length} done
              </span>
            </div>
            {next && (
              <Button asChild variant="signal">
                <Link href={`/learn/${next.slug}`}>
                  {progress[next.slug] === "started" ? "Continue" : "Start"} <ArrowRight />
                </Link>
              </Button>
            )}
            <ul className="grid gap-1 pt-2 sm:grid-cols-2">
              {m1.map((c) => {
                const s = progress[c.slug];
                const Icon = s === "done" ? CheckCircle2 : s === "started" ? CircleDot : Circle;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/learn/${c.slug}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Icon className={s ? "size-4 text-signal" : "size-4 text-muted-foreground"} />
                      {c.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardDescription>Journal</CardDescription>
              <CardTitle className="text-base">
                {lastEntry ? `Last entry: week of ${lastEntry.weekOf}` : "No entries yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastEntry?.worked && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">“{lastEntry.worked}”</p>}
              <Button asChild variant="outline" size="sm">
                <Link href="/journal">Write this week&apos;s five lines</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-serif text-xl">The weekly loop</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weeklyLoop.map((s, i) => (
            <div key={s.step} className="rounded-xl border p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">
                  {i + 1}. {s.step}
                </span>
                <span className="text-xs text-muted-foreground">{s.time}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-serif text-xl">The courses</h2>
          <ol className="space-y-2">
            {courses.map((m) => (
              <li key={m.number}>
                <Link href={`/learn#course-${m.number}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/40">
                  <span className="mt-0.5 w-8 font-mono text-xs text-muted-foreground">{m.roman}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {m.title}
                      {m.status === "coming" && <Lock className="size-3 text-muted-foreground" />}
                      {m.status === "built" && <span className="text-xs font-normal text-signal">built</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="mb-4 font-serif text-xl">House rules</h2>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r} className="rounded-lg border-l-2 border-signal bg-card px-4 py-3 text-sm">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageBody>
  );
}
