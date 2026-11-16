"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { FileUp, Info, X } from "lucide-react";

import { importRiff } from "@/app/actions";
import { importPart, listParts, readXmlText, type XmlPart } from "@/lib/musicxml";
import { MotifPlayer } from "@/components/audio/motif-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const field =
  "h-9 min-w-0 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function GuitarProImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [doc, setDoc] = useState<Document | null>(null);
  const [parts, setParts] = useState<XmlPart[]>([]);
  const [partId, setPartId] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(4);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const part = parts.find((p) => p.id === partId) ?? null;

  const result = useMemo(() => {
    if (!doc || !part) return null;
    try {
      return { ok: true as const, ...importPart(doc, part.id, from, to) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [doc, part, from, to]);

  const reset = () => {
    setDoc(null);
    setParts([]);
    setPartId("");
    setFileName("");
    setError("");
    if (input.current) input.current.value = "";
  };

  const onFile = async (f: File) => {
    setError("");
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (/\.gpx?$|\.gp[345]$/i.test(f.name)) {
        throw new Error("That's a Guitar Pro file. In Guitar Pro, choose File → Export → MusicXML, then import that file.");
      }
      const text = readXmlText(f.name, bytes);
      const d = new DOMParser().parseFromString(text, "application/xml");
      if (d.getElementsByTagName("parsererror").length) throw new Error("The file isn't valid XML.");
      const ps = listParts(d).filter((p) => p.measures > 0);
      if (!ps.length) throw new Error("No parts with bars in this file.");
      const guitar = ps.find((p) => /guit|gtr/i.test(p.name)) ?? ps[0];
      setDoc(d);
      setParts(ps);
      setPartId(guitar.id);
      setFrom(1);
      setTo(Math.min(guitar.measures, 4));
      const base = f.name.replace(/\.(xml|musicxml|mxl)$/i, "");
      setFileName(f.name);
      setName(base);
    } catch (e) {
      reset();
      setError((e as Error).message);
    }
  };

  const save = () => {
    if (!result?.ok) return;
    setError("");
    startTransition(async () => {
      const res = await importRiff({
        name: name.trim() || "Imported riff",
        notation: result.notation,
        bpm: Math.min(300, Math.max(30, result.tempo ?? 100)),
        meter: result.meterChanges.length === 1 ? result.meter : "",
        description: `Imported from ${fileName}, ${part?.name ?? "part"}, bars ${from}–${to}.`,
      });
      if (res.ok) router.push(`/riffs/${res.id}`);
      else setError(res.error);
    });
  };

  if (!open)
    return (
      <Button variant="signal" onClick={() => setOpen(true)}>
        <FileUp /> Import from Guitar Pro
      </Button>
    );

  return (
    <section className="mb-6 min-w-0 rounded-xl border bg-card p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Import from Guitar Pro</h2>
          <p className="text-sm text-muted-foreground">
            In Guitar Pro choose <strong>File → Export → MusicXML</strong>, then pick that file here. Choose the track
            and the bars that make up the riff.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close import"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          <X />
        </Button>
      </div>

      <input
        ref={input}
        type="file"
        accept=".xml,.musicxml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,text/xml"
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
        aria-label="MusicXML file"
      />

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {doc && part ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Track</span>
              <select
                className={field}
                value={partId}
                onChange={(e) => {
                  const p = parts.find((x) => x.id === e.target.value);
                  setPartId(e.target.value);
                  if (p) {
                    setFrom(1);
                    setTo(Math.min(p.measures, 4));
                  }
                }}
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.measures} bars)
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">From bar</span>
              <input
                type="number"
                className={field}
                min={1}
                max={part.measures}
                value={from}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isInteger(v) && v >= 1 && v <= part.measures) {
                    setFrom(v);
                    if (to < v) setTo(v);
                  }
                }}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">To bar</span>
              <input
                type="number"
                className={field}
                min={from}
                max={part.measures}
                value={to}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isInteger(v) && v >= from && v <= part.measures) setTo(v);
                }}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </label>

          {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
          {result?.ok ? (
            <>
              <p className="text-sm text-muted-foreground">
                {result.notes} notes in {to - from + 1} bar{to > from ? "s" : ""}
                {result.meter ? ` · ${result.meterChanges.join(" → ")}` : ""}
                {result.tempo ? ` · ${result.tempo} bpm` : ""}
              </p>
              {result.notes > 0 ? <MotifPlayer notation={result.notation} bpm={result.tempo ?? 100} /> : null}
              <code className="block max-h-28 overflow-auto rounded-md border bg-background p-2 text-xs break-all">
                {result.notation || "(no notes)"}
              </code>
              {result.dropped.voices || result.dropped.grace || result.dropped.odd || result.meterChanges.length > 1 ? (
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {[
                      result.dropped.voices ? "only the first voice was kept" : "",
                      result.dropped.grace ? `${result.dropped.grace} grace note${result.dropped.grace > 1 ? "s" : ""} left out` : "",
                      result.dropped.odd ? `${result.dropped.odd} note${result.dropped.odd > 1 ? "s" : ""} with a length the notation can’t write left out` : "",
                      result.meterChanges.length > 1 ? "the meter changes in these bars, so set the riff’s meter by hand" : "",
                    ]
                      .filter(Boolean)
                      .join("; ")}
                    . Bends, slides and other techniques aren’t imported.
                  </span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="signal" onClick={save} disabled={pending || result.notes === 0} className={cn(pending && "opacity-70")}>
                  {pending ? "Importing…" : "Add to the riff board"}
                </Button>
                <Button variant="outline" onClick={reset}>
                  Choose another file
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
