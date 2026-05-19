"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";
import { sendMessage, deleteMessage } from "@/lib/actions/messages";
import { ArrowLeft, Send, Trash2 } from "lucide-react";

export function ConversationClient({
  me,
  other,
  messages,
}: {
  me: { id: string; displayName: string };
  other: any;
  messages: any[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit() {
    if (!body.trim()) return;
    const text = body;
    setBody("");
    start(async () => {
      try {
        await sendMessage(other.id, text);
        router.refresh();
      } catch (e: any) {
        alert(e.message);
        setBody(text);
      }
    });
  }

  return (
    <>
      <Link href="/nachrichten" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Avatar user={other} size={48} />
        <div>
          <h1 className="text-xl font-bold">{other.displayName}</h1>
          <p className="text-xs text-slate-500">{other.role === "teacher" ? "Lehrkraft" : "Schüler:in"}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4 min-h-[200px]">
        {messages.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 text-center py-4">
              Noch keine Nachrichten — beginne das Gespräch.
            </p>
          </Card>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    mine
                      ? "bg-sky-500 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm"
                  }`}
                >
                  <div>{m.body}</div>
                  <div className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? "text-sky-100" : "text-slate-500"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    {mine && m.readAt && <span>✓✓</span>}
                    {mine && !m.readAt && <span>✓</span>}
                    {mine && (
                      <button
                        onClick={() => {
                          if (confirm("Nachricht löschen?")) start(async () => { await deleteMessage(m.id); router.refresh(); });
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-200"
                        title="Löschen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <Card className="sticky bottom-4">
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Nachricht schreiben…"
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm resize-none"
          />
          <Button onClick={submit} disabled={pending || !body.trim()} className="self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Enter zum Senden · Shift+Enter für neue Zeile</p>
      </Card>
    </>
  );
}
