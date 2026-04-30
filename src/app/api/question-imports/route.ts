import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYamlQuestionBank, QuestionImportError } from "@/lib/question-import/yaml";

export const runtime = "nodejs";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function cleanFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isYamlFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".yaml") || lower.endsWith(".yml");
}

function serializeErrors(errors: QuestionImportError[]) {
  return errors.map((error) => ({
    index: error.index,
    ...(error.sourceQuestionId ? { sourceQuestionId: error.sourceQuestionId } : {}),
    message: error.message,
  }));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const topicId = cleanFormValue(formData.get("topicId"));
  const subtopicId = cleanFormValue(formData.get("subtopicId"));
  const sourcePath = cleanFormValue(formData.get("sourcePath")) || null;
  const file = formData.get("file");

  if (!topicId || !subtopicId) {
    return NextResponse.json({ error: "topicId and subtopicId are required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A YAML file is required." }, { status: 400 });
  }

  if (!isYamlFilename(file.name)) {
    return NextResponse.json({ error: "Only .yaml and .yml files are supported." }, { status: 400 });
  }

  if (file.size < 1 || file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json({ error: `File size must be between 1 byte and ${MAX_IMPORT_BYTES} bytes.` }, { status: 400 });
  }

  const subtopic = await prisma.subtopic.findUnique({ where: { id: subtopicId } });
  if (!subtopic || subtopic.topicId !== topicId) {
    return NextResponse.json({ error: "Selected module does not belong to the selected topic." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseYamlQuestionBank(await file.text());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse YAML file." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const questionImport = await tx.questionImport.create({
      data: {
        teacherId: teacher.id,
        topicId,
        subtopicId,
        originalName: file.name,
        sourcePath,
        bankId: parsed.bankId,
        bankTitle: parsed.bankTitle,
        importedCount: 0,
        skippedCount: 0,
        errorCount: parsed.errors.length,
        errors: serializeErrors(parsed.errors),
      },
    });

    let importedCount = 0;
    let skippedCount = 0;
    const errors: QuestionImportError[] = [...parsed.errors];

    for (const question of parsed.questions) {
      const duplicate = await tx.question.findFirst({
        where: {
          topicId,
          subtopicId,
          createdById: teacher.id,
          ...(question.sourceQuestionId ? { sourceQuestionId: question.sourceQuestionId } : { text: question.text }),
          import: {
            is: {
              teacherId: teacher.id,
              originalName: file.name,
              sourcePath,
            },
          },
        },
      });

      if (duplicate) {
        skippedCount += 1;
        continue;
      }

      await tx.question.create({
        data: {
          title: question.title,
          text: question.text,
          topicId,
          subtopicId,
          difficultyLevel: "BEGINNER",
          answerMode: question.answerMode,
          points: question.points,
          feedbackGeneral: question.feedbackGeneral,
          feedbackCorrect: question.feedbackCorrect,
          feedbackIncorrect: question.feedbackIncorrect,
          sourceQuestionId: question.sourceQuestionId,
          importId: questionImport.id,
          createdById: teacher.id,
          options: {
            create: question.options,
          },
        },
      });
      importedCount += 1;
    }

    const status = importedCount > 0 || skippedCount > 0 ? "COMPLETED" : "FAILED";
    await tx.questionImport.update({
      where: { id: questionImport.id },
      data: {
        status,
        importedCount,
        skippedCount,
        errorCount: errors.length,
        errors: serializeErrors(errors),
      },
    });

    return {
      importId: questionImport.id,
      status,
      bankId: parsed.bankId,
      bankTitle: parsed.bankTitle,
      importedCount,
      skippedCount,
      errorCount: errors.length,
      errors,
    };
  });

  return NextResponse.json(result, { status: 201 });
}
