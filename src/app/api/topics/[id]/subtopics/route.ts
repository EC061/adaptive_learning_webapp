import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subtopics = await prisma.subtopic.findMany({
    where: { topicId: params.id },
    include: { _count: { select: { questions: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(subtopics);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
  const { name, order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Subtopic name required." }, { status: 400 });

  const subtopic = await prisma.subtopic.create({
    data: { name: name.trim(), order: order ?? 0, topicId: params.id, createdById: teacher?.id },
  });
  return NextResponse.json(subtopic, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtopicId, name, order } = await req.json();
  const updated = await prisma.subtopic.update({
    where: { id: subtopicId, topicId: params.id },
    data: { name: name?.trim(), order },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subtopicId } = await req.json();
  await prisma.subtopic.delete({ where: { id: subtopicId, topicId: params.id } });
  return NextResponse.json({ success: true });
}
