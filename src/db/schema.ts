import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  date,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type { PlanData } from "@/lib/form-plan";

/* ------------------------------------------------------------------ */
/* Better Auth core tables                                             */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Learn Form tables                                                   */
/* ------------------------------------------------------------------ */

/** Study progress per concept page. status: "started" | "done" */
export const progress = pgTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conceptSlug: text("concept_slug").notNull(),
    status: text("status").notNull().default("started"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptSlug] })]
);

/** Your own notes / exercise answers on each concept page. */
export const conceptNotes = pgTable(
  "concept_notes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conceptSlug: text("concept_slug").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptSlug] })]
);

/**
 * Motif bank: riffs, vocal hooks and rhythmic cells, written in the
 * simple text notation (see src/lib/music/notation.ts) so they can be played back.
 * parentId builds the motif family tree.
 */
export const motifs = pgTable(
  "motifs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notation: text("notation").notNull(),
    bpm: integer("bpm").notNull().default(100),
    kind: text("kind").notNull().default("riff"), // riff | vocal | rhythm | chord
    description: text("description").notNull().default(""),
    parentId: uuid("parent_id").references((): AnyPgColumn => motifs.id, {
      onDelete: "set null",
    }),
    similarity: integer("similarity"), // 1–5 distance from parent (Belkin's scale)
    transformation: text("transformation").notNull().default(""),
    epTrack: text("ep_track").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("motifs_user_idx").on(t.userId), index("motifs_parent_idx").on(t.parentId)]
);

/** Weekly reflection: the 5-line journal from the roadmap's weekly loop. */
export const journal = pgTable(
  "journal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekOf: date("week_of").notNull(),
    studied: text("studied").notNull().default(""),
    analyzed: text("analyzed").notNull().default(""),
    wrote: text("wrote").notNull().default(""),
    worked: text("worked").notNull().default(""),
    bored: text("bored").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("journal_user_idx").on(t.userId)]
);

export type Motif = typeof motifs.$inferSelect;
export type JournalEntry = typeof journal.$inferSelect;

/**
 * Form plans: a song designed section by section before the material exists.
 * The sections, lanes and focal parameters live in `data` (see src/lib/form-plan.ts).
 */
export const formPlans = pgTable(
  "form_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled plan"),
    song: text("song").notNull().default(""),
    data: jsonb("data").notNull().$type<PlanData>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("form_plans_user_idx").on(t.userId)]
);

