/**
 * MusicXML import (Guitar Pro: File → Export → MusicXML).
 * Reads one part over a range of bars and turns it into Learn Form notation.
 * Works on a parsed XML Document, so it runs in the browser (DOMParser).
 *
 * What it keeps: pitches at sounding pitch (the guitar's octave transposition applied),
 * chords, rests, rhythm, accents, dead/muted notes as x, bar lines, the first time signature and tempo.
 * What it drops: grace notes, every voice but the first, ornaments, bends and other techniques.
 * Ties are joined; a duration the notation can't write in one value keeps its attack and fills the rest with rests.
 */
import { unzipSync, strFromU8 } from "fflate";

import { midiToPitch } from "@/lib/music/notation";

export type XmlPart = { id: string; name: string; measures: number; meters: string[]; tempo: number | null };

export type ImportResult = {
  notation: string;
  meter: string;
  meterChanges: string[];
  tempo: number | null;
  bars: number;
  notes: number;
  dropped: { voices: boolean; grace: number; odd: number };
};

/* -------- reading the file -------- */

/** Text of a .xml / .musicxml file, or the score inside a compressed .mxl. */
export function readXmlText(name: string, bytes: Uint8Array): string {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  if (!isZip) return new TextDecoder().decode(bytes);
  const files = unzipSync(bytes);
  const container = files["META-INF/container.xml"];
  let path = "";
  if (container) {
    const m = strFromU8(container).match(/full-path="([^"]+)"/);
    if (m) path = m[1];
  }
  if (!path) path = Object.keys(files).find((k) => /\.(xml|musicxml)$/i.test(k) && !k.startsWith("META-INF")) ?? "";
  if (!path || !files[path]) throw new Error(`No score found inside ${name}`);
  return strFromU8(files[path]);
}

const kids = (el: Element, tag: string) => Array.from(el.children).filter((c) => c.tagName === tag);
const kid = (el: Element, tag: string) => kids(el, tag)[0] ?? null;
const txt = (el: Element | null, tag: string) => (el ? (kid(el, tag)?.textContent?.trim() ?? "") : "");

export function listParts(doc: Document): XmlPart[] {
  const root = doc.documentElement;
  if (!root || !/score-(partwise|timewise)/.test(root.tagName)) throw new Error("This isn't a MusicXML score.");
  if (root.tagName === "score-timewise") throw new Error("Timewise MusicXML isn't supported; export as partwise.");
  const names = new Map<string, string>();
  const list = kid(root, "part-list");
  if (list) for (const sp of kids(list, "score-part")) names.set(sp.getAttribute("id") ?? "", txt(sp, "part-name") || "Part");
  return kids(root, "part").map((p) => {
    const id = p.getAttribute("id") ?? "";
    const measures = kids(p, "measure");
    const meters: string[] = [];
    let tempo: number | null = null;
    for (const m of measures) {
      for (const at of kids(m, "attributes")) {
        const t = kid(at, "time");
        if (t) {
          const mtr = `${txt(t, "beats")}/${txt(t, "beat-type")}`;
          if (meters.at(-1) !== mtr) meters.push(mtr);
        }
      }
      if (tempo === null) tempo = readTempo(m);
    }
    return { id, name: names.get(id) ?? id, measures: measures.length, meters, tempo };
  });
}

function readTempo(m: Element): number | null {
  for (const s of Array.from(m.getElementsByTagName("sound"))) {
    const t = Number(s.getAttribute("tempo"));
    if (t > 0) return Math.round(t);
  }
  for (const pm of Array.from(m.getElementsByTagName("per-minute"))) {
    const t = Number(pm.textContent);
    if (t > 0) return Math.round(t);
  }
  return null;
}

/* -------- durations -------- */

/** Values the notation can write, longest first, in quarter-note beats. */
const VALUES: [number, string][] = [
  [4, "1"],
  [3, "2."],
  [2, "2"],
  [1.5, "4."],
  [1, "4"],
  [0.75, "8."],
  [2 / 3, "4t"],
  [0.5, "8"],
  [0.375, "16."],
  [1 / 3, "8t"],
  [0.25, "16"],
  [1 / 6, "16t"],
  [0.125, "32"],
];

/** Split a length into writable values: the first carries the note, the rest become rests. */
export function splitDuration(beats: number): string[] | null {
  const out: string[] = [];
  let left = beats;
  for (let guard = 0; left > 1e-6 && guard < 32; guard++) {
    const v = VALUES.find(([b]) => b <= left + 1e-6);
    if (!v) return null;
    out.push(v[1]);
    left -= v[0];
  }
  return left > 1e-6 ? null : out;
}

/* -------- converting a part -------- */

type Ev = { beats: number; midi: number[]; accent: boolean; rest: boolean; tieStop: boolean; tieStart: boolean };

