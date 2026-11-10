/**
 * The study map: books, modules, concepts and the year plan.
 * Content lives in MDX (src/content/concepts); this file is the index.
 */

export type BookVerdict = "core" | "selective" | "reference" | "later";

export type Book = {
  id: string;
  order: number;
  title: string;
  author: string;
  kind: "book" | "article" | "excerpt";
  verdict: BookVerdict;
  /** what you actually have */
  copy: string;
  why: string;
  readFirst?: string;
  modules: number[];
};

export const books: Book[] = [
  {
    id: "belkin",
    order: 1,
    title: "Musical Composition: Craft and Art",
    author: "Alan Belkin",
    kind: "book",
    verdict: "core",
    copy: "Full book",
    why: "A composer's book, organized around what music does (presenting, connecting, contrasting) — the most practical book you own.",
    readFirst: "Ch. 1 Motive, Ch. 2 Phrase, Ch. 3 Singing",
    modules: [1, 3],
  },
  {
    id: "schoenberg",
    order: 2,
    title: "Fundamentals of Musical Composition",
    author: "Arnold Schoenberg",
    kind: "book",
    verdict: "core",
    copy: "Full book (scanned)",
    why: "Where 'motive', 'developing variation', 'the sentence' and 'liquidation' come from. Read the first eight chapters; skip the Classical forms.",
    readFirst: "Ch. I–V and VIII",
    modules: [1],
  },
  {
    id: "snyder",
    order: 3,
    title: "Music and Memory: An Introduction",
    author: "Bob Snyder",
    kind: "book",
    verdict: "core",
    copy: "Full book",
    why: "Why listeners hold on to some things and lose others. Form in long, repetitive music is whatever memory can reconstruct.",
    readFirst: "Ch. 1, 3, 4 now; 5 and 13 in Module 3",
    modules: [1, 3],
  },
  {
    id: "stephenson",
    order: 4,
    title: "What to Listen For in Rock",
    author: "Ken Stephenson",
    kind: "book",
    verdict: "core",
    copy: "Full book",
    why: "The norms of rock phrase, harmony and form — you need them precisely in order to break them on purpose.",
    modules: [2, 4],
  },
  {
    id: "biamonte",
    order: 5,
    title: "Formal Functions of Metric Dissonance in Rock Music",
    author: "Nicole Biamonte",
    kind: "article",
    verdict: "core",
    copy: "Article (Music Theory Online, 2014)",
    why: "How metric disruptions do formal jobs in rock — with a corpus that includes Tool.",
    modules: [2],
  },
  {
    id: "london",
    order: 6,
    title: "Hearing in Time",
    author: "Justin London",
    kind: "book",
    verdict: "selective",
    copy: "Full book",
    why: "How meter is perceived: entrainment, pulse, limits of what we can track.",
    modules: [2],
  },
  {
    id: "cohn",
    order: 7,
    title: "Metric and Hypermetric Dissonance in the Menuetto of Mozart's Symphony in G Minor",
    author: "Richard Cohn",
    kind: "article",
    verdict: "selective",
    copy: "Article",
    why: "A clear model of metric dissonance on several levels at once.",
    modules: [2],
  },
  {
    id: "larue",
    order: 8,
    title: "Guidelines for Style Analysis",
    author: "Jan LaRue",
    kind: "book",
    verdict: "selective",
    copy: "Full book (scanned)",
    why: "The 'Growth' chapter: how movement and shape arise from all parameters together.",
    readFirst: "Ch. 6 The Growth Process",
    modules: [3],
  },
  {
    id: "huron",
    order: 9,
    title: "Sweet Anticipation",
    author: "David Huron",
    kind: "excerpt",
    verdict: "selective",
    copy: "Partial (68 pages)",
    why: "Expectation: how prediction, surprise and reward work while listening.",
    modules: [3],
  },
  {
    id: "covach",
    order: 10,
    title: "Understanding Rock (eds. Covach & Boone)",
    author: "John Covach et al.",
    kind: "book",
    verdict: "selective",
    copy: "Full essay collection",
    why: "For Covach's essay on Yes, 'Close to the Edge' and the boundaries of style.",
    modules: [4],
  },
  {
    id: "analysing-rock",
    order: 11,
    title: "Analysing Rock: Means and Ends",
    author: "—",
    kind: "article",
    verdict: "selective",
    copy: "Article",
    why: "A method for analysing rock on its own terms, beyond notation.",
    modules: [4],
  },
  {
    id: "meyer",
    order: 12,
    title: "Explaining Music",
    author: "Leonard B. Meyer",
    kind: "book",
    verdict: "selective",
    copy: "Full book",
    why: "Implication and realization in melody — expectation at the level of the line.",
    modules: [5],
  },
  {
    id: "caplin",
    order: 13,
    title: "Analyzing Classical Form",
    author: "William E. Caplin",
    kind: "book",
    verdict: "reference",
    copy: "Full textbook (759 pp.)",
    why: "Use as a dictionary: presentation, continuation, cadential function, transition.",
    modules: [3],
  },
  {
    id: "gttm",
    order: 14,
    title: "A Generative Theory of Tonal Music",
    author: "Fred Lerdahl & Ray Jackendoff",
    kind: "book",
    verdict: "reference",
    copy: "Full book",
    why: "Grouping and metrical preference rules, if you want the formal model behind Module 2.",
    modules: [2],
  },
  {
    id: "lerdahl-pitch",
    order: 15,
    title: "Tonal Pitch Space (1988 article)",
    author: "Fred Lerdahl",
    kind: "article",
    verdict: "later",
    copy: "Article",
    why: "Tonal-harmony distance. Low return for modal, riff-based writing — later, if at all.",
    modules: [],
  },
  {
    id: "almen",
    order: 16,
    title: "A Theory of Musical Narrative",
    author: "Byron Almén",
    kind: "excerpt",
    verdict: "later",
    copy: "Table of contents only",
    why: "Get the full book before Module 5 if narrative archetypes interest you.",
    modules: [5],
  },
];

