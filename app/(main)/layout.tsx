import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch the user with their primary role for display
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { userRoles: { include: { role: true }, take: 1 } },
  });

  const userName = user?.name ?? session.user.name ?? "User";
  const primaryRole = user?.userRoles[0]?.role.name ?? session.user.roles?.[0] ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userName={userName} userRole={primaryRole} />
      <TopBar userName={userName} userRole={primaryRole} />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
