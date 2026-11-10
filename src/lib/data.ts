import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { conceptNotes, journal, motifs, progress } from "@/db/schema";

export async function getProgress(userId: string) {
  const rows = await db.select().from(progress).where(eq(progress.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.conceptSlug, r.status as "started" | "done"]));
}

export async function getConceptNote(userId: string, slug: string) {
  const [row] = await db
    .select()
    .from(conceptNotes)
    .where(and(eq(conceptNotes.userId, userId), eq(conceptNotes.conceptSlug, slug)));
  return row?.content ?? "";
}

export async function getMotifs(userId: string) {
  return db.select().from(motifs).where(eq(motifs.userId, userId)).orderBy(asc(motifs.createdAt));
}

export async function getJournal(userId: string) {
  return db.select().from(journal).where(eq(journal.userId, userId)).orderBy(desc(journal.weekOf), desc(journal.createdAt));
}
