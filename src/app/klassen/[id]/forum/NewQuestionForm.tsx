"use client";

import { useState } from "react";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createQuestion } from "@/lib/actions/forum";
import { Plus, MessageCircle } from "lucide-react";

export function NewQuestionForm({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Card className="!p-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left flex items-center gap-3 text-slate-500 hover:text-sky-600 transition"
        >
          <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span>Frage stellen…</span>
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" /> Neue Frage
      </h3>
      <form action={createQuestion} className="space-y-3">
        <input type="hidden" name="classId" value={classId} />
        <div>
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" placeholder="Kurze Frage in einem Satz" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="body">Details</Label>
          <textarea
            id="body"
            name="body"
            rows={4}
            required
            placeholder="Was hast du schon probiert? Worüber bist du unsicher?"
            className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Abbrechen</Button>
          <Button type="submit" className="flex-1">Frage senden</Button>
        </div>
      </form>
    </Card>
  );
}
