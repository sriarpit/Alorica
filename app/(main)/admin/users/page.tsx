import { db } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  const [users, roles] = await Promise.all([
    db.user.findMany({
      include: { userRoles: { include: { role: true } } },
      orderBy: { creationDate: "desc" },
    }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminUsersClient
      initialUsers={users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        mobilePhone: u.mobilePhone ?? null,
        isActive: u.isActive,
        creationDate: u.creationDate.toISOString(),
        roles: u.userRoles.map((ur) => ({ id: ur.roleId, name: ur.role.name })),
      }))}
      allRoles={roles.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}
