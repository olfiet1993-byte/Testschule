import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { messages, users, classes, classMembers } from "@/db/schema";
import { and, eq, or, sql, desc, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";

export default async function Inbox() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  // Alle Nachrichten an oder von mir
  const all = await db
    .select()
    .from(messages)
    .where(or(eq(messages.senderId, meId), eq(messages.recipientId, meId)))
    .orderBy(desc(messages.createdAt));

  // Gruppieren nach Konversations-Partner
  type Conv = {
    otherId: string;
    lastBody: string;
    lastAt: Date;
    unread: number;
    lastFromMe: boolean;
  };
  const convMap = new Map<string, Conv>();
  for (const m of all) {
    const otherId = m.senderId === meId ? m.recipientId : m.senderId;
    const existing = convMap.get(otherId);
    const isUnread = m.recipientId === meId && !m.readAt;
    if (!existing) {
      convMap.set(otherId, {
        otherId,
        lastBody: m.body,
        lastAt: new Date(m.createdAt),
        unread: isUnread ? 1 : 0,
        lastFromMe: m.senderId === meId,
      });
    } else if (isUnread) {
      existing.unread++;
    }
  }
  const convs = Array.from(convMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());

  // Partner-Infos
  const partnerIds = convs.map((c) => c.otherId);
  const partners = partnerIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, partnerIds) })
    : [];
  const partnerById = Object.fromEntries(partners.map((p) => [p.id, p]));

  // Mögliche neue Empfänger: Schüler einer Klasse (für Lehrer), Lehrer der eigenen Klassen (für Schüler)
  const potentialRecipients: any[] = [];
  if (session.user.role === "teacher") {
    const myClasses = await db.query.classes.findMany({ where: eq(classes.teacherId, meId) });
    if (myClasses.length > 0) {
      const memberRows = await db.query.classMembers.findMany({
        where: inArray(classMembers.classId, myClasses.map((c) => c.id)),
      });
      const studentIds = Array.from(new Set(memberRows.map((m) => m.userId)));
      if (studentIds.length > 0) {
        const students = await db.query.users.findMany({ where: inArray(users.id, studentIds) });
        potentialRecipients.push(...students);
      }
    }
  } else {
    const myMemberships = await db.query.classMembers.findMany({ where: eq(classMembers.userId, meId) });
    if (myMemberships.length > 0) {
      const teacherClasses = await db.query.classes.findMany({
        where: inArray(classes.id, myMemberships.map((m) => m.classId)),
      });
      const teacherIds = Array.from(new Set(teacherClasses.map((c) => c.teacherId)));
      if (teacherIds.length > 0) {
        const teachers = await db.query.users.findMany({ where: inArray(users.id, teacherIds) });
        potentialRecipients.push(...teachers);
      }
    }
  }
  // Existing Konversations-Partner ausschließen
  const existingIds = new Set(convs.map((c) => c.otherId));
  const newPartners = potentialRecipients.filter((p) => !existingIds.has(p.id) && p.id !== meId);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-sky-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Nachrichten</h1>
          <p className="text-sm text-slate-500">
            {session.user.role === "teacher" ? "Direkter Draht zu deinen Schüler:innen" : "Direkter Draht zu deinen Lehrkräften"}
          </p>
        </div>
      </div>

      {newPartners.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Neue Konversation
          </h3>
          <div className="flex flex-wrap gap-2">
            {newPartners.map((p) => (
              <Link key={p.id} href={`/nachrichten/${p.id}`}>
                <span className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition cursor-pointer text-sm">
                  <Avatar user={p} size={24} />
                  {p.displayName}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {convs.length === 0 ? (
        <Card className="text-center py-8">
          <MessageCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Konversation. Wähle oben eine Person aus.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => {
            const p = partnerById[c.otherId];
            if (!p) return null;
            return (
              <Link key={c.otherId} href={`/nachrichten/${c.otherId}`}>
                <Card className={`!py-3 hover:shadow-md transition cursor-pointer ${c.unread > 0 ? "border-sky-300 bg-sky-50/30 dark:bg-sky-900/20" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Avatar user={p} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold truncate">{p.displayName}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {c.lastAt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {c.lastFromMe && <span className="text-slate-400">Du: </span>}
                        {c.lastBody}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <Badge className="bg-sky-500 text-white">{c.unread}</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
