"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { resetStudentPin } from "@/lib/actions/profile";
import { KeyRound } from "lucide-react";

export function PinResetButton({
  studentId,
  studentName,
  hasPin,
}: {
  studentId: string;
  studentName: string;
  hasPin: boolean;
}) {
  const [pending, start] = useTransition();
  if (!hasPin) {
    return (
      <span className="text-xs text-slate-500 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
        <KeyRound className="w-3 h-3" /> noch keine PIN
      </span>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`PIN von ${studentName} zurücksetzen?\n\nDie/der Schüler:in wird beim nächsten Login eine neue PIN festlegen müssen.`)) {
          start(async () => {
            try {
              await resetStudentPin(studentId);
              alert("PIN zurückgesetzt.");
            } catch (e: any) {
              alert(e.message);
            }
          });
        }
      }}
    >
      <KeyRound className="w-4 h-4" /> PIN zurücksetzen
    </Button>
  );
}
