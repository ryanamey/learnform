"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { play, type Layer, type PlayOptions } from "@/lib/music/engine";

/**
 * Small wrapper around the audio engine.
 * `playing` holds a key for whatever is playing, so a list of items
 * can show which one is active.
 */
export function usePlayer() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [active, setActive] = useState<Record<number, number>>({});
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(null);
    setActive({});
  }, []);

  const start = useCallback(
    async (key: string, layers: Layer[], opts: Omit<PlayOptions, "onEvent" | "onEnd"> & { onEvent?: PlayOptions["onEvent"] }) => {
      stopRef.current?.();
      setPlaying(key);
      setActive({});
      stopRef.current = await play(layers, {
        ...opts,
        onEvent: (layer, idx, loop) => {
          setActive((a) => ({ ...a, [layer]: idx }));
          opts.onEvent?.(layer, idx, loop);
        },
        onEnd: () => {
          setPlaying((p) => (p === key ? null : p));
          setActive({});
        },
      });
    },
    []
  );

  const toggle = useCallback(
    (key: string, layers: Layer[], opts: Omit<PlayOptions, "onEvent" | "onEnd"> & { onEvent?: PlayOptions["onEvent"] }) => {
      if (playing === key) stop();
      else void start(key, layers, opts);
    },
    [playing, start, stop]
  );

  useEffect(() => () => stopRef.current?.(), []);

  return { playing, active, start, stop, toggle };
}
