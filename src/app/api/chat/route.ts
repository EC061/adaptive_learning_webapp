import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatMode = "chat" | "quiz-review";

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every((message) => {
    if (!message || typeof message !== "object") return false;
    const entry = message as { role?: unknown; content?: unknown };
    return (
      (entry.role === "system" || entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string"
    );
  });
}

function buildQuizReviewPrompt(attempt: {
  score: number | null;
  completedAt: Date | null;
  class: { name: string };
  subtopic: { name: string; topic: { name: string } };
  answers: Array<{
    isCorrect: boolean;
    selectedOption: { text: string } | null;
    question: {
      text: string;
      options: Array<{ text: string; isCorrect: boolean }>;
    };
  }>;
}) {
  const lines = [
    "You are an educational assistant reviewing a student's latest completed quiz attempt.",
    "Provide a clean, readable response directly to the student.",
    "Start with a short summary of how they did.",
    "Then include sections titled Main Errors, Possible Misconceptions, and Next Steps.",
    "Focus on teaching and explanation, not just giving an answer key.",
    "Use the student's answers as evidence for your analysis.",
    "",
    `Class: ${attempt.class.name}`,
    `Topic: ${attempt.subtopic.topic.name}`,
    `Module: ${attempt.subtopic.name}`,
    `Score: ${attempt.score ?? 0}%`,
    `Completed at: ${attempt.completedAt?.toISOString() ?? "Unknown"}`,
    "",
    "Quiz attempt details:",
  ];

  attempt.answers.forEach((answer, index) => {
    const correctOptions = answer.question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.text);

    lines.push(
      `${index + 1}. Question: ${answer.question.text}`,
      `   Student selection: ${answer.selectedOption?.text ?? "No answer selected"}`,
      `   Result: ${answer.isCorrect ? "Correct" : "Incorrect"}`,
      `   Correct answer: ${correctOptions.length > 0 ? correctOptions.join(" | ") : "Unknown"}`
    );
  });

  return lines.join("\n");
}

async function buildMessages(mode: ChatMode, messages: ChatMessage[]) {
  const session = await auth();
  const isStudent = session?.user?.role === "STUDENT";

  if (mode !== "quiz-review") {
    return { messages, autoReviewAvailable: false };
  }

  if (!isStudent || !session?.user?.id) {
    return { messages: [], autoReviewAvailable: false };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    return { messages: [], autoReviewAvailable: false };
  }

  const latestAttempt = await prisma.quizAttempt.findFirst({
    where: {
      studentId: student.id,
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    include: {
      class: { select: { name: true } },
      subtopic: {
        select: {
          name: true,
          topic: { select: { name: true } },
        },
      },
      answers: {
        include: {
          selectedOption: { select: { text: true } },
          question: {
            select: {
              text: true,
              options: { select: { text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });

  if (!latestAttempt || latestAttempt.answers.length === 0) {
    return { messages: [], autoReviewAvailable: false };
  }

  return {
    messages: [
      {
        role: "user" as const,
        content: buildQuizReviewPrompt(latestAttempt),
      },
    ],
    autoReviewAvailable: true,
  };
}

async function sendChatCompletion(messages: ChatMessage[]) {
  const rawApiKey = process.env.OPENAI_API_KEY || "";
  const apiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

  const rawModel = process.env.OPENAI_MODEL || "gpt-5.4";
  const model = rawModel.replace(/^["']|["']$/g, "").trim();

  const rawServiceTier = process.env.OPENAI_SERVICE_TIER || "flex";
  const serviceTier = rawServiceTier.replace(/^["']|["']$/g, "").trim();

  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return NextResponse.json({ error: "OpenAI integration is currently unavailable" }, { status: 503 });
  }

  const payload: {
    model: string;
    messages: ChatMessage[];
    temperature: number;
    stream: boolean;
    stream_options: { include_usage: true };
    service_tier?: string;
  } = {
    model,
    messages,
    temperature: 0.7,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (serviceTier === "auto" || serviceTier === "default" || serviceTier === "flex") {
    payload.service_tier = serviceTier;
  }

  let response: Response | null = null;
  let attempt = 0;
  const maxRetries = serviceTier === "flex" ? 3 : 0;
  let baseDelay = 1000;
  let lastErrorData: unknown = null;

  while (attempt <= maxRetries) {
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        break;
      }

      lastErrorData = await response.json();

      if (response.status !== 429 && response.status < 500) {
        break;
      }
    } catch {
      lastErrorData = { error: { message: "Network or fetch error" } };
    }

    attempt++;
    if (attempt <= maxRetries) {
      console.warn(`OpenAI request failed, retrying in ${baseDelay}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, baseDelay));
      baseDelay *= 2;
    }
  }

  if (!response || !response.ok) {
    console.error("OpenAI error:", lastErrorData);
    return NextResponse.json(
      { error: "Failed to communicate with OpenAI" },
      { status: response ? response.status : 500 }
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body?.mode === "quiz-review" ? "quiz-review" : "chat";
    const messages = body?.messages;

    if (!isChatMessageArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 });
    }

    const resolved = await buildMessages(mode, messages);
    if (mode === "quiz-review" && !resolved.autoReviewAvailable) {
      return new Response(null, { status: 204 });
    }

    return sendChatCompletion(resolved.messages);
  } catch (error) {
    console.error("Error handling chat request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
