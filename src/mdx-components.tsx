import type { MDXComponents } from "mdx/types";

import { MotifPlayer } from "@/components/audio/motif-player";
import { ExampleList } from "@/components/audio/example-list";
import { GroupingDemo } from "@/components/audio/grouping-demo";
import { SentenceDemo } from "@/components/audio/sentence-demo";
import { Mermaid } from "@/components/content/mermaid";
import { Aside, EPTask, Exercise, KeyIdea, ListenFor, ListenerSide, Source, Steps } from "@/components/content/blocks";
import { FrameCycleLab, MeterLab, TimeFeelLab } from "@/components/audio/meter-labs";
import { EndingLab, FormPlanner, PunctuationLab, TransitionLab, VariationGroupsLab } from "@/components/audio/arch-labs";
import { ClimaxShapes, CueLab, GrooveLab, ProcessLab, TensionLab } from "@/components/audio/energy-labs";

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
  Mermaid,
  ListenerSide,
  Steps,
  MeterLab,
  FrameCycleLab,
  TimeFeelLab,
  TensionLab,
  CueLab,
  ClimaxShapes,
  ProcessLab,
  GrooveLab,
  PunctuationLab,
  TransitionLab,
  VariationGroupsLab,
  EndingLab,
  FormPlanner,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
