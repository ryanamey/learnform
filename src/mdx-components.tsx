import type { MDXComponents } from "mdx/types";

import { MotifPlayer } from "@/components/audio/motif-player";
import { ExampleList } from "@/components/audio/example-list";
import { GroupingDemo } from "@/components/audio/grouping-demo";
import { SentenceDemo } from "@/components/audio/sentence-demo";
import { Aside, EPTask, Exercise, KeyIdea, ListenFor, Source } from "@/components/content/blocks";

const components: MDXComponents = {
  MotifPlayer,
  ExampleList,
  GroupingDemo,
  SentenceDemo,
  Source,
  KeyIdea,
  ListenFor,
  Exercise,
  EPTask,
  Aside,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
