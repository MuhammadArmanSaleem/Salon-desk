import { redirect } from "next/navigation";
import { staffSession } from "@/lib/auth";
import { configured } from "@/lib/supabase/server";
import Portal from "@/components/portal";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (!configured()) redirect("/login");
  const session = await staffSession();
  if (!session) redirect("/login");
  return <Portal profile={session.profile} />;
}
