/**
 * The study map: books, modules, concepts and the year plan.
 * Content lives in MDX (src/content/concepts); this file is the index.
 */

export type BookVerdict = "core" | "selective" | "reference" | "later" | "drop";

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
    why: "The only corpus study that includes Tool (39 songs): Tool is the most metrically dissonant band studied, and its choruses are often less stable than its verses. Read first.",
    modules: [2],
  },
  {
    id: "london",
    order: 6,
    title: "Hearing in Time",
    author: "Justin London",
    kind: "book",
    verdict: "core",
    copy: "1st ed. full + 2nd ed. excerpt (26 pp.)",
    why: "Entrainment and non-isochronous meter underpin every cycle-based design. Get the 2nd edition (OUP 2012).",
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
    why: "Expectation theory behind telos, anti-telos and surprise. Your copy is partial — buy a full one.",
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
    why: "Probably a chapter of Allan Moore's Rock: The Primary Text (2nd ed.) — not yet confirmed. If so, get the whole book.",
    modules: [4],
  },
  {
    id: "meyer",
    order: 12,
    title: "Explaining Music",
    author: "Leonard B. Meyer",
    kind: "book",
    verdict: "later",
    copy: "Full book",
    why: "Huron and Nobile now cover implication and expectation more directly for this idiom.",
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
    why: "Read only the formal-function chapters (beginning, middle, ending, before-the-beginning, after-the-end).",
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
    why: "Grouping and metrical chapters only; reductions give little payoff for riff-based writing.",
    modules: [2],
  },
  {
    id: "lerdahl-pitch",
    order: 15,
    title: "Tonal Pitch Space (1988 article)",
    author: "Fred Lerdahl",
    kind: "article",
    verdict: "drop",
    copy: "Article",
    why: "Lowest yield for this goal: pitch-space syntax is not what drives Tool-type form.",
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
  {
    id: "rouget",
    order: 17,
    title: "Music and Trance",
    author: "Gilbert Rouget",
    kind: "book",
    verdict: "core",
    copy: "Full book",
    why: "The trance vs. ecstasy typology and the critique of 'drumming causes trance'. The theory that keeps everything else about trance honest.",
    modules: [5, 7],
  },
  {
    id: "reich",
    order: 18,
    title: "Writings on Music 1965–2000",
    author: "Steve Reich",
    kind: "excerpt",
    verdict: "core",
    copy: "Excerpt (36 pp.)",
    why: "'Music as a Gradual Process': make the process audible. The most usable single rule for long builds.",
    modules: [3, 5],
  },
  {
    id: "kramer",
    order: 19,
    title: "The Time of Music",
    author: "Jonathan D. Kramer",
    kind: "book",
    verdict: "core",
    copy: "Full book",
    why: "Moment form, multiply-directed and vertical time, proportion. Read alongside Cook: listeners hear proportions far less than composers think.",
    modules: [4],
  },
  {
    id: "krebs",
    order: 20,
    title: "Fantasy Pieces: Metrical Dissonance in the Music of Robert Schumann",
    author: "Harald Krebs",
    kind: "book",
    verdict: "selective",
    copy: "Full book",
    why: "The grouping vs. displacement dissonance vocabulary Biamonte uses for rock — how to contradict the meter without undermining it.",
    modules: [2],
  },
  {
    id: "hasty",
    order: 21,
    title: "Meter as Rhythm",
    author: "Christopher F. Hasty",
    kind: "book",
    verdict: "selective",
    copy: "Full book",
    why: "Meter as an unfolding process rather than a grid. Philosophy, not data — read after London.",
    modules: [2],
  },
  {
    id: "yust",
    order: 22,
    title: "Organized Time: Rhythm, Tonality, and Form",
    author: "Jason Yust",
    kind: "book",
    verdict: "reference",
    copy: "Full book",
    why: "Large-scale temporal structure in tonal music. Mine for composing ideas; don't expect listeners to hear most of it.",
    modules: [4],
  },
  {
    id: "magadini",
    order: 23,
    title: "Polyrhythms: The Musician's Guide",
    author: "Peter Magadini",
    kind: "book",
    verdict: "selective",
    copy: "Full book",
    why: "Execution of polyrhythms for the drummer (and anyone playing against him).",
    modules: [2],
  },
  {
    id: "greb",
    order: 24,
    title: "The Language of Drumming",
    author: "Benny Greb",
    kind: "excerpt",
    verdict: "selective",
    copy: "Excerpt (51 pp.)",
    why: "A rhythmic-cell 'alphabet' — a shared vocabulary for remote form design between you and the drummer.",
    modules: [2],
  },
  {
    id: "erickson",
    order: 25,
    title: "Collected Papers, Vol. 1: The Nature of Hypnosis and Suggestion",
    author: "Milton H. Erickson",
    kind: "book",
    verdict: "later",
    copy: "Full book",
    why: "Craft reading only: pacing and leading, confusion, utilization as structural analogies. No evidence links them to composition.",
    modules: [5],
  },
  {
    id: "elman",
    order: 26,
    title: "Hypnotherapy",
    author: "Dave Elman",
    kind: "book",
    verdict: "later",
    copy: "Full book (scanned)",
    why: "Optional craft reading; fractionation (in, out, back deeper) is the one transferable idea.",
    modules: [5],
  },
  {
    id: "wier",
    order: 27,
    title: "Trance: From Magic to Technology",
    author: "Dennis R. Wier",
    kind: "book",
    verdict: "drop",
    copy: "Full book",
    why: "Self-published, cites no studies. Skim for loop/attention vocabulary only; never cite.",
    modules: [],
  },
  {
    id: "laitz",
    order: 28,
    title: "The Complete Musician (3rd ed.)",
    author: "Steven G. Laitz",
    kind: "book",
    verdict: "reference",
    copy: "Full textbook",
    why: "Tonal theory you already know. Teaching reference; little yield for riff-based form.",
    modules: [],
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
  sources: { book: string; where: string; read?: "read" | "partial" | "unread" }[];
  /** true until every core source behind the page has been read in full */
  draft?: boolean;
};

export const concepts: Concept[] = [
  {
    slug: "motive",
    module: 1,
    draft: true,
    order: 1,
    title: "What makes a motive",
    summary: "The smallest memorable unit — and why internal contrast is what makes it memorable.",
    minutes: 25,
    sources: [
      { book: "belkin", where: "Ch. 1, opening sections" },
      { book: "schoenberg", where: "Ch. III, The Motive" },
      { book: "snyder", where: "Ch. 1, memory levels", read: "read" },
    ],
  },
  {
    slug: "similarity-scale",
    module: 1,
    draft: true,
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
    draft: true,
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
    draft: true,
    order: 4,
    title: "Phrase, grouping and memory",
    summary: "Why phrases are the size they are: the 3–5 second window, chunking, and the forces that draw boundaries.",
    minutes: 40,
    sources: [
      { book: "snyder", where: "Ch. 3 Grouping (read to “Similarity”); Ch. 4 Short-term memory (not yet read)", read: "partial" },
      { book: "belkin", where: "Ch. 2, Structure of the phrase" },
      { book: "schoenberg", where: "Ch. II, The Phrase" },
    ],
  },
  {
    slug: "sentence-and-liquidation",
    module: 1,
    draft: true,
    order: 5,
    title: "The sentence and liquidation",
    summary: "Present, repeat, compress, dissolve, arrive — the most useful small-scale form for riff-based music.",
    minutes: 40,
    sources: [
      { book: "schoenberg", where: "Ch. V and VIII" },
      { book: "belkin", where: "Ch. 1, Neutral lines" },
      { book: "caplin", where: "Sentence; presentation / continuation (terms only — not yet read)", read: "unread" },
    ],
  },
  {
    slug: "words-as-motive",
    module: 1,
    draft: true,
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
    number: 0,
    title: "Process & the riff board",
    weeks: "EP window · ongoing",
    focus: "Jam, record, name and count riffs, assemble, vocals last; handing a form plan to the band",
    tool: "Riff board",
    available: false,
  },
  {
    number: 1,
    title: "Material & identity",
    weeks: "EP window",
    focus: "Motive, variation, phrase, memory, the sentence, the vocal line",
    tool: "Motif bank & family tree",
    available: true,
  },
  {
    number: 2,
    title: "Cycles, meter & time feel",
    weeks: "EP window (core) → main project",
    focus: "Frame vs. cycle, metric dissonance as section marker, time feel and re-orchestration, tihai cadences",
    tool: "Meter lab",
    available: false,
  },
  {
    number: 3,
    title: "Energy, texture & climax",
    weeks: "EP window (core) → main project",
    focus: "Textural layers, sound-box, build devices, climax strategies, terminal and cumulative forms",
    tool: "Energy-curve editor",
    available: false,
  },
  {
    number: 4,
    title: "Large-scale architecture & time",
    weeks: "Main project",
    focus: "Return × climax design space, through-composed types, moment form, proportion, memory limits",
    tool: "Form planner",
    available: false,
  },
  {
    number: 5,
    title: "The listener",
    weeks: "EP window (core) → main project",
    focus: "Attention and repetition, tension curves, groove and entrainment, chills and anticipation, trance and absorption, persona and catharsis",
    tool: "Listening-test kit",
    available: false,
  },
  {
    number: 6,
    title: "Voice, words & persona",
    weeks: "EP window (core) → main project",
    focus: "Vocal-timbre palette, persona, prosody and lyric form, the vocal entry as structure",
    tool: "Form planner (vocal lane)",
    available: false,
  },
  {
    number: 7,
    title: "The record as form",
    weeks: "Main project",
    focus: "EP/album as one macro-form, motifs across tracks, sequencing",
    tool: "EP / album planner",
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
