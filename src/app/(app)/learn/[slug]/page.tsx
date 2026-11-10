import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock } from "lucide-react";

import { bookById, conceptBySlug, concepts } from "@/content/curriculum";
import { conceptPages } from "@/content/concepts";
import { getConceptNote, getProgress } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody } from "@/components/shell/page-header";
import { ProgressControls } from "./progress-controls";
import { ConceptNotes } from "./concept-notes";

export function generateStaticParams() {
  return concepts.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: conceptBySlug[slug]?.title ?? "Concept" };
}

export default async function ConceptPage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const concept = conceptBySlug[slug];
  const load = conceptPages[slug];
  if (!concept || !load) notFound();

  const user = await requireUser();
  const [{ default: Content }, progress, note] = await Promise.all([
    load(),
    getProgress(user.id),
    getConceptNote(user.id, slug),
  ]);

  const list = concepts.filter((c) => c.module === concept.module);
  const i = list.findIndex((c) => c.slug === slug);
  const prev = list[i - 1];
  const next = list[i + 1];

  return (
    <PageBody>
      <Link href="/learn" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All concepts
      </Link>

      <header className="mb-10">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-signal">
          Module 0{concept.module} · {concept.order} of {list.length}
        </div>
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">{concept.title}</h1>
        {concept.draft && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="mr-1.5 rounded border px-1.5 py-0.5 font-mono uppercase">Draft</span>
            Built from selected chapters. It will be revised as each source is read in full —{" "}
            <Link href="/docs/coverage" className="underline underline-offset-4">see coverage</Link>.
          </p>
        )}
        <p className="mt-3 text-lg text-muted-foreground">{concept.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" /> about {concept.minutes} min + practice
          </span>
          <ProgressControls slug={slug} status={progress[slug] ?? null} />
        </div>
        <div className="mt-5 rounded-xl border bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <BookOpen className="size-3.5" /> Read in your books
          </div>
          <ul className="space-y-1 text-sm">
            {concept.sources.map((s) => (
              <li key={s.book + s.where}>
                <span className="font-medium">{bookById[s.book]?.author}</span>
                <span className="text-muted-foreground">, {bookById[s.book]?.title}</span>
                <span className="text-muted-foreground"> — {s.where}</span>
                {s.read === "partial" && <span className="ml-2 text-xs text-signal">read in part</span>}
                {s.read === "unread" && <span className="ml-2 text-xs text-destructive">not yet read</span>}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <article className="prose-lf">
        <Content />
      </article>

      <section className="mt-14 border-t pt-8">
        <h2 className="mb-3 font-serif text-2xl">Your notes</h2>
        <ConceptNotes slug={slug} initial={note} />
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        {prev ? (
          <Link href={`/learn/${prev.slug}`} className="group text-sm">
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="inline-flex items-center gap-1 group-hover:text-signal">
              <ArrowLeft className="size-4" /> {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        <ProgressControls slug={slug} status={progress[slug] ?? null} large />
        {next ? (
          <Link href={`/learn/${next.slug}`} className="group text-right text-sm">
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="inline-flex items-center gap-1 group-hover:text-signal">
              {next.title} <ArrowRight className="size-4" />
            </span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </PageBody>
  );
}
