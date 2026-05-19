import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { HostView } from "./HostView";
import { getSession, buildPublicState } from "@/lib/live/sessions";

export default async function HostLivePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const live = getSession(sessionId);
  if (!live) notFound();
  if (live.hostId !== session.user.id) notFound();

  const initialState = buildPublicState(live);

  return (
    <AppShell>
      <HostView initialState={initialState} sessionId={sessionId} />
    </AppShell>
  );
}
