"use client";

import { useState, useTransition } from "react";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";
import {
  addAnswer, deleteAnswer, deleteQuestion, markAnswerAccepted, toggleQuestionResolved,
} from "@/lib/actions/forum";
import { CheckCircle2, Trash2, Check, X, MessageCircle, Send, GraduationCap } from "lucide-react";

export function QuestionDetailClient({
  question,
  klass,
  author,
  answers: answerList,
  currentUserId,
  currentUserRole,
}: {
  question: any;
  klass: any;
  author: any;
  answers: any[];
  currentUserId: string;
  currentUserRole: "teacher" | "student" | "admin";
}) {
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");

  function submitAnswer() {
    if (!body.trim()) return;
    start(async () => {
      await addAnswer(question.id, body);
      setBody("");
    });
  }

  const canEditQuestion = currentUserId === question.authorId || currentUserRole === "teacher";

  return (
    <>
      <Card className={`mb-6 ${question.resolved ? "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900" : ""}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              user={{
                id: author.id,
                displayName: author.displayName,
                avatarEmoji: author.avatarEmoji,
                avatarColor: author.avatarColor,
              }}
              size={40}
            />
            <div>
              <div className="text-sm font-medium">{author.displayName}</div>
              <div className="text-xs text-slate-500">
                {klass.name} · {new Date(question.createdAt).toLocaleDateString("de-DE")}
              </div>
            </div>
          </div>
          {question.resolved && (
            <Badge className="bg-emerald-500 text-white">
              <CheckCircle2 className="w-3 h-3 inline mr-1" /> Gelöst
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">{question.title}</h1>
        <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{question.body}</p>

        {canEditQuestion && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 flex-wrap">
            <button
              onClick={() => start(() => { toggleQuestionResolved(question.id); })}
              disabled={pending}
              className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> {question.resolved ? "wieder öffnen" : "als gelöst markieren"}
            </button>
            <button
              onClick={() => {
                if (confirm("Frage wirklich löschen? Alle Antworten gehen verloren.")) {
                  start(() => { deleteQuestion(question.id); });
                }
              }}
              disabled={pending}
              className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 ml-auto"
            >
              <Trash2 className="w-3 h-3" /> löschen
            </button>
          </div>
        )}
      </Card>

      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        {answerList.length} {answerList.length === 1 ? "Antwort" : "Antworten"}
      </h2>

      <div className="space-y-3 mb-6">
        {answerList.map((a) => {
          const canEditAnswer = currentUserId === a.authorId || currentUserRole === "teacher";
          const canAccept = currentUserId === question.authorId || currentUserRole === "teacher";
          return (
            <Card
              key={a.id}
              className={`!p-4 ${a.isAccepted ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10" : ""}`}
            >
              <div className="flex items-start gap-3">
                <Avatar user={a} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium">{a.authorName}</span>
                    {a.authorRole === "teacher" && (
                      <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        <GraduationCap className="w-3 h-3 inline mr-1" /> Lehrkraft
                      </Badge>
                    )}
                    {a.isAccepted && (
                      <Badge className="bg-emerald-500 text-white">
                        <Check className="w-3 h-3 inline mr-1" /> akzeptiert
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">
                      {new Date(a.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{a.body}</p>

                  <div className="mt-2 flex items-center gap-3">
                    {canAccept && !a.isAccepted && (
                      <button
                        onClick={() => start(() => { markAnswerAccepted(a.id); })}
                        disabled={pending}
                        className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> als beste markieren
                      </button>
                    )}
                    {canEditAnswer && (
                      <button
                        onClick={() => {
                          if (confirm("Antwort löschen?")) start(() => { deleteAnswer(a.id); });
                        }}
                        disabled={pending}
                        className="text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {answerList.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500 text-center py-4">Noch keine Antworten — sei die erste!</p>
          </Card>
        )}
      </div>

      <Card>
        <h3 className="font-semibold mb-2">Antworten</h3>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Schreib deine Antwort…"
          className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
        />
        <Button onClick={submitAnswer} disabled={pending || !body.trim()} className="mt-3 w-full">
          <Send className="w-4 h-4" /> Antwort senden
        </Button>
      </Card>
    </>
  );
}
