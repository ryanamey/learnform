"use client";

import { cn } from "@/lib/utils";

export type GridRow = {
  label: string;
  /** cells: 0 = empty, 1 = hit, 2 = accent/start, 3 = cut-off / special */
  cells: number[];
  tone?: "a" | "b" | "c" | "muted";
  /** optional per-cell colour band (e.g. alternate riff cycles) */
  band?: number[];
};

const TONE: Record<string, string> = {
  a: "bg-note-a",
  b: "bg-note-b",
  c: "bg-note-c",
  muted: "bg-muted-foreground",
};

/**
 * A step-sequencer style grid (one cell per sixteenth).
 * `groupEvery` draws a stronger divider every n cells (e.g. 4 = beats, 16 = bars).
 */
export function StepGrid({
  rows,
  active,
  activeRow,
  groupEvery = 4,
  barEvery = 16,
  marks,
  className,
}: {
  rows: GridRow[];
  active?: number | null;
  /** when set, only this row shows the playhead (for bar-per-row layouts) */
  activeRow?: number | null;
  groupEvery?: number;
  barEvery?: number;
  /** cell indices to mark under the grid (e.g. alignment points) */
  marks?: number[];
  className?: string;
}) {
  const len = Math.max(...rows.map((r) => r.cells.length));
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-[560px] space-y-1">
        {rows.map((r, ri) => (
          <div key={r.label} className="flex items-center gap-2">
            <div className="w-24 shrink-0 truncate text-right text-[11px] text-muted-foreground">{r.label}</div>
            <div className="flex flex-1 gap-px">
              {Array.from({ length: len }, (_, i) => {
                const v = r.cells[i] ?? 0;
                const band = r.band?.[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative h-5 flex-1 rounded-[2px]",
                      i % barEvery === 0 && i > 0 ? "ml-1" : i % groupEvery === 0 && i > 0 ? "ml-px" : "",
                      v === 0 && (band === undefined ? "bg-muted/60" : band % 2 ? "bg-muted" : "bg-muted/40"),
                      v === 1 && cn(TONE[r.tone ?? "a"], "opacity-45"),
                      v === 2 && TONE[r.tone ?? "a"],
                      v === 3 && "bg-destructive",
                      active === i && (activeRow === undefined || activeRow === ri) && "ring-2 ring-foreground"
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {marks && (
          <div className="flex items-center gap-2">
            <div className="w-24 shrink-0" />
            <div className="flex flex-1 gap-px">
              {Array.from({ length: len }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 flex-1",
                    i % barEvery === 0 && i > 0 ? "ml-1" : i % groupEvery === 0 && i > 0 ? "ml-px" : ""
                  )}
                >
                  {marks.includes(i) && <div className="mx-auto h-2 w-0.5 bg-signal" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
