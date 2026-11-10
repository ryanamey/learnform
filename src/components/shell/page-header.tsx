import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-2 text-xs font-medium uppercase tracking-widest text-signal">{eyebrow}</div>}
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">{title}</h1>
        {children && <div className="mt-3 text-muted-foreground">{children}</div>}
      </div>
      {actions}
    </header>
  );
}

export function PageBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12" : "mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12"}>{children}</div>;
}
