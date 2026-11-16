/**
 * MusicXML export for Learn Form notation, so any example can be opened in Guitar Pro
 * (File › Import › MusicXML), MuseScore or Sibelius.
 *
 * Durations are written in divisions of 24 per quarter note, which covers sixteenths,
 * thirty-seconds and triplets of eighths and sixteenths. Notes that cross a bar line,
 * or whose length has no single written value, are split into tied notes.
 */
import { parseNotation, type NoteEvent } from "./notation";
import type { VoiceName } from "./engine";

export type XmlPart = { name: string; notation: string; voice?: VoiceName };

export type XmlOptions = {
  title: string;
  bpm?: number;
  /** time signature, e.g. "4/4", "2/2", "3/4" */
  time?: string;
  /** key signature as number of sharps (+) or flats (-) */
  fifths?: number;
  composer?: string;
};

const DIV = 24;

/** written values in divisions → [type, dots, triplet] */
const VALUES: [number, string, number, boolean][] = [
  [96, "whole", 0, false],
  [72, "half", 1, false],
  [48, "half", 0, false],
  [36, "quarter", 1, false],
  [32, "half", 0, true],
  [24, "quarter", 0, false],
  [18, "eighth", 1, false],
  [16, "quarter", 0, true],
  [12, "eighth", 0, false],
  [9, "16th", 1, false],
  [8, "eighth", 0, true],
  [6, "16th", 0, false],
  [4, "16th", 0, true],
  [3, "32nd", 0, false],
  [2, "32nd", 0, true],
];

const STEP_SHARP = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const ALTER_SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const STEP_FLAT = ["C", "D", "D", "E", "E", "F", "G", "G", "A", "A", "B", "B"];
const ALTER_FLAT = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** split a length (in divisions) into writable values, longest first */
function splitValues(len: number): number[] {
  const out: number[] = [];
  let rest = Math.round(len);
  while (rest > 0) {
    const v = VALUES.find(([d]) => d <= rest);
    if (!v) {
      out.push(rest);
      break;
    }
    out.push(v[0]);
    rest -= v[0];
  }
  return out;
}

