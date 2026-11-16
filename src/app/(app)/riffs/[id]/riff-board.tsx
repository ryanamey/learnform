"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Info, Pencil } from "lucide-react";

import { saveRiffBoard } from "@/app/actions";
import { parseNotation, midiToPitch } from "@/lib/music/notation";
import {
  CADENCE_TEXT,
  ENTRY_KINDS,
  ENTRY_LABEL,
  FN_LABEL,
  GAINS,
  MODES,
  SHAPE_NOTE,
  UNIT_NAME,
  cadence,
  compareShapes,
  counterMeter,
  dotsAndLines,
  findTonic,
  fitModes,
  fourSpeeds,
  gcd,
  groupingNotation,
  groupingText,
  harmony,
  isPalindrome,
  isRotation,
  lcm,
  modeById,
  modeClash,
  palette,
  parseGrouping,
  pcName,
  pulseOptions,
  readChords,
  readMeter,
  readRhythm,
  reorderings,
  riffShape,
  suggestGrouping,
  sum,
  timingWindows,
  type Board,
  type GainVerdict,
} from "@/lib/riff";
import { MotifPlayer } from "@/components/audio/motif-player";
import { cn } from "@/lib/utils";

const field =
  "h-9 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type Other = { id: string; name: string; notation: string; meter: string };

