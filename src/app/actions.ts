"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { conceptNotes, journal, progress } from "@/db/schema";
import { conceptBySlug } from "@/content/curriculum";
import { requireUser } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ---------------- progress ---------------- */

export async function setProgress(slug: string, status: "started" | "done" | "none"): Promise<ActionResult> {
  const user = await requireUser();
  if (!conceptBySlug[slug]) return { ok: false, error: "Unknown concept" };
  if (status === "none") {
    await db.delete(progress).where(and(eq(progress.userId, user.id), eq(progress.conceptSlug, slug)));
  } else {
    await db
      .insert(progress)
      .values({ userId: user.id, conceptSlug: slug, status })
      .onConflictDoUpdate({
        target: [progress.userId, progress.conceptSlug],
        set: { status, updatedAt: sql`now()` },
      });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------------- concept notes ---------------- */

export async function saveConceptNote(slug: string, content: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!conceptBySlug[slug]) return { ok: false, error: "Unknown concept" };
  if (content.length > 50_000) return { ok: false, error: "Note is too long" };
  await db
    .insert(conceptNotes)
    .values({ userId: user.id, conceptSlug: slug, content })
    .onConflictDoUpdate({
      target: [conceptNotes.userId, conceptNotes.conceptSlug],
      set: { content, updatedAt: sql`now()` },
    });
  return { ok: true };
}

/* ---------------- journal ---------------- */

const journalSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  studied: z.string().max(2000),
  analyzed: z.string().max(2000),
  wrote: z.string().max(2000),
  worked: z.string().max(2000),
  bored: z.string().max(2000),
});

export type JournalFormState = { ok?: boolean; error?: string } | undefined;

export async function saveJournal(_prev: JournalFormState, fd: FormData): Promise<JournalFormState> {
  const user = await requireUser();
  const parsed = journalSchema.safeParse({
    weekOf: fd.get("weekOf") ?? "",
    studied: fd.get("studied") ?? "",
    analyzed: fd.get("analyzed") ?? "",
    wrote: fd.get("wrote") ?? "",
    worked: fd.get("worked") ?? "",
    bored: fd.get("bored") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  if (![v.studied, v.analyzed, v.wrote, v.worked, v.bored].some((s) => s.trim())) {
    return { error: "Write at least one line" };
  }
  await db.insert(journal).values({ ...v, userId: user.id });
  revalidatePath("/journal");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteJournal(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.delete(journal).where(and(eq(journal.id, id), eq(journal.userId, user.id)));
  revalidatePath("/journal");
  return { ok: true };
}
