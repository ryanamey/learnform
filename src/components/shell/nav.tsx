"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Map,
  Moon,
  NotebookPen,
  Sun,
  UserRound,
  Waypoints,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const study = [
  { href: "/", label: "Studio", icon: Home },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/motifs", label: "Motif bank", icon: Waypoints },
  { href: "/journal", label: "Journal", icon: NotebookPen },
];
const reference = [
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/docs", label: "Docs", icon: FileText },
];
const allItems = [...study, ...reference, { href: "/profile", label: "Profile" }];

const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => themeListeners.delete(cb);
}
function useDark() {
  return useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => true
  );
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  themeListeners.forEach((l) => l());
  try {
    localStorage.setItem("lf-theme", isDark ? "dark" : "light");
  } catch {}
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function NavGroup({ label, items }: { label: string; items: typeof study }) {
  const isActive = useActive();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
                <Link href={href} onClick={() => setOpenMobile(false)}>
                  <Icon className={isActive(href) ? "text-signal" : undefined} />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const dark = useDark();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-signal text-signal-foreground text-xs font-medium">
                  {initials(name || email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name || "Account"}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid text-sm leading-tight">
                <span className="truncate font-medium">{name || "Account"}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={() => setOpenMobile(false)}>
                  <UserRound /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
              >
                {dark ? <Sun /> : <Moon />} {dark ? "Light theme" : "Dark theme"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ name, email }: { name: string; email: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-signal font-serif text-base text-signal-foreground">
                  F
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-serif text-base">Learn Form</span>
                  <span className="truncate text-xs text-muted-foreground">form, for writing</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Study" items={study} />
        <NavGroup label="Reference" items={reference} />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu name={name} email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Sticky bar above the content: menu button, current section, and theme toggle. */
export function TopBar() {
  const pathname = usePathname();
  const dark = useDark();
  const current =
    allItems
      .filter((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Learn Form";
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <span className="h-4 w-px bg-border" aria-hidden />
      <span className="truncate text-sm font-medium">{current}</span>
      <button
        type="button"
        onClick={toggleTheme}
        className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </header>
  );
}
