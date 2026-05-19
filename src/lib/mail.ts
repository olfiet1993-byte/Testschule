/**
 * Schlanker Mail-Helper:
 * - Wenn RESEND_API_KEY in ENV → echte Mail via Resend API
 * - Sonst → Schreibt die Mail in data/mail.log (Dev-Modus, einsehbar)
 *
 * Bewusst keine npm-Dependency: nutze fetch.
 */

import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isMailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendMail(input: MailInput): Promise<{ ok: boolean; mode: "live" | "dev"; error?: string }> {
  const from = process.env.MAIL_FROM ?? "Test Schule <noreply@test.schule>";

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text ?? input.html.replace(/<[^>]+>/g, " "),
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        await logToDev({ ...input, from, _error: err });
        return { ok: false, mode: "live", error: err };
      }
      return { ok: true, mode: "live" };
    } catch (e: any) {
      await logToDev({ ...input, from, _error: e.message });
      return { ok: false, mode: "live", error: e.message };
    }
  }

  await logToDev({ ...input, from });
  return { ok: true, mode: "dev" };
}

async function logToDev(payload: Record<string, any>) {
  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  const logPath = path.join(dataDir, "mail.log");
  const stamp = new Date().toISOString();
  const entry =
    `\n========== ${stamp} ==========\n` +
    `From:    ${payload.from}\n` +
    `To:      ${payload.to}\n` +
    `Subject: ${payload.subject}\n` +
    (payload._error ? `ERROR:   ${payload._error}\n` : "") +
    `-------- HTML --------\n${payload.html}\n` +
    `-------- TEXT --------\n${payload.text ?? ""}\n` +
    `=====================================\n`;
  await appendFile(logPath, entry, "utf-8");
}

export function inviteEmail(input: {
  schoolName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const expires = input.expiresAt.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  return {
    subject: `Einladung in das Kollegium von ${input.schoolName}`,
    html: `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="max-width: 560px; width:100%; background:white; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg,#0ea5e9,#10b981); padding:24px; color:white;">
        <div style="font-size: 14px; opacity:0.85;">Test Schule</div>
        <div style="font-size: 20px; font-weight:bold; margin-top:4px;">Du bist eingeladen</div>
      </td>
    </tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 14px;">Hallo,</p>
      <p style="margin:0 0 14px;">
        <strong>${input.inviterName}</strong> hat dich eingeladen, dem Kollegium von
        <strong>${input.schoolName}</strong> beizutreten.
      </p>
      <p style="margin:0 0 22px;">Klicke auf den folgenden Button, um deinen Lehrkraft-Account anzulegen:</p>
      <div style="text-align:center; margin: 24px 0;">
        <a href="${input.inviteUrl}" style="display:inline-block; background:#0ea5e9; color:white; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:600;">Account anlegen</a>
      </div>
      <p style="font-size:12px; color:#64748b; margin: 18px 0 0;">
        Funktioniert der Button nicht? Kopiere diesen Link in deinen Browser:
        <br/>
        <span style="word-break:break-all;">${input.inviteUrl}</span>
      </p>
      <p style="font-size:12px; color:#64748b; margin-top: 18px;">
        Der Einladungslink ist bis zum ${expires} gültig.
      </p>
    </td></tr>
    <tr><td style="background:#f1f5f9; padding:16px; text-align:center; font-size:11px; color:#64748b;">
      Diese Nachricht wurde von der Test-Schule-Lernplattform versendet.
    </td></tr>
  </table>
</body></html>`.trim(),
  };
}