function Card({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl">{title}</h2>
        {source ? <span className="text-xs text-muted-foreground">{source}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Note({ kind = "info", children }: { kind?: "info" | "warn"; children: React.ReactNode }) {
  const Icon = kind === "warn" ? AlertTriangle : Info;
  return (
    <p
      className={cn(
        "mt-2 flex gap-2 text-sm",
        kind === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const VERDICT_STYLE: Record<GainVerdict, string> = {
  clear: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  depends: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rough: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

/** Lilja: clean, almost anything works; the higher the gain, the more only the vertical consonances stay clear. */
function verdictAt(gain: Board["gain"], v: GainVerdict): GainVerdict {
  if (gain === "clean") return "clear";
  if (gain === "crunch") return v === "rough" ? "depends" : "clear";
  if (gain === "high") return v === "depends" ? "rough" : v;
  return v;
}

function Glyph({ n }: { n: number }) {
  if (n === 2) return <span className="inline-block size-3.5 rounded-full bg-foreground" aria-label="2" />;
  if (n === 3) return <span className="inline-block h-2 w-8 rounded-sm bg-foreground" aria-label="3" />;
  return <span className="font-mono text-sm">{n}</span>;
}

export function RiffBoard({
  id,
  name,
  kind,
  notation,
  bpm,
  initialBoard,
  others,
}: {
  id: string;
  name: string;
  kind: string;
  notation: string;
  bpm: number;
  initialBoard: Board;
  others: Other[];
}) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      setStatus("saving");
      startTransition(async () => {
        const res = await saveRiffBoard(id, board);
        if (res.ok) {
          setStatus("saved");
          setError("");
        } else {
          setStatus("error");
          setError(res.error);
        }
      });
    }, 800);
    return () => clearTimeout(t);
  }, [id, board]);

  const set = (patch: Partial<Board>) => {
    setStatus("dirty");
    setBoard((b) => ({ ...b, ...patch }));
  };

  /* ------------ analysis ------------ */
  const parsed = useMemo(() => {
    try {
      return parseNotation(notation);
    } catch {
      return null;
    }
  }, [notation]);
  const rhythm = useMemo(() => (parsed ? readRhythm(parsed.events, parsed.totalBeats) : null), [parsed]);
  const suggested = useMemo(() => (rhythm ? suggestGrouping(rhythm) : []), [rhythm]);
  const typed = parseGrouping(board.grouping);
  const grouping = typed ?? suggested;
  const cell = sum(grouping);
  const meter = rhythm ? readMeter(board.meter, rhythm.perBeat) : null;
  const counter = counterMeter(grouping, meter);
  const ref = board.refUnits ?? meter?.units ?? rhythm?.total ?? cell;
  const columns = useMemo(() => (cell ? dotsAndLines(grouping, ref, 8) : []), [grouping, ref, cell]);
  const orders = useMemo(() => (grouping.length ? reorderings(grouping, 8) : []), [grouping]);
  const timing = rhythm ? timingWindows(rhythm.perBeat, bpm, grouping, rhythm.total) : [];
  const speeds = fourSpeeds(cell, bpm);
  const pulses = rhythm ? pulseOptions(rhythm.total) : [];

  const chords = useMemo(() => (parsed && rhythm ? readChords(parsed.events, rhythm.perBeat) : []), [parsed, rhythm]);
  const tonics = useMemo(() => findTonic(chords, meter), [chords, meter]);
  const tonic = board.tonic ?? tonics[0]?.pc ?? null;
  const rels = useMemo(() => {
    if (tonic === null || !parsed) return [];
    return [
      ...new Set(parsed.events.flatMap((e) => e.midi.filter((m) => m >= 0).map((m) => (((m - tonic) % 12) + 12) % 12))),
    ];
  }, [parsed, tonic]);
  const fit = fitModes(rels);
  const autoMode = fit.fits[0]?.id ?? fit.closest.mode.id;
  const mode = board.mode || autoMode;
  const rows = tonic === null ? [] : harmony(chords, tonic, mode);
  const merged: typeof rows = [];
  for (const r of rows) {
    const last = merged.at(-1);
    if (last && last.root === r.root && last.shape === r.shape && last.midi.join() === r.midi.join())
      merged[merged.length - 1] = { ...last, dur: last.dur + r.dur };
    else merged.push(r);
  }
  const cad = cadence(rows);
  const clash = board.vocalMode ? modeClash(mode, board.vocalMode) : null;
  const pal = rels.length ? palette(rels) : "";
  const outside = fit.fits.length ? [] : fit.closest.outside;

  const myShape = useMemo(() => riffShape(notation), [notation]);
  const matches = useMemo(() => {
    if (!myShape) return [];
    return others
      .map((o) => {
        const s = riffShape(o.notation);
        if (!s) return null;
        const c = compareShapes(myShape, s);
        return { ...o, ...c };
      })
      .filter((m): m is NonNullable<typeof m> => !!m && (m.rhythm >= 3 || m.pitch >= 3))
      .sort((a, b) => Math.max(b.rhythm, b.pitch) - Math.max(a.rhythm, a.pitch))
      .slice(0, 8);
  }, [myShape, others]);

  const otherUnits = (o: Other) => {
    if (!rhythm) return null;
    try {
      const p = parseNotation(o.notation);
      const u = p.totalBeats * rhythm.perBeat;
      return Math.abs(u - Math.round(u)) < 1e-6 ? Math.round(u) : null;
    } catch {
      return null;
    }
  };
  const loopB = board.otherLoop;
  const cycleA = rhythm?.total ?? cell;
  const realign = loopB ? lcm(cycleA, loopB) : 0;
  const unitMs = rhythm ? 60000 / bpm / rhythm.perBeat : 0;
  const unitName = rhythm ? (UNIT_NAME[rhythm.perBeat] ?? "unit") : "unit";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/riffs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All riffs
        </Link>
        <span
          className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
          aria-live="polite"
        >
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved changes" : `Not saved: ${error}`}
        </span>
      </div>

      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">Riff board · {kind}</p>
        <h1 className="font-serif text-3xl md:text-4xl">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {bpm} bpm ·{" "}
          <Link href="/motifs" className="inline-flex items-center gap-1 underline underline-offset-2">
            <Pencil className="size-3" /> edit the notes in the motif bank
          </Link>
        </p>
      </header>

      <div className="mb-6">
        <MotifPlayer notation={notation} bpm={bpm} loops={2} />
      </div>

      {!parsed || !rhythm ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          This riff’s notation can’t be read on a regular grid yet. Check it in the motif bank: every duration needs to
          be a quarter, eighth, sixteenth, thirty-second or a triplet of these.
        </div>
      ) : (
        <div className="grid min-w-0 gap-5">
          {/* ---------------- count ---------------- */}
          <Card title="Count and grouping" source="Prieto; London; Pieslak">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Meter (e.g. 7/8 or 2+2+3/8)</span>
                <input className={field} value={board.meter} onChange={(e) => set({ meter: e.target.value })} placeholder="4/4" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Grouping in {unitName}s (2s and 3s)</span>
                <input
                  className={cn(field, "font-mono")}
                  value={board.grouping}
                  onChange={(e) => set({ grouping: e.target.value })}
                  placeholder={groupingText(suggested)}
                />
              </label>
            </div>
            {board.meter && !meter ? <Note kind="warn">Can’t read that meter. Write it like 7/8, 4/4 or 3+3+2/8.</Note> : null}
            {board.grouping && !typed ? <Note kind="warn">Write the grouping as numbers, like 2-2-3.</Note> : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Grid</dt>
                <dd>{unitName}s</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Riff length</dt>
                <dd>
                  {rhythm.total} {unitName}s
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Attack points</dt>
                <dd className="font-mono">{rhythm.iois.join("-")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Grouping</dt>
                <dd className="font-mono">
                  {groupingText(grouping)} {typed ? "" : <span className="text-muted-foreground">(guessed)</span>}
                </dd>
              </div>
            </dl>
            {cell !== rhythm.total ? (
              <Note kind="warn">
                The grouping adds up to {cell}, but the riff is {rhythm.total} {unitName}s long.
              </Note>
            ) : null}
            {!typed ? (
              <Note>
                The guess starts a group at every accent (or every note, if fewer than two are accented) and splits
                long gaps into 2s and 3s. Type your own if the band hears it differently.
              </Note>
            ) : null}
            {counter ? (
              <Note kind={counter.groupsOffBeat ? "info" : "info"}>
                {counter.barsToRealign === 1 && counter.cellsToRealign === 1
                  ? "The riff fills exactly one bar. "
                  : `The riff comes back to beat 1 of the bar every ${counter.cellsToRealign} times round (${counter.barsToRealign} bars). `}
                {counter.groupsOffBeat
                  ? `${counter.groupsOffBeat} of ${counter.groupsTotal} groups start off the meter's beats: a grouping dissonance against the meter.`
                  : "Every group starts on a beat of the meter."}
              </Note>
            ) : null}

            <h3 className="mt-5 text-sm font-medium">Dots and lines</h3>
            <p className="text-sm text-muted-foreground">
              A dot is 2, a line is 3. Each column is one reference cycle of
              <input
                type="number"
                className={cn(field, "mx-2 inline-block h-7 w-16")}
                value={ref}
                min={2}
                max={256}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isInteger(v) && v >= 2 && v <= 256) set({ refUnits: v });
                }}
                aria-label="Reference cycle length"
              />
              {unitName}s{meter ? " (one bar by default)" : ""}. A red column means a group runs across into the next.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {columns.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex min-w-14 flex-col items-center gap-2 rounded-md border px-3 py-2",
                    c.crosses && "border-rose-500/60",
                  )}
                >
                  {c.glyphs.map((n, k) => (
                    <Glyph key={k} n={n} />
                  ))}
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-medium">Same numbers, other orders</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {orders.map((o, i) => {
                const nt = groupingNotation(o, rhythm.perBeat);
                const tags = [
                  i === 0 ? "this riff" : isRotation(grouping, o) ? "rotation" : "reordered",
                  isPalindrome(o) ? "palindrome" : "",
                ].filter(Boolean);
                return (
                  <li key={groupingText(o)} className="rounded-md border p-2">
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-mono">{groupingText(o)}</span>
                      <span className="text-xs text-muted-foreground">{tags.join(" · ")}</span>
                    </div>
                    {nt ? <MotifPlayer notation={nt} bpm={bpm} voice="click" loops={2} compact /> : null}
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* ---------------- tempo ---------------- */}
          <Card title={`At ${bpm} bpm: the timing windows`} source="London ch. 2, 7">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {timing.map((t) => (
                    <tr key={t.label} className="border-t first:border-t-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{t.label}</td>
                      <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{Math.round(t.ms)} ms</td>
                      <td className={cn("py-1.5", t.level === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                        {t.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ---------------- speeds ---------------- */}
          <Card title="Four speeds, and pulses under a fixed pattern" source="Prieto, Level 3">
            <p className="text-sm text-muted-foreground">
              The {cell}-unit string played as different note values against a steady quarter-note pulse. In a bar of{" "}
              {cell} quarters it fits once, twice, three or four times.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-normal">As</th>
                    <th className="py-1 pr-3 font-normal">One cycle</th>
                    <th className="py-1 font-normal">Times in a {cell}/4 bar</th>
                  </tr>
                </thead>
                <tbody>
                  {speeds.map((s) => (
                    <tr key={s.sub} className="border-t">
                      <td className="py-1.5 pr-3">{s.sub}</td>
                      <td className="py-1.5 pr-3 font-mono">{(s.cellMs / 1000).toFixed(2)} s</td>
                      <td className="py-1.5">{s.timesInBar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-4 text-sm font-medium">Keep the pattern, change the pulse</h3>
            {pulses.length ? (
              <p className="mt-1 text-sm text-muted-foreground">
                The riff’s {rhythm.total} {unitName}s divide evenly into:{" "}
                {pulses.map((p) => `${p.count} pulses of ${p.size}`).join(", ")}. The drummer can move between these under
                the same riff.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {rhythm.total} is prime, so no even pulse divides the riff: any steady pulse will cross it, and the two
                meet again only after {rhythm.total} pulses.
              </p>
            )}
          </Card>

          {/* ---------------- cycles ---------------- */}
          <Card title="Two loops: where they line up" source="Prieto, Multi-Meters">
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="grid gap-1">
                <span className="text-muted-foreground">Other loop length ({unitName}s)</span>
                <input
                  type="number"
                  className={cn(field, "w-28")}
                  min={2}
                  max={512}
                  value={loopB ?? ""}
                  placeholder="e.g. 16"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    set({ otherLoop: e.target.value === "" ? null : Number.isInteger(v) && v >= 2 && v <= 512 ? v : board.otherLoop });
                  }}
                />
              </label>
              {others.length ? (
                <label className="grid gap-1">
                  <span className="text-muted-foreground">or take it from another riff</span>
                  <select
                    className={field}
                    value=""
                    onChange={(e) => {
                      const o = others.find((x) => x.id === e.target.value);
                      const u = o ? otherUnits(o) : null;
                      if (u) set({ otherLoop: u });
                    }}
                  >
                    <option value="">Choose…</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id} disabled={otherUnits(o) === null}>
                        {o.name}
                        {otherUnits(o) ? ` (${otherUnits(o)})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {loopB ? (
              <div className="mt-3 text-sm">
                <p>
                  This riff ({cycleA}) against a loop of {loopB}: they line up every{" "}
                  <strong>
                    {realign} {unitName}s
                  </strong>{" "}
                  ({realign / cycleA} times round this riff, {realign / loopB} times round the other),{" "}
                  <strong>{((realign * unitMs) / 1000).toFixed(1)} s</strong> at {bpm} bpm.
                </p>
                {gcd(cycleA, loopB) === 1 ? (
                  <Note>The lengths share no factor, so they only meet after the full product.</Note>
                ) : null}
                <Note>
                  The meeting point is a candidate landmark: put a section boundary, a vocal entry or a chord change there
                  for a release, or end the section before it to keep the layers in tension.
                </Note>
              </div>
            ) : null}
          </Card>

          {/* ---------------- harmony ---------------- */}
          <Card title="Harmony: tonic, mode and functions" source="Lilja; Moore; Stephenson">
            {tonics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pitched notes: a rhythm-only cell.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Tonic</span>
                    <select
                      className={field}
                      value={board.tonic === null ? "" : String(board.tonic)}
                      onChange={(e) => set({ tonic: e.target.value === "" ? null : Number(e.target.value) })}
                    >
                      <option value="">Auto: {pcName(tonics[0].pc)}</option>
                      {Array.from({ length: 12 }, (_, pc) => (
                        <option key={pc} value={pc}>
                          {pcName(pc)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Riff mode</span>
                    <select className={field} value={board.mode} onChange={(e) => set({ mode: e.target.value })}>
                      <option value="">Auto: {modeById[autoMode]?.name}</option>
                      {MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {fit.fits.some((f) => f.id === m.id) ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Guitar gain</span>
                    <select className={field} value={board.gain} onChange={(e) => set({ gain: e.target.value as Board["gain"] })}>
                      {GAINS.map((g) => (
                        <option key={g} value={g}>
                          {g === "high" ? "high gain" : g}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  Tonic candidates (time on the bass, first or last note, accents and downbeats):{" "}
                  {tonics.slice(0, 4).map((t, i) => (
                    <span key={t.pc}>
                      {i ? ", " : ""}
                      <span className="text-foreground">{pcName(t.pc)}</span> {Math.round(t.persistence * 100)}% of the
                      time{t.first ? ", starts the riff" : ""}
                      {t.last ? ", ends it" : ""}
                    </span>
                  ))}
                  .
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modes that fit every note: {fit.fits.length ? fit.fits.map((m) => m.name).join(", ") : "none"}.
                  {outside.length
                    ? ` Closest: ${fit.closest.mode.name}, with ${outside.map((p) => degreeName(p)).join(", ")} outside it (borrowed or chromatic).`
                    : ""}{" "}
                  Palette: {pal}.
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3 font-normal">Notes</th>
                        <th className="py-1 pr-3 font-normal">Shape</th>
                        <th className="py-1 pr-3 font-normal">Degree</th>
                        <th className="py-1 pr-3 font-normal">Function</th>
                        <th className="py-1 font-normal">Under {board.gain === "high" ? "high gain" : board.gain}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merged.map((r, i) => {
                        const v = verdictAt(board.gain, SHAPE_NOTE[r.shape].verdict);
                        return (
                          <tr key={i} className="border-t align-top">
                            <td className="py-1.5 pr-3 font-mono whitespace-nowrap">
                              {r.midi.map((m) => midiToPitch(m)).join(" ")}
                            </td>
                            <td className="py-1.5 pr-3 whitespace-nowrap">{r.shape}</td>
                            <td className="py-1.5 pr-3 font-mono">{r.degree}</td>
                            <td className="py-1.5 pr-3 whitespace-nowrap" title={FN_LABEL[r.fn]}>
                              {r.fn === "pass" ? "passing" : r.fn}
                            </td>
                            <td className="py-1.5">
                              <span className={cn("rounded px-1.5 py-0.5 text-xs", VERDICT_STYLE[v])} title={SHAPE_NOTE[r.shape].note}>
                                {v}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  T, S, D: strong Tonic, Subdominant, Dominant; lower case: weak (Lilja: ♭VI is a strong Subdominant, ♭VII a
                  weak Dominant). The root is the lowest note. Hover a verdict for why.
                </p>
                {cad ? (
                  <Note>
                    {CADENCE_TEXT[cad.kind]}{" "}
                    {cad.closesHome ? "The riff ends on the tonic." : "The riff ends away from the tonic: an open loop that leans into its own repeat."}
                  </Note>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Vocal mode over this riff</span>
                    <select className={field} value={board.vocalMode} onChange={(e) => set({ vocalMode: e.target.value })}>
                      <option value="">Not set</option>
                      {MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {clash ? (
                  clash.length ? (
                    <Note>
                      Riff and voice disagree on {clash.join("; ")}. Planned, this is a cross-relation like “War Pigs”
                      (Aeolian riff, Mixolydian voice); unplanned, it’s worth checking by ear.
                    </Note>
                  ) : (
                    <Note>Riff and voice share the mode.</Note>
                  )
                ) : null}
              </>
            )}
          </Card>

          {/* ---------------- matches ---------------- */}
          <Card title="The same motive in other riffs" source="Pieslak (after Yeston); Smolko">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other riff in the bank shares three or more attack-point intervals or pitch intervals in a row with this
                one.
              </p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2">
                    <Link href={`/riffs/${m.id}`} className="font-medium underline-offset-2 hover:underline">
                      {m.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {m.rhythm >= 3 ? `${m.rhythm} rhythm intervals` : ""}
                      {m.rhythm >= 3 && m.pitch >= 3 ? " · " : ""}
                      {m.pitch >= 3 ? `${m.pitch} pitch intervals` : ""}
                      {m.pitch >= 3 && m.rhythm < 3 ? " (same line, new rhythm)" : ""}
                      {board.meter && m.meter && m.meter !== board.meter ? ` · in ${m.meter}: the motive across meters` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ---------------- entry, motto, notes ---------------- */}
          <Card title="Entry, motto and notes" source="Sriram; Moore">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Where the riff enters the cycle</span>
                <select
                  className={field}
                  value={board.entry.kind}
                  onChange={(e) => set({ entry: { ...board.entry, kind: e.target.value as Board["entry"]["kind"] } })}
                >
                  {ENTRY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {ENTRY_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              {board.entry.kind !== "sama" ? (
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    By how many {unitName}s {board.entry.kind === "anaagatha" ? "after" : "before"} beat 1
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={64}
                    className={cn(field, "w-24")}
                    value={board.entry.units}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isInteger(v) && v >= 0 && v <= 64) set({ entry: { ...board.entry, units: v } });
                    }}
                  />
                </label>
              ) : null}
            </div>
            {board.entry.kind === "anaagatha" ? (
              <Note>A late entry leaves a gap at the start of the cycle, which gives each return to the riff momentum.</Note>
            ) : null}

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={board.motto} onChange={(e) => set({ motto: e.target.checked })} className="size-4" />
              This riff is a motto (an identity signal that returns across songs or the record)
            </label>
            {board.motto ? (
              <input
                className={cn(field, "mt-2 w-full")}
                value={board.mottoNote}
                onChange={(e) => set({ mottoNote: e.target.value })}
                placeholder="Where it comes back, and what it signals"
              />
            ) : null}

            <label className="mt-4 grid gap-1 text-sm">
              <span className="text-muted-foreground">Used in (songs and sections)</span>
              <input className={field} value={board.usedIn} onChange={(e) => set({ usedIn: e.target.value })} placeholder="Low Tide: V1, V2 · Gate: climax" />
            </label>
            <label className="mt-3 grid gap-1 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={board.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </label>
          </Card>
        </div>
      )}
    </div>
  );
}

const DEG = ["1", "♭2", "2", "♭3", "3", "4", "♯4/♭5", "5", "♭6", "6", "♭7", "7"];
function degreeName(rel: number) {
  return DEG[((rel % 12) + 12) % 12];
}
