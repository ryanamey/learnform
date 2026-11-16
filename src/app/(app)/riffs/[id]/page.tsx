import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMotif, getMotifs } from "@/lib/data";
import { readBoard } from "@/lib/riff";
import { requireUser } from "@/lib/session";
import { RiffBoard } from "./riff-board";

export const metadata: Metadata = { title: "Riff board" };

export default async function RiffPage({ params }: PageProps<"/riffs/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const motif = await getMotif(user.id, id);
  if (!motif) notFound();
  const all = await getMotifs(user.id);
  const others = all
    .filter((m) => m.id !== motif.id)
    .map((m) => ({ id: m.id, name: m.name, notation: m.notation, meter: readBoard(m.board).meter }));
  return (
    <RiffBoard
      id={motif.id}
      name={motif.name}
      kind={motif.kind}
      notation={motif.notation}
      bpm={motif.bpm}
      initialBoard={motif.board}
      others={others}
    />
  );
}
