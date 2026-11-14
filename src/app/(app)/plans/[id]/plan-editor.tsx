"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ClipboardCopy,
  Copy,
  Info,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import { deletePlan, duplicatePlan, savePlan } from "@/app/actions";
import {
  CYMBAL_RUNGS,
  FOCAL,
  GUITAR_RUNGS,
  JOBS,
  JOB_HELP,
  LEVERS,
  LEVER_HELP,
  LEVER_WEIGHT,
  TIMBRE_SCALES,
  blankSection,
  checkPlan,
  formatTime,
  planToMarkdown,
  quartersPerBar,
  roman,
  timeline,
  type Check as PlanCheck,
  type PlanData,
  type Section,
} from "@/lib/form-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lanes, LEVER_COLOR } from "./lanes";

const field = "h-9 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function Num({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = "w-20",
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (e.target.value === "" || !Number.isFinite(v)) return;
        onChange(Math.min(max, Math.max(min, v)));
      }}
      className={`${field} ${className}`}
      {...rest}
    />
  );
}

function Slider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  color,
  ends,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  color?: string;
  ends?: [string, string];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          {color && <span className="inline-block size-2 rounded-full" style={{ background: color }} />}
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--signal)]"
      />
      {ends ? (
        <span className="flex justify-between text-[11px] text-muted-foreground">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      ) : (
        hint && <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function CheckList({ checks, onJump }: { checks: PlanCheck[]; onJump: (i: number) => void }) {
  if (checks.length === 0) return null;
  const order = { warn: 0, info: 1, ok: 2 };
  return (
    <ul className="grid gap-2">
      {[...checks]
        .sort((a, b) => order[a.level] - order[b.level])
        .map((c, k) => {
          const Icon = c.level === "warn" ? AlertTriangle : c.level === "ok" ? Check : Info;
          return (
            <li key={k} className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${c.level === "warn" ? "text-destructive" : c.level === "ok" ? "text-signal" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <span>{c.text}</span>{" "}
                <span className="whitespace-nowrap text-xs">
                  {c.at !== undefined && (
                    <button type="button" onClick={() => onJump(c.at!)} className="text-signal underline underline-offset-2">
                      edit section
                    </button>
                  )}
                  {c.at !== undefined && c.page && " · "}
                  {c.page && (
                    <Link href={`/learn/${c.page}`} className="text-muted-foreground underline underline-offset-2">
                      why
                    </Link>
                  )}
                </span>
              </div>
            </li>
          );
        })}
    </ul>
  );
}

function SectionCard({
  s,
  i,
  count,
  open,
  setOpen,
  update,
  move,
  remove,
  duplicate,
}: {
  s: Section;
  i: number;
  count: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  update: (patch: Partial<Section>) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
  duplicate: () => void;
}) {
  const meterOk = quartersPerBar(s.meter) !== null;
  return (
    <li id={`section-${i}`} className={`scroll-mt-20 rounded-xl border bg-card ${open ? "ring-2 ring-signal/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
        <select
          aria-label="Section group"
          value={s.group}
          onChange={(e) => update({ group: Number(e.target.value) })}
          className={`${field} w-16 font-serif`}
        >
          {Array.from({ length: 12 }, (_, k) => k + 1).map((g) => (
            <option key={g} value={g}>
              {roman(g)}
            </option>
          ))}
        </select>
        <input
          aria-label="Chart letter"
          placeholder="–"
          value={s.letter}
          maxLength={12}
          onChange={(e) => update({ letter: e.target.value })}
          className={`${field} w-14 text-center font-semibold`}
        />
        <input
          aria-label="Section name"
          placeholder="Verse 1"
          value={s.name}
          maxLength={60}
          onChange={(e) => update({ name: e.target.value })}
          className={`${field} min-w-0 flex-1 basis-32`}
        />
        <div className="flex items-center gap-1">
          <Num aria-label="Bars" value={s.bars} onChange={(v) => update({ bars: v })} min={0} max={999} className="w-16" />
          <span className="text-xs text-muted-foreground">×</span>
          <input
            aria-label="Meter"
            value={s.meter}
            maxLength={40}
            onChange={(e) => update({ meter: e.target.value })}
            className={`${field} w-28 font-mono ${meterOk ? "" : "border-destructive"}`}
          />
        </div>
        <select aria-label="Job" value={s.job} onChange={(e) => update({ job: e.target.value as Section["job"] })} className={`${field} w-32`}>
          {JOBS.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant={s.peak ? "signal" : "ghost"}
            aria-label={s.peak ? "Peak (on)" : "Mark as peak"}
            title="The intended peak"
            onClick={() => update({ peak: !s.peak })}
          >
            <Star />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(-1)}>
            <ArrowUp />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Move down" disabled={i === count - 1} onClick={() => move(1)}>
            <ArrowDown />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Duplicate section" onClick={duplicate}>
            <Copy />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Delete section" onClick={remove}>
            <Trash2 />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Close" : "Lanes"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="grid gap-6 border-t p-4 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
            <label className="grid gap-1 text-sm md:col-span-1">
              <span className="font-medium">Riffs</span>
              <input value={s.riffs} maxLength={200} onChange={(e) => update({ riffs: e.target.value })} placeholder="names from the riff board" className={field} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-1">
              <span className="font-medium">Tempo override (bpm)</span>
              <input
                type="number"
                inputMode="numeric"
                min={20}
                max={400}
                value={s.bpm ?? ""}
                placeholder="plan tempo"
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  update({ bpm: v === null || !Number.isFinite(v) ? null : Math.min(400, Math.max(20, v)) });
                }}
                className={field}
              />
            </label>
            <div className="grid gap-1 text-sm">
              <span className="font-medium">Job</span>
              <span className="text-xs text-muted-foreground">{JOB_HELP[s.job]}</span>
            </div>
            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="font-medium">Notes for the band</span>
              <textarea
                value={s.notes}
                maxLength={1000}
                rows={2}
                onChange={(e) => update({ notes: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 font-serif text-lg">Tension levers</legend>
            {LEVERS.map((l) => (
              <Slider
                key={l}
                label={`${l[0].toUpperCase()}${l.slice(1)} ×${LEVER_WEIGHT[l]}`}
                hint={LEVER_HELP[l]}
                value={s.levers[l]}
                min={0}
                max={10}
                color={LEVER_COLOR[l]}
                onChange={(v) => update({ levers: { ...s.levers, [l]: v } })}
              />
            ))}
          </fieldset>

          <div className="grid content-start gap-6">
            <fieldset className="grid gap-3">
              <legend className="mb-1 font-serif text-lg">Climb to the peak</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Hook repetitions</span>
                  <Num value={s.ladder.hookReps} min={0} max={16} onChange={(v) => update({ ladder: { ...s.ladder, hookReps: v } })} className="w-full" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Highest note</span>
                  <input
                    value={s.ladder.highestNote}
                    maxLength={6}
                    placeholder="e.g. G4"
                    onChange={(e) => update({ ladder: { ...s.ladder, highestNote: e.target.value } })}
                    className={`${field} w-full font-mono`}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Guitar</span>
                  <select value={s.ladder.guitar} onChange={(e) => update({ ladder: { ...s.ladder, guitar: Number(e.target.value) } })} className={`${field} w-full`}>
                    {GUITAR_RUNGS.map((g, k) => (
                      <option key={g} value={k}>
                        {k} · {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Cymbal</span>
                  <select value={s.ladder.cymbal} onChange={(e) => update({ ladder: { ...s.ladder, cymbal: Number(e.target.value) } })} className={`${field} w-full`}>
                    {CYMBAL_RUNGS.map((g, k) => (
                      <option key={g} value={k}>
                        {k} · {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 flex w-full items-center justify-between gap-2 font-serif text-lg">
                Voice
                <label className="flex items-center gap-2 font-sans text-sm">
                  <input
                    type="checkbox"
                    checked={s.timbre !== null}
                    onChange={(e) =>
                      update({ timbre: e.target.checked ? { breathy: 0, rough: 0, open: 0, chest: 0, anchored: 0 } : null })
                    }
                    className="accent-[var(--signal)]"
                  />
                  singing here
                </label>
              </legend>
              {s.timbre ? (
                TIMBRE_SCALES.map((t) => (
                  <Slider
                    key={t.key}
                    label={`${t.low} ↔ ${t.high}`}
                    value={s.timbre![t.key]}
                    min={-2}
                    max={2}
                    ends={[t.low, t.high]}
                    onChange={(v) => update({ timbre: { ...s.timbre!, [t.key]: v } })}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No voice in this section.</p>
              )}
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 font-serif text-lg">Meter and landmarks</legend>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Meter thickness</span>
                <select value={s.meterThickness} onChange={(e) => update({ meterThickness: Number(e.target.value) })} className={field}>
                  <option value={1}>1 · bare pulse</option>
                  <option value={2}>2 · beat and subdivision</option>
                  <option value={3}>3 · + clear bar</option>
                  <option value={4}>4 · + hypermeter (bars group in 2s or 4s)</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={s.landmarkA} onChange={(e) => update({ landmarkA: e.target.checked })} className="accent-[var(--note-a)]" />
                  Landmark A starts here
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={s.landmarkB} onChange={(e) => update({ landmarkB: e.target.checked })} className="accent-[var(--note-c)]" />
                  Landmark B starts here
                </label>
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </li>
  );
}

export function PlanEditor({
  id,
  initialTitle,
  initialSong,
  initialData,
}: {
  id: string;
  initialTitle: string;
  initialSong: string;
  initialData: PlanData;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [song, setSong] = useState(initialSong);
  const [data, setData] = useState<PlanData>(initialData);
  const [open, setOpen] = useState<number | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const first = useRef(true);

  const rows = useMemo(() => timeline(data), [data]);
  const checks = useMemo(() => checkPlan(data), [data]);
  const total = rows.at(-1)?.end ?? 0;
  const groups = useMemo(() => [...new Set(data.sections.map((s) => s.group))].sort((a, b) => a - b), [data.sections]);

  // autosave, 800 ms after the last change
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      setStatus("saving");
      startTransition(async () => {
        const res = await savePlan(id, { title: title.trim() || "Untitled plan", song, data });
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
  }, [id, title, song, data]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    const busy = status === "saving";
    const h = (e: BeforeUnloadEvent) => {
      if (busy) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status]);

  const edit = (fn: (d: PlanData) => PlanData) => {
    setStatus("dirty");
    setData((d) => fn(d));
  };
  const updateSection = (i: number, patch: Partial<Section>) =>
    edit((d) => ({ ...d, sections: d.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const addSection = () => {
    edit((d) => ({ ...d, sections: [...d.sections, blankSection(d.sections.at(-1))] }));
    setOpen(data.sections.length);
  };
  const jump = (i: number) => {
    setOpen(i);
    requestAnimationFrame(() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const warnCount = checks.filter((c) => c.level === "warn").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/plans" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All plans
        </Link>
        <span
          className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
          aria-live="polite"
        >
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved changes" : `Not saved: ${error}`}
        </span>
      </div>

      <header className="mb-6 grid gap-3">
        <input
          aria-label="Plan title"
          value={title}
          maxLength={120}
          onChange={(e) => {
            setStatus("dirty");
            setTitle(e.target.value);
          }}
          className="w-full bg-transparent font-serif text-3xl tracking-tight outline-none md:text-4xl"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Input
            aria-label="Song"
            placeholder="Song or EP track"
            value={song}
            maxLength={120}
            onChange={(e) => {
              setStatus("dirty");
              setSong(e.target.value);
            }}
            className="h-9 w-56"
          />
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Tempo</span>
            <Num value={data.bpm} min={20} max={400} onChange={(v) => edit((d) => ({ ...d, bpm: v }))} className="w-20" aria-label="Tempo in bpm" />
            <span className="text-muted-foreground">bpm</span>
          </label>
          <span className="text-muted-foreground">
            {data.sections.length} sections · {formatTime(total)}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(planToMarkdown(title, data));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? <Check /> : <ClipboardCopy />} {copied ? "Copied" : "Copy for the band"}
            </Button>
            <form action={duplicatePlan.bind(null, id)}>
              <Button type="submit" variant="ghost" size="sm">
                <Copy /> Duplicate
              </Button>
            </form>
            <form
              action={deletePlan.bind(null, id)}
              onSubmit={(e) => {
                if (!window.confirm("Delete this plan? This can't be undone.")) e.preventDefault();
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                <Trash2 /> Delete
              </Button>
            </form>
          </div>
        </div>
      </header>

      <Lanes rows={rows} selected={open} onSelect={jump} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">Sections</h2>
            <span className="text-xs text-muted-foreground">group · chart letter · name · bars × meter · job</span>
          </div>
          <ol className="grid gap-3">
            {data.sections.map((s, i) => (
              <SectionCard
                key={s.id}
                s={s}
                i={i}
                count={data.sections.length}
                open={open === i}
                setOpen={(o) => setOpen(o ? i : null)}
                update={(p) => updateSection(i, p)}
                move={(dir) => {
                  edit((d) => {
                    const arr = [...d.sections];
                    const j = i + dir;
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                    return { ...d, sections: arr };
                  });
                  if (open === i) setOpen(i + dir);
                }}
                remove={() => {
                  edit((d) => ({ ...d, sections: d.sections.filter((_, k) => k !== i) }));
                  setOpen(null);
                }}
                duplicate={() => edit((d) => ({ ...d, sections: [...d.sections.slice(0, i + 1), { ...blankSection(s), ...s, id: blankSection().id, peak: false }, ...d.sections.slice(i + 1)] }))}
              />
            ))}
          </ol>
          <Button type="button" variant="outline" className="mt-3" onClick={addSection} disabled={data.sections.length >= 80}>
            <Plus /> Add section
          </Button>
        </section>

        <aside className="grid content-start gap-8">
          <section>
            <h2 className="mb-1 font-serif text-2xl">Checks</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {warnCount ? `${warnCount} to look at.` : "Nothing urgent."} These follow the reading; a warning is a question, not a rule.
            </p>
            {checks.length ? <CheckList checks={checks} onJump={jump} /> : <p className="text-sm text-muted-foreground">Add sections to see checks.</p>}
          </section>

          {groups.length > 0 && (
            <section>
              <h2 className="mb-1 font-serif text-2xl">Focal parameter</h2>
              <p className="mb-3 text-xs text-muted-foreground">What each section group is mainly about. A new focus per group keeps a long form moving.</p>
              <div className="grid gap-2">
                {groups.map((g) => (
                  <label key={g} className="flex items-center gap-3 text-sm">
                    <span className="w-10 font-serif text-lg">{roman(g)}</span>
                    <select
                      value={data.focal[String(g)] ?? ""}
                      onChange={(e) => edit((d) => ({ ...d, focal: { ...d.focal, [String(g)]: e.target.value as (typeof FOCAL)[number] } }))}
                      className={`${field} flex-1`}
                    >
                      {FOCAL.map((f) => (
                        <option key={f} value={f}>
                          {f || "not set"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="text-xs text-muted-foreground">
            <h2 className="mb-1 font-serif text-lg text-foreground">How the lanes are read</h2>
            <ul className="grid gap-1.5">
              <li>
                <b>Tension</b> combines the levers with Farbood&apos;s weights; see{" "}
                <Link href="/learn/building-tension" className="underline">Building tension</Link>.
              </li>
              <li>
                <b>Climb</b> is Osborn&apos;s ladder; see <Link href="/learn/climax-placement" className="underline">Where the climax goes</Link>.
              </li>
              <li>
                <b>Voice</b> uses Heidemann&apos;s scales; see <Link href="/learn/vocal-timbre" className="underline">Vocal timbre</Link>.
              </li>
              <li>
                <b>Chart letters</b>: a letter per theme, a prime (′) for the same theme rearranged; Roman numerals for section groups (Osborn).
              </li>
              <li>
                <b>Landmarks</b>: two sets that divide the piece differently create formal dissonance; see{" "}
                <Link href="/learn/dissonance-as-form" className="underline">Dissonance as form</Link>.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
