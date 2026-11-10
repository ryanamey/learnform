"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Renders a Mermaid diagram (used for the C4-style blueprint diagrams).
 * Diagrams live as text in MDX, so they can be updated with every patch.
 */
export function Mermaid({ chart, caption }: { chart: string; caption?: string }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      const dark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: dark ? "dark" : "neutral",
        fontFamily: "var(--font-geist-sans), sans-serif",
        flowchart: { curve: "basis", htmlLabels: true },
      });
      try {
        const { svg } = await mermaid.render(`m${id}`, chart.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <figure className="not-prose my-8 rounded-xl border bg-card p-4">
      <div ref={ref} className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full" />
      {error && <pre className="mt-2 whitespace-pre-wrap text-xs text-destructive">Diagram error: {error}</pre>}
      {caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
