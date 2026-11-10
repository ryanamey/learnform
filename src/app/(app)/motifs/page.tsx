import type { Metadata } from "next";

import { getMotifs } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { MotifBank } from "./motif-bank";

export const metadata: Metadata = { title: "Motif bank" };

export default async function MotifsPage() {
  const user = await requireUser();
  const motifs = await getMotifs(user.id);
  return (
    <PageBody wide>
      <PageHeader eyebrow="Motif bank" title="Riffs, hooks and cells — as a family tree">
        Every sketch goes here. Link a variant to its parent and rate how far it travelled (1–5). Over time the tree
        shows how your material grows — and which ideas the EP is really made of.
      </PageHeader>
      <MotifBank
        motifs={motifs.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }))}
      />
    </PageBody>
  );
}
