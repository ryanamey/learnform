"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteJournal } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function DeleteEntry({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Delete entry"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Delete this entry?")) start(() => void deleteJournal(id));
      }}
    >
      <Trash2 />
    </Button>
  );
}
