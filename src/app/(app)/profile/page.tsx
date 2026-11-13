import type { Metadata } from "next";

import { concepts } from "@/content/curriculum";
import { getJournal, getMotifs, getProgress } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { ProfileForms } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [progress, motifs, journal] = await Promise.all([
    getProgress(user.id),
    getMotifs(user.id),
    getJournal(user.id),
  ]);
  const statuses = Object.values(progress);
  const done = statuses.filter((s) => s === "done").length;
  const started = statuses.filter((s) => s === "started").length;
  const stats = [
    { label: "Pages done", value: `${done} / ${concepts.length}` },
    { label: "In progress", value: String(started) },
    { label: "Motifs", value: String(motifs.length) },
    { label: "Journal entries", value: String(journal.length) },
  ];
  const since = new Date(user.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <PageBody>
      <PageHeader eyebrow="Profile" title={user.name || "Your account"}>
        {user.email} · studying since {since}
      </PageHeader>
      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-serif text-2xl tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>
      <ProfileForms name={user.name} email={user.email} />
    </PageBody>
  );
}
