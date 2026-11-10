import { Nav } from "@/components/shell/nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Nav name={user.name || user.email} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
