import type { MDXComponents } from "mdx/types";

import { MotifPlayer } from "@/components/audio/motif-player";
import { ExampleList } from "@/components/audio/example-list";
import { GroupingDemo } from "@/components/audio/grouping-demo";
import { SentenceDemo } from "@/components/audio/sentence-demo";
import { Mermaid } from "@/components/content/mermaid";
import { Aside, ApplyIt, Exercise, KeyIdea, ListenFor, ListenerSide, Source, Steps } from "@/components/content/blocks";
import { FrameCycleLab, MeterLab, TimeFeelLab } from "@/components/audio/meter-labs";
import { LayersLab } from "@/components/audio/layer-labs";
import { DurationLab, GesturalLab, HypermeterLab, MeterGoalLab, StrataLab, TimeModesLab } from "@/components/audio/time-labs";
import { EndingLab, FormPlanner, PunctuationLab, SectionLab, TransitionLab, VariationGroupsLab } from "@/components/audio/arch-labs";
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
  ApplyIt,
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
  SectionLab,
  TimeModesLab,
  GesturalLab,
  StrataLab,
  DurationLab,
  HypermeterLab,
  MeterGoalLab,
  LayersLab,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
