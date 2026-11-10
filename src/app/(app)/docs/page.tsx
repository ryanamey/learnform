import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { docs } from "@/content/docs";
import { PageBody, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  const groups = [...new Set(docs.map((d) => d.group))];
  return (
    <PageBody>
      <PageHeader eyebrow="Docs" title="The blueprint and its sources">
        Everything the app is built from. These documents are updated with every module and every book read — check the
        decision log to see what changed and why.
      </PageHeader>
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">{g}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {docs
                .filter((d) => d.group === g)
                .map((d) => (
                  <li key={d.slug}>
                    <Link href={`/docs/${d.slug}`} className="flex h-full gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-signal">
                      <FileText className="mt-0.5 size-5 shrink-0 text-signal" />
                      <div>
                        <div className="font-medium">{d.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{d.summary}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Updated {d.updated}</p>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </PageBody>
  );
}
