import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteS3Object } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const { id } = await context.params;

  const material = await prisma.learningMaterial.findUnique({ where: { id } });
  if (!material || material.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteS3Object(material.bucket, material.storageKey);
  } catch (error) {
    const maybeStatus = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode;
    const maybeName = (error as { name?: string } | null)?.name;
    if (maybeStatus !== 404 && maybeName !== "NoSuchKey") {
      return NextResponse.json({ error: "Failed to delete S3 object" }, { status: 500 });
    }
  }

  await prisma.learningMaterial.delete({ where: { id: material.id } });

  return NextResponse.json({ ok: true });
}
