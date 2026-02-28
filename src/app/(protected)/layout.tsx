import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Allow tests to bypass auth when PLAYWRIGHT=1
  let session = null as any;
  if (process.env.PLAYWRIGHT === '1' || process.env.NODE_ENV === 'test') {
    session = { user: { id: 'e2e', name: 'E2E User', email: 'e2e@example.com', role: 'ADMIN' } } as any;
  } else {
    session = await getServerSession(authOptions);
  }

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen print:h-auto">
      <div className="hidden md:flex">
        <Sidebar role={session.user.role} />
      </div>
      <div id="main-scroll-container" className="flex flex-1 flex-col overflow-y-auto print:overflow-visible h-screen print:h-auto relative scroll-smooth">
        <Topbar user={session.user} />
        <main className="flex-1 p-6 print:p-0 bg-slate-50 print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
