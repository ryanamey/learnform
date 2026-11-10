"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CornerDownRight, GitBranchPlus, Pencil, Plus, Trash2, X } from "lucide-react";

import { deleteMotif, saveMotif, type MotifFormState } from "@/app/actions";
import { MotifPlayer } from "@/components/audio/motif-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseNotation } from "@/lib/music/notation";
import type { VoiceName } from "@/lib/music/engine";
import { cn } from "@/lib/utils";

export type MotifRow = {
  id: string;
  name: string;
  notation: string;
  bpm: number;
  kind: string;
  description: string;
  parentId: string | null;
  similarity: number | null;
  transformation: string;
  epTrack: string;
  createdAt: string;
  updatedAt: string;
};

const VOICE_FOR_KIND: Record<string, VoiceName> = {
  riff: "guitar",
  vocal: "voice",
  rhythm: "drive",
  chord: "guitar",
};

type Draft = Partial<MotifRow> & { id?: string };

const STARTER = "E3/16 E3/16 G3/8 A3/8! r/16 E3/16 Bb3/8. A3/16 G3/4";

export function MotifBank({ motifs }: { motifs: MotifRow[] }) {
  const [draft, setDraft] = useState<Draft | null>(motifs.length === 0 ? { notation: STARTER, bpm: 96, kind: "riff" } : null);
  const [filter, setFilter] = useState("");

  const byParent = useMemo(() => {
    const map = new Map<string | null, MotifRow[]>();
    const ids = new Set(motifs.map((m) => m.id));
    for (const m of motifs) {
      const key = m.parentId && ids.has(m.parentId) ? m.parentId : null;
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return map;
  }, [motifs]);

  const tracks = useMemo(() => [...new Set(motifs.map((m) => m.epTrack).filter(Boolean))], [motifs]);
  const visible = (m: MotifRow) => !filter || m.epTrack === filter;

  const renderNode = (m: MotifRow, depth: number): React.ReactNode => {
    const children = byParent.get(m.id) ?? [];
    return (
      <li key={m.id} className={cn(depth > 0 && "ml-4 border-l pl-4 md:ml-6 md:pl-5")}>
        {visible(m) && (
          <div className="py-2">
            <div className="flex flex-wrap items-center gap-2">
              {depth > 0 && <CornerDownRight className="size-4 text-muted-foreground" />}
              <span className="font-medium">{m.name}</span>
              <Badge variant="outline">{m.kind}</Badge>
              {m.similarity && <Badge variant="signal">{m.similarity}/5 from parent</Badge>}
              {m.epTrack && <Badge variant="secondary">{m.epTrack}</Badge>}
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({ parentId: m.id, notation: m.notation, bpm: m.bpm, kind: m.kind, epTrack: m.epTrack, name: `${m.name} ′` })
                  }
                >
                  <GitBranchPlus /> Variant
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Edit ${m.name}`} onClick={() => setDraft(m)}>
                  <Pencil />
                </Button>
                <DeleteMotif id={m.id} name={m.name} hasChildren={children.length > 0} />
              </div>
            </div>
            {m.transformation && <p className="mt-1 text-sm text-muted-foreground">↳ {m.transformation}</p>}
            <MotifPlayer notation={m.notation} bpm={m.bpm} voice={VOICE_FOR_KIND[m.kind] ?? "guitar"} compact showLyrics={m.kind === "vocal"} caption={m.description || undefined} />
          </div>
        )}
        {children.length > 0 && <ul>{children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  const roots = byParent.get(null) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="min-w-0 lg:order-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="signal" onClick={() => setDraft({ notation: "", bpm: 100, kind: "riff" })}>
            <Plus /> New motif
          </Button>
          {tracks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="ml-2 text-muted-foreground">Song:</span>
              <Button size="sm" variant={filter === "" ? "secondary" : "ghost"} onClick={() => setFilter("")}>
                All
              </Button>
              {tracks.map((t) => (
                <Button key={t} size="sm" variant={filter === t ? "secondary" : "ghost"} onClick={() => setFilter(t)}>
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
        {roots.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Your bank is empty. Start with Motif M from Module 1 (already in the form), or type your own riff.
          </div>
        ) : (
          <ul className="divide-y">{roots.map((m) => renderNode(m, 0))}</ul>
        )}
      </section>

      <aside className="lg:order-2">
        <div className="lg:sticky lg:top-6">
          {draft ? (
            <MotifForm key={draft.id ?? `new-${draft.parentId ?? ""}-${draft.notation ?? ""}`} draft={draft} motifs={motifs} onDone={() => setDraft(null)} />
          ) : (
            <NotationGuide />
          )}
        </div>
      </aside>
    </div>
  );
}

function DeleteMotif({ id, name, hasChildren }: { id: string; name: string; hasChildren: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={`Delete ${name}`}
      disabled={pending}
      onClick={() => {
        const msg = hasChildren
          ? `Delete "${name}"? Its variants will stay, but lose their parent.`
          : `Delete "${name}"?`;
        if (window.confirm(msg)) start(() => void deleteMotif(id));
      }}
    >
      <Trash2 />
    </Button>
  );
}

function MotifForm({ draft, motifs, onDone }: { draft: Draft; motifs: MotifRow[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<MotifFormState, FormData>(saveMotif, undefined);
  const [notation, setNotation] = useState(draft.notation ?? "");
  const [bpm, setBpm] = useState(draft.bpm ?? 100);
  const [kind, setKind] = useState(draft.kind ?? "riff");
  const [parentId, setParentId] = useState(draft.parentId ?? "");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const parseError = useMemo(() => {
    if (!notation.trim()) return null;
    try {
      parseNotation(notation);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [notation]);

  const parent = motifs.find((m) => m.id === parentId);
  const editing = Boolean(draft.id);

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">{editing ? "Edit motif" : parentId ? "New variant" : "New motif"}</h2>
        <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={onDone}>
          <X />
        </Button>
      </div>
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={draft.name ?? ""} required placeholder="e.g. Verse riff A" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notation">Notation</Label>
        <Textarea
          id="notation"
          name="notation"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          required
          className="min-h-20 font-mono text-xs"
          spellCheck={false}
        />
        {parseError ? (
          <p className="text-xs text-destructive">{parseError}</p>
        ) : notation.trim() ? (
          <MotifPlayer notation={notation} bpm={bpm} voice={VOICE_FOR_KIND[kind] ?? "guitar"} compact showLyrics={kind === "vocal"} className="my-2" />
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bpm">BPM</Label>
          <Input id="bpm" name="bpm" type="number" min={30} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value) || 100)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            <option value="riff">Riff</option>
            <option value="vocal">Vocal line</option>
            <option value="rhythm">Rhythm cell</option>
            <option value="chord">Chords</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentId">Derived from</Label>
        <select
          id="parentId"
          name="parentId"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="">— nothing (a new source)</option>
          {motifs
            .filter((m) => m.id !== draft.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      </div>
      {parentId && (
        <>
          {parent && (
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="px-1 text-xs text-muted-foreground">Parent — compare by ear</div>
              <MotifPlayer notation={parent.notation} bpm={parent.bpm} voice={VOICE_FOR_KIND[parent.kind] ?? "guitar"} compact className="my-1 border-0 bg-transparent p-1" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Distance from parent (1 = same idea, 5 = new to the ear)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex-1">
                  <input type="radio" name="similarity" value={n} defaultChecked={draft.similarity === n} className="peer sr-only" />
                  <span className="block cursor-pointer rounded-md border py-1.5 text-center text-sm peer-checked:border-signal peer-checked:bg-signal/15 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transformation">How it was transformed</Label>
            <Input id="transformation" name="transformation" defaultValue={draft.transformation ?? ""} placeholder="e.g. rhythm kept, inverted, up a 4th" />
          </div>
        </>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="epTrack">Song (optional)</Label>
        <Input id="epTrack" name="epTrack" defaultValue={draft.epTrack ?? ""} placeholder="optional" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Notes</Label>
        <Textarea id="description" name="description" defaultValue={draft.description ?? ""} className="min-h-14" placeholder="Character, internal contrasts, where it could go…" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="signal" disabled={pending || Boolean(parseError)}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add to bank"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

function NotationGuide() {
  const rows: [string, string][] = [
    ["E3/8", "E, octave 3, eighth note"],
    ["F#4/16  Bb3/4", "sharps #, flats b"],
    ["A3/4.", "dotted quarter"],
    ["G3/8t", "eighth-note triplet"],
    ["E2/8!", "accented"],
    ["r/8", "eighth rest"],
    ["x/16", "muted / percussive hit"],
    ["[E2,B2,E3]/4", "chord or power chord"],
    ["|", "bar line (for reading)"],
    ['E4/8"love"', "lyric syllable (vocal lines)"],
  ];
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-1 font-serif text-lg">Notation guide</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Type riffs as text so the app can play them back. Guitar low E string = E2; open high E = E4.
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([code, what]) => (
            <tr key={code} className="border-b last:border-0">
              <td className="py-1.5 pr-3 font-mono text-xs">{code}</td>
              <td className="py-1.5 text-muted-foreground">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
