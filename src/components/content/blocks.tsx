import type { ReactNode } from "react";
import { BookOpen, Headphones, Lightbulb, PenLine, Disc3, ExternalLink } from "lucide-react";

import { bookById } from "@/content/curriculum";
import { cn } from "@/lib/utils";

/** Reference to one of your books. */
export function Source({ book, where }: { book: string; where?: string }) {
  const b = bookById[book];
  return (
    <span className="not-prose inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 align-baseline text-xs text-muted-foreground">
      <BookOpen className="size-3" />
      <span className="font-medium text-foreground">{b ? b.author.split(" ").slice(-1)[0] : book}</span>
      {where && <span>· {where}</span>}
    </span>
  );
}

/** The one-sentence takeaway of a section. */
export function KeyIdea({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 flex gap-3 rounded-xl border-l-4 border-signal bg-signal/8 px-5 py-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-signal" />
      <div className="font-serif text-lg leading-snug">{children}</div>
    </div>
  );
}

/** A listening assignment. No recordings are embedded — open them in your own player. */
export function ListenFor({
  artist,
  track,
  children,
}: {
  artist: string;
  track: string;
  children: ReactNode;
}) {
  const q = encodeURIComponent(`${artist} ${track}`);
  return (
    <div className="not-prose my-4 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Headphones className="mt-0.5 size-5 shrink-0 text-note-b" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{track}</span>
            <span className="text-sm text-muted-foreground">{artist}</span>
          </div>
          <div className="mt-1.5 text-sm text-foreground/85 [&_p]:my-1">{children}</div>
          <div className="mt-2 flex gap-3 text-xs">
            <a
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              href={`https://open.spotify.com/search/${q}`}
              target="_blank"
              rel="noreferrer"
            >
              Spotify <ExternalLink className="size-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              href={`https://www.youtube.com/results?search_query=${q}`}
              target="_blank"
              rel="noreferrer"
            >
              YouTube <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Exercise({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-xl border border-dashed p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <PenLine className="size-4 text-note-c" />
        {title}
      </div>
      <div className="text-sm leading-6 text-foreground/85 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

/** Apply it to the EP. */
export function EPTask({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("not-prose my-6 rounded-xl bg-primary p-5 text-primary-foreground", className)}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Disc3 className="size-4" />
        On your EP this week
      </div>
      <div className="text-sm leading-6 opacity-90 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function Aside({ children }: { children: ReactNode }) {
  return <aside className="not-prose my-6 text-sm text-muted-foreground [&_p]:my-2">{children}</aside>;
}
