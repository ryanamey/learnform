import type { ComponentType } from "react";

// One entry per MDX page. Add a line here when you add a concept.
export const conceptPages: Record<string, () => Promise<{ default: ComponentType }>> = {
  motive: () => import("./motive.mdx"),
  "similarity-scale": () => import("./similarity-scale.mdx"),
  "developing-variation": () => import("./developing-variation.mdx"),
  "phrase-and-memory": () => import("./phrase-and-memory.mdx"),
  "sentence-and-liquidation": () => import("./sentence-and-liquidation.mdx"),
  "words-as-motive": () => import("./words-as-motive.mdx"),
};
