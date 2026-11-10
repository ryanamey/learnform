# Learn Form

A private study app for musical form: concept pages built from your books, playable sound examples, and tools for your own writing (motif bank, journal). Built module by module alongside the EP.

**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Drizzle ORM · Neon Postgres · Better Auth · Tone.js · MDX · Vercel

> Keep this repository **private**. The concept pages are detailed study notes on copyrighted books. They're fine for personal study but not for publishing. Never commit the PDFs.

## What's in Module 1

| Concept | Interactive |
|---|---|
| What makes a motive | Motif M, Beethoven 5 cell, M as a palm-mute rhythm |
| Degrees of similarity | 12-variant lab with A/B and ear-training mode |
| Developing variation | Variation chain, double-motive reorderings |
| Phrase, grouping and memory | Grouping lab (6 scenarios), chunking/memory test |
| The sentence and liquidation | 8-bar riff sentence with drums, each stage playable |
| The vocal line | Same lyric set with and against speech stress |

Tools: **Motif bank** (text notation → playback, parent/child family tree, 1–5 distance ratings, EP-track filter), **Journal** (the weekly five lines), **progress + notes** on every concept page.

## Setup

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run db:migrate            # creates the tables in Neon
npm run dev
```

### Creating your account

Sign-up is **closed by default**. To create your account:

1. Set `ALLOW_SIGNUP="true"` (locally in `.env`, or in Vercel → Settings → Environment Variables, then redeploy).
2. Open `/login`, choose "Create your account".
3. Set `ALLOW_SIGNUP` back to `"false"` (and redeploy).

### Vercel environment variables

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | your production URL, e.g. `https://learnform.vercel.app` |
| `ALLOW_SIGNUP` | `false` (temporarily `true` to create your account) |

## Adding content

- **Concept page:** add `src/content/concepts/<slug>.mdx`, register it in `src/content/concepts/index.ts`, and add its entry to `concepts` in `src/content/curriculum.ts`.
- **Sound examples:** write them in the text notation (see `src/lib/music/notation.ts`) or generate them with the transformations in `src/lib/music/transform.ts`. Shared example sets live in `src/content/examples/`.
- **Components available in MDX** (no imports needed): `MotifPlayer`, `ExampleList`, `GroupingDemo`, `SentenceDemo`, `Source`, `KeyIdea`, `ListenFor`, `Exercise`, `EPTask`, `Aside`.

## Notation (quick reference)

```
E3/8      eighth note           A3/4.    dotted quarter      G3/8t   triplet eighth
E2/8!     accented              r/8      rest                x/16    muted hit
[E2,B2,E3]/4   power chord      |        bar line            E4/8"love"  lyric syllable
```

Guitar low E = `E2`, open high E = `E4`.

## Database

```bash
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate
npm run db:studio     # browse your data
```
