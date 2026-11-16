import { parseNotation } from "@/lib/music/notation";
import {
  findTonic,
  groupingText,
  modeById,
  parseGrouping,
  pcName,
  readBoard,
  readChords,
  readMeter,
  readRhythm,
  suggestGrouping,
  sum,
} from "@/lib/riff";

/** One line about a riff for the list: count, grouping, tonic and mode. */
export function riffSummary(notation: string, rawBoard: unknown) {
  const board = readBoard(rawBoard);
  try {
    const p = parseNotation(notation);
    const r = readRhythm(p.events, p.totalBeats);
    if (!r) return { ok: false as const, board };
    const g = parseGrouping(board.grouping) ?? suggestGrouping(r);
    const meter = readMeter(board.meter, r.perBeat);
    const chords = readChords(p.events, r.perBeat);
    const tonic = board.tonic ?? findTonic(chords, meter)[0]?.pc ?? null;
    return {
      ok: true as const,
      board,
      grouping: groupingText(g),
      units: sum(g),
      tonic: tonic === null ? null : pcName(tonic),
      mode: board.mode ? (modeById[board.mode]?.name ?? "") : "",
      guessed: !board.grouping,
    };
  } catch {
    return { ok: false as const, board };
  }
}
