"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { conceptNotes, journal, motifs, progress } from "@/db/schema";
import { conceptBySlug } from "@/content/curriculum";
import { parseNotation } from "@/lib/music/notation";
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

/* ---------------- motifs ---------------- */

const motifSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(120),
  notation: z
    .string()
    .trim()
    .min(1, "Write some notes")
    .max(4000)
    .refine((s) => {
      try {
        return parseNotation(s).events.length > 0;
      } catch {
        return false;
      }
    }, "The notation doesn't parse — check the format guide"),
  bpm: z.coerce.number().int().min(30).max(300),
  kind: z.enum(["riff", "vocal", "rhythm", "chord"]),
  description: z.string().max(4000).default(""),
  parentId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  similarity: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), "Similarity is 1–5"),
  transformation: z.string().max(500).default(""),
  epTrack: z.string().max(200).default(""),
});

export type MotifFormState = { ok?: boolean; error?: string; savedId?: string } | undefined;

function readMotifForm(fd: FormData) {
  return motifSchema.safeParse({
    name: fd.get("name") ?? "",
    notation: fd.get("notation") ?? "",
    bpm: fd.get("bpm") ?? "100",
    kind: fd.get("kind") ?? "riff",
    description: fd.get("description") ?? "",
    parentId: fd.get("parentId") ?? "",
    similarity: fd.get("similarity") ?? "",
    transformation: fd.get("transformation") ?? "",
    epTrack: fd.get("epTrack") ?? "",
  });
}

export async function saveMotif(_prev: MotifFormState, fd: FormData): Promise<MotifFormState> {
  const user = await requireUser();
  const parsed = readMotifForm(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const id = (fd.get("id") as string) || null;
  const v = parsed.data;

  if (v.parentId) {
    const [parent] = await db
      .select({ id: motifs.id })
      .from(motifs)
      .where(and(eq(motifs.id, v.parentId), eq(motifs.userId, user.id)));
    if (!parent) return { error: "Parent motif not found" };
    if (id && v.parentId === id) return { error: "A motif can't be its own parent" };
  }

  if (id) {
    const res = await db
      .update(motifs)
      .set({ ...v, updatedAt: sql`now()` })
      .where(and(eq(motifs.id, id), eq(motifs.userId, user.id)))
      .returning({ id: motifs.id });
    if (res.length === 0) return { error: "Motif not found" };
    revalidatePath("/motifs");
    return { ok: true, savedId: id };
  }
  const [row] = await db
    .insert(motifs)
    .values({ ...v, userId: user.id })
    .returning({ id: motifs.id });
  revalidatePath("/motifs");
  revalidatePath("/");
  return { ok: true, savedId: row.id };
}

export async function deleteMotif(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.delete(motifs).where(and(eq(motifs.id, id), eq(motifs.userId, user.id)));
  revalidatePath("/motifs");
  revalidatePath("/");
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
