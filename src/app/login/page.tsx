"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Card } from "@/components/ui/Input";
import {
  GraduationCap,
  User,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  Users,
  Map,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code")?.toUpperCase().slice(0, 6) ?? "";
  const [mode, setMode] = useState<"teacher" | "student">(prefillCode ? "student" : "teacher");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Vor-Befüllen des Codes (z. B. nach QR-Scan ?code=DEMO01)
  useEffect(() => {
    if (prefillCode && mode === "student") {
      const el = document.getElementById("inviteCode") as HTMLInputElement | null;
      if (el && !el.value) el.value = prefillCode;
    }
  }, [prefillCode, mode]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const pin = String(fd.get("pin") ?? "");
    const credentials =
      mode === "teacher"
        ? { email: fd.get("email"), password: fd.get("password") }
        : {
            inviteCode: fd.get("inviteCode"),
            displayName: fd.get("displayName"),
            pin,
            newPin: pin,
          };

    const res = await signIn(mode, { ...credentials, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(
        mode === "teacher"
          ? "E-Mail oder Passwort falsch."
          : "Klassen-Code, Name oder PIN falsch. (Bei der ersten Anmeldung legst du deine PIN fest — mindestens 4 Stellen.)",
      );
    } else {
      router.push(mode === "teacher" ? "/dashboard" : "/sus");
      router.refresh();
    }
  }

  function quickFill(email: string, pw: string) {
    setMode("teacher");
    setTimeout(() => {
      (document.getElementById("email") as HTMLInputElement).value = email;
      (document.getElementById("password") as HTMLInputElement).value = pw;
    }, 0);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      {/* Hero / Marketing-Seite */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-brand-grad text-white">
        {/* dekorative Blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-12 w-[28rem] h-[28rem] rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Test Schule</div>
              <div className="text-xs text-white/70 leading-tight">Lernraum für die Pflegeausbildung</div>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Lernen, das zusammen<br />wirklich Spaß macht.
          </h1>
          <p className="text-lg text-white/85 max-w-md">
            Quizze, Fallbeispiele, Karteikarten, Klausuren — alles an einem Ort.
            Strukturierte Lernpfade, Live-Auswertung und ein Team-Forum für deine Klasse.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-10 max-w-md">
            {[
              { icon: BookOpen, label: "5 Aufgabentypen" },
              { icon: ClipboardCheck, label: "Klausur-Modus" },
              { icon: Users, label: "Live-Quiz" },
              { icon: Map, label: "Lernpfade" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/15"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative space-y-3">
          <Link
            href="/anleitung"
            className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white transition"
          >
            <Lightbulb className="w-4 h-4" /> Anleitung & Funktionsübersicht
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} Test Schule · Pflegeausbildung
          </p>
        </div>
      </div>

      {/* Login-Form */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only Branding */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-grad mb-4 shadow-lift">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Test Schule</h1>
            <p className="text-sm text-slate-500 mt-1">Lernraum für die Pflegeausbildung</p>
          </div>

          <Card className="!p-7 shadow-lift">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">Willkommen</span>
            </div>
            <h2 className="text-2xl font-bold mb-5">Anmelden</h2>

            <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => { setMode("teacher"); setError(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === "teacher"
                    ? "bg-white dark:bg-slate-900 shadow text-sky-600 dark:text-sky-400"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                👩‍🏫 Lehrkraft
              </button>
              <button
                type="button"
                onClick={() => { setMode("student"); setError(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === "student"
                    ? "bg-white dark:bg-slate-900 shadow text-sky-600 dark:text-sky-400"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                🎓 Schüler:in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "teacher" ? (
                <>
                  <div>
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" name="email" type="email" required placeholder="lehrer@demo.test" className="mt-1" autoComplete="email" />
                  </div>
                  <div>
                    <Label htmlFor="password">Passwort</Label>
                    <Input id="password" name="password" type="password" required placeholder="••••••••" className="mt-1" autoComplete="current-password" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="inviteCode">Klassen-Code</Label>
                    <Input id="inviteCode" name="inviteCode" required placeholder="z. B. DEMO01" className="mt-1 uppercase tracking-wider font-mono" maxLength={6} />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Dein Name</Label>
                    <Input id="displayName" name="displayName" required placeholder="Lisa M." className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pin">PIN (min. 4 Stellen)</Label>
                    <Input id="pin" name="pin" type="password" required placeholder="••••" className="mt-1 font-mono tracking-widest" minLength={4} maxLength={12} autoComplete="current-password" />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Beim ersten Mal legst du deine PIN selbst fest.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" variant="brand" disabled={loading} className="w-full" size="lg">
                {loading ? "Bitte warten…" : <>Anmelden <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>

            {mode === "teacher" && (
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-2 font-medium">🎯 Demo-Konten zum Ausprobieren</p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => quickFill("lehrer@demo.test", "demo1234")}
                    className="w-full text-left text-xs px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                  >
                    <span className="font-mono text-sky-600 dark:text-sky-400">lehrer@demo.test</span>
                    <span className="text-slate-400"> · </span>
                    <span className="font-mono">demo1234</span>
                    <span className="text-slate-400 ml-2">(zum Einfügen klicken)</span>
                  </button>
                </div>
              </div>
            )}
            {mode === "student" && (
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-1 font-medium">🎯 Demo-Klasse</p>
                <p className="text-xs text-slate-500">
                  Klassen-Code <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">DEMO01</code>,
                  beliebigen Namen wählen, eine eigene PIN festlegen.
                </p>
              </div>
            )}
          </Card>

          <div className="text-center mt-6 lg:hidden">
            <Link href="/anleitung" className="text-sm text-slate-500 hover:text-sky-600 inline-flex items-center gap-1">
              <Lightbulb className="w-4 h-4" /> Anleitung ansehen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
