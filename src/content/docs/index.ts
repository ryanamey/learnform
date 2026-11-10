import type { ComponentType } from "react";

export type DocMeta = {
  slug: string;
  title: string;
  summary: string;
  group: "Blueprint" | "Sources" | "Band";
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
    updated: "2026-11-10",
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
    updated: "2026-11-10",
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
  "belkin-guide": () => import("./belkin-guide.mdx"),
  "kramer-guide": () => import("./kramer-guide.mdx"),
  "apm-guide": () => import("./apm-guide.mdx"),
  sources: () => import("./sources.mdx"),
  "psychology-sources": () => import("./psychology-sources.mdx"),
  "band-brief": () => import("./band-brief.mdx"),
};
