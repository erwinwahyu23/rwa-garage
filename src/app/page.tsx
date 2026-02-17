import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "MEKANIK") {
    redirect("/mekanik/worklist");
  }

  // Fallback for ADMIN, SUPERADMIN, or others
  redirect("/dashboard");
}
