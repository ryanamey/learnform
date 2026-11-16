import { prietoAudioUrl } from "@/lib/media";

/**
 * One audio example from Prieto, Rhythmic Synchronicity (2020), streamed to signed-in users only.
 * Tracks have a click count-in, and the two parts are panned hard left and right.
 */
export function PrietoExample({ n, label }: { n: number | number[]; label: string }) {
  const list = Array.isArray(n) ? n : [n];
  return (
    <figure className="not-prose my-4 rounded-lg border bg-card px-4 py-3">
      <figcaption className="mb-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="ml-2 text-muted-foreground">
          Prieto, Example{list.length > 1 ? "s" : ""} {list.join(", ")}
        </span>
      </figcaption>
      <div className="flex flex-col gap-2">
        {list.map((x) => (
          <audio key={x} controls preload="none" src={prietoAudioUrl(x)} className="w-full">
            <track kind="captions" />
          </audio>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Click count-in first; each part is on its own side, so pan or unplug one ear to play the other part yourself.
      </p>
    </figure>
  );
}
