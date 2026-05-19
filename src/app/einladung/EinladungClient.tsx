"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { acceptInvite } from "@/lib/actions/invites";
import { GraduationCap, Check } from "lucide-react";

export function EinladungClient({
  token,
  email,
  schoolName,
  inviterName,
}: {
  token: string;
  email: string;
  schoolName: string;
  inviterName: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await acceptInvite({ token, displayName, password });
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Willkommen!</h1>
          <p className="text-sm text-slate-500 mb-6">
            Dein Lehrkraft-Account in <strong>{schoolName}</strong> ist angelegt. Du kannst dich nun einloggen.
          </p>
          <Button onClick={() => router.push("/login")} size="lg" className="w-full">
            Zum Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-900/40 mb-3">
            <GraduationCap className="w-8 h-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold">Lehrkraft-Einladung</h1>
          <p className="text-sm text-slate-500 mt-1">
            {inviterName} lädt dich ein, dem Kollegium von <strong>{schoolName}</strong> beizutreten.
          </p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>E-Mail</Label>
              <Input value={email} disabled className="mt-1 bg-slate-100 dark:bg-slate-800" />
              <p className="text-xs text-slate-500 mt-1">Aus der Einladung übernommen.</p>
            </div>
            <div>
              <Label htmlFor="displayName">Anzeigename</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z. B. Frau Schmidt"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mind. 6 Zeichen"
                required
                minLength={6}
                className="mt-1"
              />
            </div>
            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{error}</div>
            )}
            <Button type="submit" disabled={submitting} size="lg" className="w-full">
              {submitting ? "…" : "Account anlegen"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