export const bookById = Object.fromEntries(books.map((b) => [b.id, b]));

export type Concept = {
  slug: string;
  module: number;
  order: number;
  title: string;
  summary: string;
  minutes: number;
  sources: { book: string; where: string }[];
};

export const concepts: Concept[] = [
  {
    slug: "motive",
    module: 1,
    order: 1,
    title: "What makes a motive",
    summary: "The smallest memorable unit — and why internal contrast is what makes it memorable.",
    minutes: 25,
    sources: [
      { book: "belkin", where: "Ch. 1, opening sections" },
      { book: "schoenberg", where: "Ch. III, The Motive" },
      { book: "snyder", where: "Ch. 1, memory levels" },
    ],
  },
  {
    slug: "similarity-scale",
    module: 1,
    order: 2,
    title: "Degrees of similarity",
    summary: "A 1–5 scale for how far a variant travels from its source — and where in a song each degree belongs.",
    minutes: 35,
    sources: [
      { book: "belkin", where: "Ch. 1, Motivic Variants; Degrees of Similarity" },
      { book: "schoenberg", where: "Ch. III, Treatment of the motive" },
    ],
  },
  {
    slug: "developing-variation",
    module: 1,
    order: 3,
    title: "Developing variation",
    summary: "Variants that grow out of variants: how a whole piece can descend from one cell without repeating it.",
    minutes: 35,
    sources: [
      { book: "schoenberg", where: "Ch. III–IV" },
      { book: "belkin", where: "Ch. 1, Double motives; Motivic wandering; Ornamentation" },
    ],
  },
  {
    slug: "phrase-and-memory",
    module: 1,
    order: 4,
    title: "Phrase, grouping and memory",
    summary: "Why phrases are the size they are: the 3–5 second window, chunking, and the forces that draw boundaries.",
    minutes: 40,
    sources: [
      { book: "snyder", where: "Ch. 3 Grouping; Ch. 4 Short-term memory" },
      { book: "belkin", where: "Ch. 2, Structure of the phrase" },
      { book: "schoenberg", where: "Ch. II, The Phrase" },
    ],
  },
  {
    slug: "sentence-and-liquidation",
    module: 1,
    order: 5,
    title: "The sentence and liquidation",
    summary: "Present, repeat, compress, dissolve, arrive — the most useful small-scale form for riff-based music.",
    minutes: 40,
    sources: [
      { book: "schoenberg", where: "Ch. V and VIII" },
      { book: "belkin", where: "Ch. 1, Neutral lines" },
      { book: "caplin", where: "Sentence; presentation / continuation (as a dictionary)" },
    ],
  },
  {
    slug: "words-as-motive",
    module: 1,
    order: 6,
    title: "The vocal line: words shape the motive",
    summary: "For singers: stress, speech contour and vowels decide your melody before you do.",
    minutes: 30,
    sources: [{ book: "belkin", where: "Ch. 3 Singing" }],
  },
];

export const conceptBySlug = Object.fromEntries(concepts.map((c) => [c.slug, c]));

export type Module = {
  number: number;
  title: string;
  weeks: string;
  focus: string;
  tool: string;
  available: boolean;
};

export const modules: Module[] = [
  {
    number: 1,
    title: "Material & identity",
    weeks: "Weeks 1–8",
    focus: "Motive, variation, phrase, memory, the sentence, the vocal line",
    tool: "Motif bank & family tree",
    available: true,
  },
  {
    number: 2,
    title: "Time & meter",
    weeks: "Weeks 9–16",
    focus: "Grouping vs. meter, displacement, polymeter, metric dissonance as form",
    tool: "Meter lab",
    available: false,
  },
  {
    number: 3,
    title: "Architecture, energy & memory",
    weeks: "Weeks 17–28",
    focus: "Continuity, contrast, climax, growth, expectation, formal function",
    tool: "Energy-curve editor",
    available: false,
  },
  {
    number: 4,
    title: "Prog & rock language",
    weeks: "Weeks 29–36",
    focus: "Rock norms, compound and cyclic forms, through-composition",
    tool: "Form maps",
    available: false,
  },
  {
    number: 5,
    title: "Voice & the EP",
    weeks: "Weeks 37–48",
    focus: "The EP as one macro-form, vocal register arcs, narrative",
    tool: "EP planner",
    available: false,
  },
];

export const weeklyLoop = [
  { step: "Read", time: "1–2 h", detail: "One short section, from the concept page's sources." },
  { step: "Analyze", time: "1–2 h", detail: "One piece, one map. Only what the concept asks you to hear." },
  { step: "Write", time: "2–3 h", detail: "A 1–3 minute sketch in your own sound. It goes in the motif bank." },
  { step: "Reflect", time: "15 min", detail: "Five lines in the journal: what worked, what bored you." },
];

export const rules = [
  "Steal the principle, never the surface.",
  "The piece you analyze this week is never the style you write this week.",
  "Every concept gets tested on a real EP track.",
  "Once a month, write one page of 'my form principles'.",
];
