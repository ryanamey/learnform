import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { conceptNotes, formPlans, journal, motifs, progress } from "@/db/schema";
import { planDataSchema } from "@/lib/form-plan";

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

export async function getPlans(userId: string) {
  return db
    .select({ id: formPlans.id, title: formPlans.title, song: formPlans.song, data: formPlans.data, updatedAt: formPlans.updatedAt })
    .from(formPlans)
    .where(eq(formPlans.userId, userId))
    .orderBy(desc(formPlans.updatedAt));
}

export async function getPlan(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select()
    .from(formPlans)
    .where(and(eq(formPlans.id, id), eq(formPlans.userId, userId)));
  if (!row) return null;
  const parsed = planDataSchema.safeParse(row.data);
  return { ...row, data: parsed.success ? parsed.data : planDataSchema.parse({}) };
}
