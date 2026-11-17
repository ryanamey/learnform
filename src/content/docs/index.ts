import type { ComponentType } from "react";

export type DocMeta = {
  slug: string;
  title: string;
  summary: string;
  group: "Blueprint" | "Writers" | "Sources" | "Band";
  updated: string;
};

export const docs: DocMeta[] = [
  {
    slug: "blueprint",
    title: "Blueprint",
    summary: "What the app is for, how it is structured (C4-style diagrams), and how every module traces back to sources. v3 adds the listener layer.",
    group: "Blueprint",
    updated: "2026-11-10",
  },
  {
    slug: "coverage",
    title: "Coverage & gaps",
    summary: "Concept × source matrix: what is covered, by which source, at what depth — and what is still missing.",
    group: "Blueprint",
    updated: "2026-11-10",
  },
  {
    slug: "decisions",
    title: "Decision log",
    summary: "Why things are in, out, or ordered the way they are. Newest first.",
    group: "Blueprint",
    updated: "2026-11-16",
  },
  {
    slug: "writer-schoenberg",
    title: "Schoenberg",
    summary: "Fundamentals of Musical Composition: his question, toolkit, where he agrees and differs with the other writers, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-caplin",
    title: "Caplin",
    summary: "Analyzing Classical Form: formal functions, his toolkit and method, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-belkin",
    title: "Belkin",
    summary: "Musical Composition: Craft and Art: what music must do, his scales and principles, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-snyder",
    title: "Snyder",
    summary: "Music and Memory: the three time levels, his toolkit, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-hasty",
    title: "Hasty",
    summary: "Meter as Rhythm: meter as projection, beginning and continuation, limits of meter, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-lerdahl-jackendoff",
    title: "Lerdahl & Jackendoff",
    summary: "A Generative Theory of Tonal Music: grouping vs meter, preference rules, structural downbeat, where they agree and differ, and where the app uses them.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-london",
    title: "London",
    summary: "Hearing in Time: meter as entrainment, time limits, non-isochronous meters, many meters, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-krebs",
    title: "Krebs",
    summary: "Fantasy Pieces: grouping and displacement dissonance, metrical processes, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "writer-larue",
    title: "LaRue",
    summary: "Guidelines for Style Analysis: Sound, texture and fabric, textural rhythm, the weight of articulations, Growth; where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-17",
  },
  {
    slug: "writer-moore",
    title: "Moore",
    summary: "Analysing Rock and Song Means: style and friction, the four layers, the sound-box, ways of making space, voice; his case for starting from texture.",
    group: "Writers",
    updated: "2026-11-17",
  },
  {
    slug: "writer-smolko",
    title: "Smolko",
    summary: "Thick as a Brick: holding a 43-minute track together; motives as leitmotifs, instrumental passages, textural contrast and dynamics.",
    group: "Writers",
    updated: "2026-11-17",
  },
  {
    slug: "writer-yust",
    title: "Yust",
    summary: "Organized Time: rhythmic, tonal and formal structures, hypermeter and closure, where he agrees and differs, and where the app uses him.",
    group: "Writers",
    updated: "2026-11-16",
  },
  {
    slug: "belkin-guide",
    title: "Belkin chapter guide",
    summary: "Musical Composition: Craft and Art, read in full — every chapter's ideas, what they mean for a riff-based band, and where the app uses them.",
    group: "Sources",
    updated: "2026-11-10",
  },
  {
    slug: "kramer-guide",
    title: "Kramer chapter guide",
    summary: "The Time of Music, read in full — linear, multiply-directed, moment and vertical time; accent and hypermeter; duration and proportion; and where the app uses each chapter.",
    group: "Sources",
    updated: "2026-11-10",
  },
  {
    slug: "apm-guide",
    title: "Analyzing Popular Music guide",
    summary: "Moore (ed.), Analyzing Popular Music (2003), read in full — each essay's ideas, what they mean for a band writing long songs, and where the app uses them.",
    group: "Sources",
    updated: "2026-11-16",
  },
  {
    slug: "sources",
    title: "Master source list",
    summary: "Every verified source, ranked by area and priority, with access and who it's for.",
    group: "Sources",
    updated: "2026-11-10",
  },
  {
    slug: "psychology-sources",
    title: "Listener psychology sources",
    summary: "Perception, emotion, groove, trance and meaning — ranked by priority and graded by evidence, with 21 principles that turn into form decisions.",
    group: "Sources",
    updated: "2026-11-10",
  },
  {
    slug: "band-brief",
    title: "Band brief",
    summary: "The band, the goal, how we write — the context every decision is checked against.",
    group: "Band",
    updated: "2026-11-10",
  },
];

export const docPages: Record<string, () => Promise<{ default: ComponentType }>> = {
  blueprint: () => import("./blueprint.mdx"),
  coverage: () => import("./coverage.mdx"),
  decisions: () => import("./decisions.mdx"),
  "writer-schoenberg": () => import("./writer-schoenberg.mdx"),
  "writer-caplin": () => import("./writer-caplin.mdx"),
  "writer-belkin": () => import("./writer-belkin.mdx"),
  "writer-snyder": () => import("./writer-snyder.mdx"),
  "writer-hasty": () => import("./writer-hasty.mdx"),
  "writer-lerdahl-jackendoff": () => import("./writer-lerdahl-jackendoff.mdx"),
  "writer-london": () => import("./writer-london.mdx"),
  "writer-krebs": () => import("./writer-krebs.mdx"),
  "writer-yust": () => import("./writer-yust.mdx"),
  "writer-larue": () => import("./writer-larue.mdx"),
  "writer-moore": () => import("./writer-moore.mdx"),
  "writer-smolko": () => import("./writer-smolko.mdx"),
  "belkin-guide": () => import("./belkin-guide.mdx"),
  "kramer-guide": () => import("./kramer-guide.mdx"),
  "apm-guide": () => import("./apm-guide.mdx"),
  sources: () => import("./sources.mdx"),
  "psychology-sources": () => import("./psychology-sources.mdx"),
  "band-brief": () => import("./band-brief.mdx"),
};
