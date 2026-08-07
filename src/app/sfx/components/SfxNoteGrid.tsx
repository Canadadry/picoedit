import type { Effect, IntegerRange_0_8, IntegerRange_0_16, Note } from "../../../internal/pico8/cart-data.ts";
import { ALL_NOTE_NAMES, noteNameToPitch, pitchToNoteName } from "../pitch.ts";
import { EFFECTS } from "../tools.ts";

const INSTRUMENTS = Array.from({ length: 16 }, (_, i) => i);
const VOLUMES = Array.from({ length: 8 }, (_, i) => i);

const SELECT_CLASS =
  "rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-xs text-neutral-100 hover:bg-neutral-800";

interface SfxNoteGridProps {
  notes: Note[];
  onEditNote: (noteIndex: number, patch: Partial<Note>) => void;
}

/** The selected Sfx's 32 notes as rows, every field (pitch/instrument/volume/effect) directly editable. */
export function SfxNoteGrid({ notes, onEditNote }: SfxNoteGridProps) {
  return (
    <table aria-label="Sfx note grid" className="border-collapse text-xs">
      <thead>
        <tr className="text-left text-neutral-400">
          <th className="px-1 font-normal">#</th>
          <th className="px-1 font-normal">Pitch</th>
          <th className="px-1 font-normal">Instrument</th>
          <th className="px-1 font-normal">Volume</th>
          <th className="px-1 font-normal">Effect</th>
        </tr>
      </thead>
      <tbody>
        {notes.map((note, noteIndex) => (
          <tr key={noteIndex}>
            <td className="px-1 text-neutral-400">{String(noteIndex).padStart(2, "0")}</td>
            <td className="px-1">
              <select
                aria-label={`Note ${noteIndex} pitch`}
                className={SELECT_CLASS}
                value={pitchToNoteName(note.pitch)}
                onChange={(event) => onEditNote(noteIndex, { pitch: noteNameToPitch(event.target.value) })}
              >
                {ALL_NOTE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-1">
              <select
                aria-label={`Note ${noteIndex} instrument`}
                className={SELECT_CLASS}
                value={note.instrument}
                onChange={(event) =>
                  onEditNote(noteIndex, { instrument: Number(event.target.value) as IntegerRange_0_16 })
                }
              >
                {INSTRUMENTS.map((instrument) => (
                  <option key={instrument} value={instrument}>
                    {instrument}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-1">
              <select
                aria-label={`Note ${noteIndex} volume`}
                className={SELECT_CLASS}
                value={note.volume}
                onChange={(event) => onEditNote(noteIndex, { volume: Number(event.target.value) as IntegerRange_0_8 })}
              >
                {VOLUMES.map((volume) => (
                  <option key={volume} value={volume}>
                    {volume}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-1">
              <select
                aria-label={`Note ${noteIndex} effect`}
                className={SELECT_CLASS}
                value={note.effect}
                onChange={(event) => onEditNote(noteIndex, { effect: event.target.value as Effect })}
              >
                {EFFECTS.map((effect) => (
                  <option key={effect} value={effect}>
                    {effect}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