function pitchXml(midi: number, flats: boolean) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const step = (flats ? STEP_FLAT : STEP_SHARP)[pc];
  const alter = (flats ? ALTER_FLAT : ALTER_SHARP)[pc];
  return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>`;
}

function noteXml(
  midis: number[],
  len: number,
  opts: { tieStart: boolean; tieStop: boolean; accent: boolean; lyric?: string; flats: boolean }
) {
  const v = VALUES.find(([d]) => d === len);
  const type = v ? `<type>${v[1]}</type>${"<dot/>".repeat(v[2])}` : "";
  const tm = v && v[3] ? "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>" : "";
  if (midis.length === 0) {
    return `<note><rest/><duration>${len}</duration>${type}${tm}</note>`;
  }
  return midis
    .map((m, i) => {
      const unpitched = m === -1;
      const p = unpitched ? "<unpitched><display-step>E</display-step><display-octave>4</display-octave></unpitched>" : pitchXml(m, opts.flats);
      const ties = `${opts.tieStop ? '<tie type="stop"/>' : ""}${opts.tieStart ? '<tie type="start"/>' : ""}`;
      const notations: string[] = [];
      if (opts.tieStop) notations.push('<tied type="stop"/>');
      if (opts.tieStart) notations.push('<tied type="start"/>');
      if (opts.accent && i === 0) notations.push("<articulations><accent/></articulations>");
      const head = unpitched ? "<notehead>x</notehead>" : "";
      const lyric = opts.lyric && i === 0 && !opts.tieStop ? `<lyric><text>${esc(opts.lyric)}</text></lyric>` : "";
      return `<note>${i > 0 ? "<chord/>" : ""}${p}<duration>${len}</duration>${ties}${type}${tm}${head}${
        notations.length ? `<notations>${notations.join("")}</notations>` : ""
      }${lyric}</note>`;
    })
    .join("");
}

function clefFor(events: NoteEvent[], voice?: VoiceName) {
  const pitched = events.flatMap((e) => e.midi).filter((m) => m > 0);
  if (voice === "kit") return '<clef><sign>percussion</sign></clef>';
  if (voice === "bass") return "<clef><sign>F</sign><line>4</line><clef-octave-change>-1</clef-octave-change></clef>";
  if (voice === "guitar" || voice === "drive")
    return "<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>";
  const avg = pitched.length ? pitched.reduce((a, b) => a + b, 0) / pitched.length : 64;
  return avg < 57 ? "<clef><sign>F</sign><line>4</line></clef>" : "<clef><sign>G</sign><line>2</line></clef>";
}

function partMeasures(events: NoteEvent[], barLen: number, measures: number, flats: boolean, skipBefore = 0) {
  // collect slices per measure, including rests to fill gaps
  type Slice = { midi: number[]; start: number; len: number; tieStart: boolean; tieStop: boolean; accent: boolean; lyric?: string };
  const perMeasure: Slice[][] = Array.from({ length: measures }, () => []);
  const sounding = events
    .map((e) => ({ ...e, s: Math.round(e.start * DIV), l: Math.round(e.dur * DIV) }))
    .filter((e) => e.l > 0)
    .sort((a, b) => a.s - b.s);

  let cursor = 0;
  const pushSpan = (midi: number[], s: number, l: number, accent: boolean, lyric?: string) => {
    let pos = s;
    let remaining = l;
    let first = true;
    while (remaining > 0) {
      const m = Math.floor(pos / barLen);
      if (m >= measures) break;
      const inBar = Math.min(remaining, (m + 1) * barLen - pos);
      const parts = splitValues(inBar);
      let p = pos;
      parts.forEach((len, i) => {
        const last = i === parts.length - 1 && inBar === remaining;
        perMeasure[m].push({
          midi,
          start: p - m * barLen,
          len,
          tieStop: midi.length > 0 && !first,
          tieStart: midi.length > 0 && !last,
          accent: accent && first,
          lyric: first ? lyric : undefined,
        });
        first = false;
        p += len;
      });
      pos += inBar;
      remaining -= inBar;
    }
  };

  for (const e of sounding) {
    if (e.s > cursor) pushSpan([], cursor, e.s - cursor, false);
    const s = Math.max(e.s, cursor);
    const l = e.l - (s - e.s);
    if (l > 0) pushSpan(e.midi, s, l, e.accent, e.lyric);
    cursor = Math.max(cursor, s + l);
  }
  if (cursor < measures * barLen) pushSpan([], cursor, measures * barLen - cursor, false);

  if (skipBefore > 0) perMeasure[0] = perMeasure[0].filter((sl) => !(sl.midi.length === 0 && sl.start + sl.len <= skipBefore));
  return perMeasure.map((slices) =>
    slices.map((sl) => noteXml(sl.midi, sl.len, { tieStart: sl.tieStart, tieStop: sl.tieStop, accent: sl.accent, lyric: sl.lyric, flats })).join("")
  );
}

export function toMusicXML(parts: XmlPart[], opts: XmlOptions): string {
  const [num, den] = (opts.time ?? "4/4").split("/").map((n) => parseInt(n, 10));
  const barLen = Math.round(num * (4 / den) * DIV);
  const flats = (opts.fifths ?? -1) <= 0;
  const parsed = parts.map((p) => ({ ...p, ...parseNotation(p.notation) }));
  // a leading pickup is written as a short first bar when the first bar line sits before a full bar
  const longest = Math.max(...parsed.map((p) => p.totalBeats)) * DIV;
  const firstBar = parsed[0].bars.length ? Math.round(parsed[0].bars[0] * DIV) : 0;
  const pickup = firstBar > 0 && firstBar < barLen ? firstBar : 0;
  const shift = pickup ? barLen - pickup : 0;
  const measures = Math.max(1, Math.ceil((longest + shift) / barLen));

  const partList = parsed
    .map((p, i) => `<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name></score-part>`)
    .join("");

  const body = parsed
    .map((p, i) => {
      const shifted = p.events.map((e) => ({ ...e, start: e.start + shift / DIV }));
      const ms = partMeasures(shifted, barLen, measures, flats, shift);
      // a pickup bar is written as an implicit (short) measure 0
      const xmlMeasures = ms.map((m, k) => {
        const attrs =
          k === 0
            ? `<attributes><divisions>${DIV}</divisions><key><fifths>${opts.fifths ?? 0}</fifths></key><time><beats>${num}</beats><beat-type>${den}</beat-type></time>${clefFor(p.events, p.voice)}</attributes>${
                i === 0 && opts.bpm
                  ? `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${opts.bpm}</per-minute></metronome></direction-type><sound tempo="${opts.bpm}"/></direction>`
                  : ""
              }`
            : "";
        const number = pickup ? k : k + 1;
        return `<measure number="${number}"${pickup && k === 0 ? ' implicit="yes"' : ""}>${attrs}${m}</measure>`;
      });
      return `<part id="P${i + 1}">${xmlMeasures.join("")}</part>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><work><work-title>${esc(opts.title)}</work-title></work><identification>${
    opts.composer ? `<creator type="composer">${esc(opts.composer)}</creator>` : ""
  }<encoding><software>Learn Form</software></encoding></identification><part-list>${partList}</part-list>${body}</score-partwise>`;
}

export function downloadMusicXML(parts: XmlPart[], opts: XmlOptions) {
  const xml = toMusicXML(parts, opts);
  const blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "example"}.musicxml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
