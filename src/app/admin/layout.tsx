import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/sidebar";
import SessionProvider from "@/components/admin/session-provider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider session={session}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar currentUser={session.user} />
        <main style={{ flex: 1, background: "#f2f1ed", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
