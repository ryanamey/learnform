import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { docPages, docs } from "@/content/docs";
import { PageBody } from "@/components/shell/page-header";

export function generateStaticParams() {
  return docs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: docs.find((d) => d.slug === slug)?.title ?? "Doc" };
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const meta = docs.find((d) => d.slug === slug);
  const load = docPages[slug];
  if (!meta || !load) notFound();
  const { default: Content } = await load();
  return (
    <PageBody wide>
      <Link href="/docs" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All docs
      </Link>
      <header className="mb-8 max-w-3xl">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-signal">
          {meta.group} · updated {meta.updated}
        </div>
        <h1 className="font-serif text-4xl tracking-tight">{meta.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{meta.summary}</p>
      </header>
      <article className="prose-lf max-w-4xl">
        <Content />
      </article>
    </PageBody>
  );
}
