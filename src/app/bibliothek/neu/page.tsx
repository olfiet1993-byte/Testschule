import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NewContentForm } from "./NewContentForm";

export default async function NewContentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  return (
    <AppShell>
      <NewContentForm />
    </AppShell>
  );
}
