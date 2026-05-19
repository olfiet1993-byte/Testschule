"use client";

import { useState, useTransition } from "react";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { inviteTeacher, revokeInvite } from "@/lib/actions/invites";
import { Mail, Copy, X, Plus, Check, AlertCircle } from "lucide-react";

export function SchuleClient({
  invites,
  baseUrl,
  mailEnabled,
}: {
  schoolName: string;
  invites: any[];
  baseUrl: string;
  mailEnabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  function inviteUrl(token: string) {
    return `${baseUrl}/einladung?token=${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Mail className="w-4 h-4" /> Mitlehrer einladen
      </h2>

      <div className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 ${
        mailEnabled
          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
      }`}>
        {mailEnabled ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <div>
          {mailEnabled ? (
            <><strong>Mail-Versand aktiv</strong> — Einladungen werden automatisch per E-Mail gesendet.</>
          ) : (
            <><strong>Dev-Modus</strong> — Mails werden in <code>data/mail.log</code> protokolliert statt versendet. Kopiere bis dahin den Link manuell. Konfiguriere <code>RESEND_API_KEY</code> in <code>.env.local</code> für echten Versand.</>
          )}
        </div>
      </div>

      <form
        action={async (fd) => {
          try {
            await inviteTeacher(fd);
            const form = document.getElementById("invite-form") as HTMLFormElement | null;
            form?.reset();
          } catch (e: any) {
            alert(e.message);
          }
        }}
        id="invite-form"
        className="flex gap-2 mb-4"
      >
        <Input name="email" type="email" placeholder="lehrer@schule.de" required />
        <Button type="submit" disabled={pending}>
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {invites.length === 0 ? (
        <p className="text-sm text-slate-500">Keine offenen Einladungen.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((inv) => (
            <li key={inv.id} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{inv.email}</div>
                <div className="text-xs text-slate-500">
                  läuft ab am {new Date(inv.expiresAt).toLocaleDateString("de-DE")}
                </div>
              </div>
              <button
                onClick={() => copyLink(inv.token)}
                className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
                title="Link kopieren"
              >
                {copied === inv.token ? <><Check className="w-3 h-3" /> kopiert</> : <><Copy className="w-3 h-3" /> Link</>}
              </button>
              <button
                onClick={() => {
                  if (confirm("Einladung wirklich zurückziehen?")) {
                    start(() => { revokeInvite(inv.id); });
                  }
                }}
                disabled={pending}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Eingeladene Lehrkräfte erhalten beim Öffnen des Links ein Registrierungs-Formular. Sie wählen ihren Anzeigenamen und ein Passwort selbst.
      </p>
    </Card>
  );
}
