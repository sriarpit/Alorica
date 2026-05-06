import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email/mailer";
import { newUserEmail } from "@/lib/email/templates";

export async function GET() {
  const users = await db.user.findMany({
    include: { userRoles: { include: { role: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, username, email, mobilePhone, password, roleIds } = body;

  if (!name || !username || !email || !password) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await db.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return Response.json({ error: "Username or email already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      username,
      email,
      mobilePhone: mobilePhone || null,
      password: hashed,
      isActive: true,
      userRoles: roleIds?.length
        ? { create: (roleIds as number[]).map((roleId) => ({ roleId })) }
        : undefined,
    },
    include: { userRoles: { include: { role: true } } },
  });

  // Send welcome email (fire-and-forget — don't block response)
  sendEmail(newUserEmail({ to: user.email, name: user.name, username: user.username })).catch(
    () => {}
  );

  return Response.json(user, { status: 201 });
}
