"use client";

import {
  CYMBAL_RUNGS,
  GUITAR_RUNGS,
  LEVERS,
  LEVER_WEIGHT,
  TIMBRE_SCALES,
  formatTime,
  noteToMidi,
  roman,
  type Lever,
  type SeamReading,
  type Timed,
} from "@/lib/form-plan";
import { STRENGTH_STYLE } from "./seam-row";

export const LEVER_COLOR: Record<Lever, string> = {
  loudness: "var(--note-a)",
  register: "var(--note-b)",
  density: "var(--note-c)",
  tempo: "oklch(0.7 0.14 145)",
  harmony: "oklch(0.66 0.1 275)",
};

const W = 1000;
const LABEL = 92;
const PLOT = W - LABEL - 8;

type Row = { key: string; label: string; sub?: string; h: number };

export function Lanes({
  rows,
  seams,
  selected,
  onSelect,
}: {
  rows: Timed[];
  seams: SeamReading[];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const total = rows.at(-1)?.end ?? 0;
  if (rows.length === 0 || total <= 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Add sections with a length in bars to see the lanes.
      </div>
    );
  }
  const x = (t: number) => LABEL + (t / total) * PLOT;

  const lanes: Row[] = [
    { key: "groups", label: "Groups", h: 18 },
    { key: "sections", label: "Sections", h: 34 },
    { key: "tension", label: "Tension", sub: "weighted 3·3·2·2·1", h: 70 },
    { key: "levers", label: "Levers", h: 70 },
    { key: "hooks", label: "Hook reps", h: 22 },
    { key: "note", label: "Highest note", h: 26 },
    { key: "guitar", label: "Guitar", h: 22 },
    { key: "cymbal", label: "Cymbal", h: 22 },
    ...TIMBRE_SCALES.map((t) => ({ key: `tim-${t.key}`, label: `${t.low} → ${t.high}`, h: 14 })),
    { key: "meter", label: "Meter thickness", h: 22 },
    { key: "landA", label: "Landmarks A", h: 18 },
    { key: "landB", label: "Landmarks B", h: 18 },
    { key: "axis", label: "", h: 18 },
  ];
  const tops: Record<string, number> = {};
  let y = 4;
  for (const l of lanes) {
    tops[l.key] = y;
    y += l.h + (l.key.startsWith("tim-") && l.key !== "tim-anchored" ? 2 : 8);
  }
  const H = y;

  const step = (vals: number[], top: number, h: number, max: number) =>
    rows
      .map((s, i) => {
        const yy = top + h - (vals[i] / max) * h;
        return `${i === 0 ? "M" : "L"}${x(s.start)},${yy} L${x(s.end)},${yy}`;
      })
      .join(" ");

  // groups spans
  const groups: { g: number; start: number; end: number }[] = [];
  rows.forEach((s) => {
    const last = groups.at(-1);
    if (last && last.g === s.group) last.end = s.end;
    else groups.push({ g: s.group, start: s.start, end: s.end });
  });

  const notes = rows.map((s) => noteToMidi(s.ladder.highestNote));
  const known = notes.filter((n): n is number => n !== null);
  const nMin = known.length ? Math.min(...known) - 2 : 0;
  const nMax = known.length ? Math.max(...known) + 2 : 1;
  const maxHooks = Math.max(1, ...rows.map((s) => s.ladder.hookReps));

  const tick = (t: number) => {
    const span = total > 600 ? 120 : total > 240 ? 60 : 30;
    const out: number[] = [];
    for (let v = 0; v <= total; v += span) out.push(v);
    return out.map((v) => (
      <g key={v}>
        <line x1={x(v)} x2={x(v)} y1={t} y2={t + 4} stroke="var(--muted-foreground)" />
        <text x={x(v)} y={t + 14} fontSize="10" textAnchor="middle" fill="var(--muted-foreground)">
          {formatTime(v)}
        </text>
      </g>
    ));
  };

  const landmarks = (key: "landmarkA" | "landmarkB", top: number, color: string) => {
    const pts = rows.filter((s) => s[key]).map((s) => s.start);
    return (
      <g>
        <line x1={LABEL} x2={W - 8} y1={top + 9} y2={top + 9} stroke="var(--border)" />
        {pts.map((t, k) => (
          <g key={k}>
            <path d={`M${x(t)},${top + 2} L${x(t) + 6},${top + 9} L${x(t)},${top + 16} L${x(t) - 6},${top + 9} Z`} fill={color} />
            <text x={x(t) + 9} y={top + 13} fontSize="9" fill="var(--muted-foreground)">
              {Math.round((t / total) * 100)}%
            </text>
          </g>
        ))}
      </g>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <p className="border-b px-4 py-2 text-xs text-muted-foreground md:hidden">Swipe sideways to see the whole form. Tap a section to edit it.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block min-w-[760px]" role="img" aria-label="Form plan lanes">
        {/* selection highlight and section dividers */}
        {rows.map((s, i) => (
          <g key={s.id}>
            <rect
              x={x(s.start)}
              y={0}
              width={Math.max(1, x(s.end) - x(s.start))}
              height={H}
              fill={selected === i ? "var(--accent)" : "transparent"}
              onClick={() => onSelect(i)}
              className="cursor-pointer"
            />
            {i === 0 ? (
              <line x1={x(s.start)} x2={x(s.start)} y1={0} y2={H - 18} stroke="var(--border)" />
            ) : (
              <line
                x1={x(s.start)}
                x2={x(s.start)}
                y1={0}
                y2={H - 18}
                stroke={
                  seams[i - 1]?.strength === "obvious"
                    ? "var(--signal)"
                    : seams[i - 1]?.strength === "ambiguous"
                      ? "var(--note-c)"
                      : seams[i - 1]?.strength === "clear"
                        ? "var(--note-b)"
                        : "var(--border)"
                }
                strokeWidth={STRENGTH_STYLE[seams[i - 1]?.strength ?? "seamless"].width}
                strokeDasharray={STRENGTH_STYLE[seams[i - 1]?.strength ?? "seamless"].dash}
                opacity={0.7}
              >
                <title>{`Seam ${i} → ${i + 1}: ${seams[i - 1]?.strength ?? ""}`}</title>
              </line>
            )}
          </g>
        ))}

        {/* labels */}
        {lanes.map((l) => (
          <g key={l.key}>
            <text x={4} y={tops[l.key] + Math.min(l.h, 18) / 2 + 4} fontSize={l.key.startsWith("tim-") ? 8.5 : 10.5} fill="var(--muted-foreground)">
              {l.label}
            </text>
            {l.sub && (
              <text x={4} y={tops[l.key] + 26} fontSize="8.5" fill="var(--muted-foreground)" opacity={0.75}>
                {l.sub}
              </text>
            )}
          </g>
        ))}
        <text x={4} y={tops["tim-breathy"] - 2} fontSize="9" fill="var(--signal)">
          Voice
        </text>

        {/* groups */}
        {groups.map((g, k) => (
          <g key={k}>
            <rect x={x(g.start) + 1} y={tops.groups} width={Math.max(1, x(g.end) - x(g.start) - 2)} height={18} rx={4} fill="var(--muted)" />
            <text x={(x(g.start) + x(g.end)) / 2} y={tops.groups + 13} fontSize="11" textAnchor="middle" fill="var(--foreground)" fontFamily="var(--font-serif)">
              {roman(g.g)}
            </text>
          </g>
        ))}

        {/* sections */}
        {rows.map((s, i) => {
          const w = x(s.end) - x(s.start);
          return (
            <g key={s.id} onClick={() => onSelect(i)} className="cursor-pointer">
              <rect
                x={x(s.start) + 1}
                y={tops.sections}
                width={Math.max(1, w - 2)}
                height={34}
                rx={4}
                fill={s.peak ? "var(--signal)" : "var(--secondary)"}
                stroke={selected === i ? "var(--signal)" : "none"}
                strokeWidth={2}
              />
              {w > 22 && (
                <text x={x(s.start) + 5} y={tops.sections + 14} fontSize="11" fontWeight={600} fill={s.peak ? "var(--signal-foreground)" : "var(--foreground)"}>
                  {s.letter || "·"}
                </text>
              )}
              {w > 50 && (
                <text x={x(s.start) + 5} y={tops.sections + 27} fontSize="9" fill={s.peak ? "var(--signal-foreground)" : "var(--muted-foreground)"}>
                  {(s.name || s.job).slice(0, Math.floor(w / 6))}
                </text>
              )}
            </g>
          );
        })}

        {/* tension: filled steps */}
        <path
          d={`${step(rows.map((s) => s.tension), tops.tension, 70, 10)} L${x(total)},${tops.tension + 70} L${x(0)},${tops.tension + 70} Z`}
          fill="var(--signal)"
          opacity={0.18}
        />
        <path d={step(rows.map((s) => s.tension), tops.tension, 70, 10)} fill="none" stroke="var(--signal)" strokeWidth={2.5} />
        {rows.map((s) =>
          x(s.end) - x(s.start) > 26 ? (
            <text key={s.id} x={(x(s.start) + x(s.end)) / 2} y={tops.tension + 70 - (s.tension / 10) * 70 - 4} fontSize="9" textAnchor="middle" fill="var(--signal)">
              {s.tension}
            </text>
          ) : null
        )}

        {/* levers */}
        {LEVERS.map((l) => (
          <path
            key={l}
            d={step(rows.map((s) => s.levers[l]), tops.levers, 70, 10)}
            fill="none"
            stroke={LEVER_COLOR[l]}
            strokeWidth={LEVER_WEIGHT[l] >= 3 ? 2 : LEVER_WEIGHT[l] === 2 ? 1.5 : 1}
            strokeDasharray={l === "harmony" ? "4 3" : undefined}
            opacity={0.9}
          />
        ))}

        {/* hook reps */}
        {rows.map((s) => {
          const h = (s.ladder.hookReps / maxHooks) * 22;
          return s.ladder.hookReps > 0 ? (
            <g key={s.id}>
              <rect x={x(s.start) + 3} y={tops.hooks + 22 - h} width={Math.max(1, x(s.end) - x(s.start) - 6)} height={h} rx={2} fill="var(--foreground)" opacity={0.35} />
              <text x={x(s.start) + 6} y={tops.hooks + 19} fontSize="9" fill="var(--foreground)">
                ×{s.ladder.hookReps}
              </text>
            </g>
          ) : null;
        })}

        {/* highest note */}
        {rows.map((s, i) => {
          const n = notes[i];
          if (n === null) return null;
          const yy = tops.note + 26 - ((n - nMin) / Math.max(1, nMax - nMin)) * 26;
          return (
            <g key={s.id}>
              <line x1={x(s.start) + 3} x2={x(s.end) - 3} y1={yy} y2={yy} stroke="var(--foreground)" strokeWidth={2} />
              <text x={x(s.start) + 4} y={yy - 2} fontSize="8.5" fill="var(--muted-foreground)">
                {s.ladder.highestNote}
              </text>
            </g>
          );
        })}

        {/* guitar and cymbal rungs */}
        <path d={step(rows.map((s) => s.ladder.guitar), tops.guitar, 22, GUITAR_RUNGS.length - 1)} fill="none" stroke="var(--foreground)" strokeWidth={1.5} opacity={0.7} />
        <path d={step(rows.map((s) => s.ladder.cymbal), tops.cymbal, 22, CYMBAL_RUNGS.length - 1)} fill="none" stroke="var(--foreground)" strokeWidth={1.5} opacity={0.7} />

        {/* voice timbre: dots, -2 (left word) to +2 (right word) */}
        {TIMBRE_SCALES.map((t) =>
          rows.map((s) => {
            if (!s.timbre) return null;
            const v = s.timbre[t.key];
            const top = tops[`tim-${t.key}`];
            const w = x(s.end) - x(s.start);
            return (
              <rect
                key={`${t.key}-${s.id}`}
                x={x(s.start) + 2}
                y={top + 1}
                width={Math.max(1, w - 4)}
                height={12}
                rx={3}
                fill={v === 0 ? "var(--muted-foreground)" : v > 0 ? "var(--note-b)" : "var(--note-c)"}
                opacity={v === 0 ? 0.15 : 0.25 + Math.abs(v) * 0.3}
              />
            );
          })
        )}

        {/* meter thickness */}
        {rows.map((s) => {
          const h = (s.meterThickness / 4) * 22;
          return <rect key={s.id} x={x(s.start) + 3} y={tops.meter + 22 - h} width={Math.max(1, x(s.end) - x(s.start) - 6)} height={h} rx={2} fill="var(--note-b)" opacity={0.45} />;
        })}

        {landmarks("landmarkA", tops.landA, "var(--note-a)")}
        {landmarks("landmarkB", tops.landB, "var(--note-c)")}

        {/* axis */}
        <line x1={LABEL} x2={W - 8} y1={tops.axis} y2={tops.axis} stroke="var(--border)" />
        {tick(tops.axis)}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
        {LEVERS.map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: LEVER_COLOR[l] }} />
            {l} ×{LEVER_WEIGHT[l]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: "var(--note-c)" }} /> voice toward the left word
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: "var(--note-b)" }} /> toward the right word
        </span>
        <span className="flex items-center gap-1.5">
          seams: <span className="inline-block h-3 w-0.5" style={{ background: "var(--note-b)" }} /> clear
          <span className="inline-block h-3 w-1" style={{ background: "var(--signal)" }} /> obvious
          <span className="inline-block h-3 w-0.5 border-l-2 border-dashed" style={{ borderColor: "var(--note-c)" }} /> ambiguous
        </span>
      </div>
    </div>
  );
}
