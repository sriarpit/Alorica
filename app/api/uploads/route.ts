import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FileUploadType } from "@prisma/client";

// Max 10 MB
const MAX_SIZE = 10 * 1024 * 1024;

// General document/attachment allowed extensions
const ALLOWED_EXTS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".png", ".jpg", ".jpeg",
  ".zip",
]);

// Milestone site images: images only
const MILESTONE_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const capExRequestId = formData.get("capExRequestId") as string | null;
  const sectionId = formData.get("sectionId") as string | null;
  const secondaryId = formData.get("secondaryId") as string | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!capExRequestId) {
    return Response.json({ error: "capExRequestId is required" }, { status: 400 });
  }
  if (!sectionId) {
    return Response.json({ error: "sectionId is required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const ext = extname(file.name).toLowerCase();
  const isSiteImage = sectionId === "MilestoneActivitesImageFileUpload";
  const allowedSet = isSiteImage ? MILESTONE_IMAGE_EXTS : ALLOWED_EXTS;
  if (!allowedSet.has(ext)) {
    const allowed = isSiteImage ? "PNG, JPG, JPEG" : "PDF, DOCX, XLSX, PNG, JPG, ZIP";
    return Response.json({ error: `File type ${ext} is not allowed. Allowed: ${allowed}` }, { status: 415 });
  }

  // Build safe storage path: /public/uploads/[capExRequestId]/[sectionId]/[timestamp]-[filename]
  const safeSection = sectionId ? sectionId.replace(/[^a-zA-Z0-9_-]/g, "") : "general";
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${timestamp}-${safeName}`;

  const uploadDir = join(process.cwd(), "public", "uploads", capExRequestId, safeSection);
  await mkdir(uploadDir, { recursive: true });

  const filePath = join(uploadDir, storedName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // Relative URL for serving
  const fileUrl = `/uploads/${capExRequestId}/${safeSection}/${storedName}`;

  const attachment = await db.capexAttachment.create({
    data: {
      capExRequestId,
      fileName: file.name,
      fileContent: fileUrl,
      sectionId: sectionId as FileUploadType,
      secondaryId: secondaryId ?? undefined,
    },
  });

  return Response.json(
    { id: attachment.id, fileName: attachment.fileName, fileContent: fileUrl },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const capExRequestId = searchParams.get("capExRequestId");
  const sectionId = searchParams.get("sectionId");

  if (!capExRequestId) {
    return Response.json({ error: "capExRequestId is required" }, { status: 400 });
  }

  const attachments = await db.capexAttachment.findMany({
    where: {
      capExRequestId,
      ...(sectionId ? { sectionId: sectionId as FileUploadType } : {}),
    },
    orderBy: { id: "desc" },
  });

  return Response.json(attachments);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const attachment = await db.capexAttachment.findUnique({ where: { id } });
  if (!attachment) return Response.json({ error: "Not found" }, { status: 404 });

  // Remove from disk (best-effort)
  try {
    const { unlink } = await import("fs/promises");
    const diskPath = join(process.cwd(), "public", attachment.fileContent ?? "");
    await unlink(diskPath);
  } catch {
    // File may already be gone — continue
  }

  await db.capexAttachment.delete({ where: { id } });
  return Response.json({ ok: true });
}
