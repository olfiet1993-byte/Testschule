import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSession, buildPublicState } from "@/lib/live/sessions";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const live = getSession(sessionId);
  if (!live) return new Response("Session not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: any) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller closed
        }
      }

      // Initial state
      send(buildPublicState(live));

      // Heartbeat (Keep-Alive)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      const onUpdate = (state: any) => send(state);
      live.events.on("update", onUpdate);

      // Auf Client-Disconnect aufräumen
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        live.events.off("update", onUpdate);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
