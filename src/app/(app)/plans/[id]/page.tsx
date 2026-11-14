import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPlan } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { PlanEditor } from "./plan-editor";

export const metadata: Metadata = { title: "Form plan" };

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const plan = await getPlan(user.id, id);
  if (!plan) notFound();
  return <PlanEditor id={plan.id} initialTitle={plan.title} initialSong={plan.song} initialData={plan.data} />;
}
