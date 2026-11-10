"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Home, LogOut, Map, Moon, NotebookPen, Sun, Waypoints } from "lucide-react";
import { useSyncExternalStore } from "react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Studio", icon: Home },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/motifs", label: "Motif bank", icon: Waypoints },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: Map },
];

const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => themeListeners.delete(cb);
}

function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => true
  );
  return (
    <button
      type="button"
      onClick={() => {
        const isDark = document.documentElement.classList.toggle("dark");
        themeListeners.forEach((l) => l());
        try {
          localStorage.setItem("lf-theme", isDark ? "dark" : "light");
        } catch {}
      }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="md:inline hidden">Theme</span>
    </button>
  );
}

export function Nav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-card/40 px-3 py-5 md:flex">
        <Link href="/" className="mb-8 px-2">
          <span className="font-serif text-xl tracking-tight">Learn Form</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">form, for writing</span>
        </Link>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive(href)
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4", isActive(href) && "text-signal")} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t pt-3">
          <div className="truncate px-2 pb-1 text-xs text-muted-foreground">{name}</div>
          <ThemeToggle />
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="font-serif text-lg">
            Learn Form
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Main">
          {items.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1 text-sm",
                isActive(href) ? "bg-accent font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
