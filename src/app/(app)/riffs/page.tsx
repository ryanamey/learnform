import type { Metadata } from "next";
import Link from "next/link";
import { Music2 } from "lucide-react";

import { getMotifs } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { GuitarProImport } from "./guitar-pro-import";
import { riffSummary } from "./summary";

export const metadata: Metadata = { title: "Riff board" };

export default async function RiffsPage() {
  const user = await requireUser();
  const motifs = await getMotifs(user.id);
  return (
    <PageBody wide>
      <PageHeader
        eyebrow="Riff board"
        title="Count it, group it, find its home"
        actions={
          <Button asChild variant="outline">
            <Link href="/motifs">
              <Music2 /> Add riffs in the motif bank
            </Link>
          </Button>
        }
      >
        Every riff in your motif bank, read as a count and a harmony: its number string of 2s and 3s, how it sits
        against the meter, how long it lasts at your tempo, where it lines up with another loop, its tonic, mode and
        chord functions, and which chords stay clear under gain.
      </PageHeader>

      <div className="mb-6">
        <GuitarProImport />
      </div>

      {motifs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No riffs yet. Import one from Guitar Pro, or write one in the motif bank (the notation is like{" "}
          <code>E2/8! E2/8 G2/8 A2/4</code>) and it appears here.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {motifs.map((m) => {
            const s = riffSummary(m.notation, m.board);
            return (
              <li key={m.id}>
                <Link href={`/riffs/${m.id}`} className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-lg">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.kind}</span>
                  </div>
                  {s.ok ? (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {s.board.meter ? `${s.board.meter} · ` : ""}
                      <span className="font-mono text-foreground">{s.grouping}</span>
                      {s.guessed ? " (guessed)" : ""} · {s.units} units
                      {s.tonic ? ` · on ${s.tonic}` : ""}
                      {s.mode ? ` ${s.mode}` : ""}
                      {s.board.motto ? " · motto" : ""}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-muted-foreground">Can’t read this notation yet.</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageBody>
  );
}