export function importPart(doc: Document, partId: string, fromBar: number, toBar: number): ImportResult {
  const root = doc.documentElement;
  const part = kids(root, "part").find((p) => p.getAttribute("id") === partId);
  if (!part) throw new Error("Part not found.");
  const measures = kids(part, "measure");
  let divisions = 1;
  let transpose = 0;
  let meter = "";
  const meterChanges: string[] = [];
  let tempo: number | null = null;
  const dropped = { voices: false, grace: 0, odd: 0 };
  const bars: Ev[][] = [];

  measures.forEach((m, i) => {
    const inRange = i + 1 >= fromBar && i + 1 <= toBar;
    for (const at of kids(m, "attributes")) {
      const d = Number(txt(at, "divisions"));
      if (d > 0) divisions = d;
      const tr = kid(at, "transpose");
      if (tr) transpose = Number(txt(tr, "chromatic") || 0) + 12 * Number(txt(tr, "octave-change") || 0);
      const t = kid(at, "time");
      if (t && inRange) {
        const mtr = `${txt(t, "beats")}/${txt(t, "beat-type")}`;
        if (!meter) meter = mtr;
        if (meterChanges.at(-1) !== mtr) meterChanges.push(mtr);
      }
    }
    if (!inRange) {
      if (i + 1 < fromBar) {
        const t = readTempo(m);
        if (t) tempo = t;
      }
      return;
    }
    if (tempo === null || i + 1 === fromBar) tempo = readTempo(m) ?? tempo;

    const evs: Ev[] = [];
    let firstVoice: string | null = null;
    let afterBackup = false;
    for (const el of Array.from(m.children)) {
      if (el.tagName === "backup") {
        afterBackup = true;
        continue;
      }
      if (el.tagName !== "note") continue;
      const voice = txt(el, "voice") || "1";
      if (firstVoice === null) firstVoice = voice;
      if (voice !== firstVoice || afterBackup) {
        dropped.voices = true;
        continue;
      }
      if (kid(el, "grace")) {
        dropped.grace++;
        continue;
      }
      const isChord = !!kid(el, "chord");
      const dur = Number(txt(el, "duration")) / divisions;
      const ties = kids(el, "tie").map((t) => t.getAttribute("type"));
      const notations = kid(el, "notations");
      const tied = notations ? kids(notations, "tied").map((t) => t.getAttribute("type")) : [];
      const tieStart = ties.includes("start") || tied.includes("start");
      const tieStop = ties.includes("stop") || tied.includes("stop");
      const arts = notations ? kid(notations, "articulations") : null;
      const accent = !!(arts && (kid(arts, "accent") || kid(arts, "strong-accent")));
      const notehead = txt(el, "notehead");
      let midi: number | null = null;
      const pitch = kid(el, "pitch");
      const rest = !!kid(el, "rest");
      if (pitch) {
        const step = txt(pitch, "step");
        const alter = Number(txt(pitch, "alter") || 0);
        const oct = Number(txt(pitch, "octave"));
        const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        if (step in base && Number.isFinite(oct)) midi = (oct + 1) * 12 + base[step] + Math.round(alter) + transpose;
      }
      const dead = notehead === "x" || !!kid(el, "unpitched");
      if (isChord && evs.length) {
        const last = evs[evs.length - 1];
        if (midi !== null && !dead && !last.rest && last.midi[0] !== -1 && !last.midi.includes(midi)) last.midi.push(midi);
        continue;
      }
      if (!(dur > 0)) continue;
      evs.push({
        beats: dur,
        midi: rest ? [] : dead || midi === null ? [-1] : [midi],
        accent,
        rest,
        tieStop,
        tieStart,
      });
    }
    bars.push(evs);
  });

  // join ties (including across bar lines)
  const flat: { ev: Ev; bar: number }[] = [];
  bars.forEach((evs, b) =>
    evs.forEach((ev) => {
      const prev = flat.at(-1);
      if (ev.tieStop && prev && !prev.ev.rest && prev.ev.midi.join() === ev.midi.join()) prev.ev.beats += ev.beats;
      else flat.push({ ev, bar: b });
    }),
  );

  const tokens: string[] = [];
  let bar = -1;
  let notes = 0;
  for (const { ev, bar: b } of flat) {
    if (b !== bar) {
      if (bar !== -1) tokens.push("|");
      bar = b;
    }
    const parts = splitDuration(ev.beats);
    if (!parts) {
      dropped.odd++;
      continue;
    }
    const head = ev.rest
      ? "r"
      : ev.midi[0] === -1
        ? "x"
        : ev.midi.length > 1
          ? `[${[...ev.midi].sort((a, b) => a - b).map((x) => midiToPitch(x)).join(",")}]`
          : midiToPitch(ev.midi[0]);
    tokens.push(`${head}/${parts[0]}${ev.accent && !ev.rest ? "!" : ""}`);
    for (const p of parts.slice(1)) tokens.push(`r/${p}`);
    if (!ev.rest) notes++;
  }
  while (tokens.at(-1) === "|") tokens.pop();
  return { notation: tokens.join(" "), meter, meterChanges, tempo, bars: bars.length, notes, dropped };
}
