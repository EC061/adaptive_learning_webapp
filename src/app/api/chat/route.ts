import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cleanEnvValue,
  fetchLocalEndpointWithRetry,
  resolveLocalChatEndpoint,
} from "./local";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatMode = "chat" | "quiz-review";
type ChatProvider = "openai" | "local";

function resolveChatProvider(value: unknown): ChatProvider {
  return value === "local" ? "local" : "openai";
}

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
  const incorrectAnswers = attempt.answers.filter((answer) => !answer.isCorrect);
  const correctAnswerCount = attempt.answers.length - incorrectAnswers.length;
  const lines = [
    "You are an educational assistant reviewing a student's latest completed quiz attempt.",
    "Write a concise markdown response directly to the student.",
    "Do not review the quiz question by question.",
    "Summarize the student's main misconceptions or learning gaps across the attempt.",
    "Use exactly three short sections titled Summary, Main Misconceptions, and Next Steps.",
    "Keep the full response under 120 words.",
    "Under Main Misconceptions, use at most 2 bullet points.",
    "Under Next Steps, use at most 2 bullet points.",
    "Only mention a specific question if it is essential evidence for a broader misconception.",
    "",
    `Class: ${attempt.class.name}`,
    `Topic: ${attempt.subtopic.topic.name}`,
    `Module: ${attempt.subtopic.name}`,
    `Score: ${attempt.score ?? 0}%`,
    `Completed at: ${attempt.completedAt?.toISOString() ?? "Unknown"}`,
    `Questions answered: ${attempt.answers.length}`,
    `Correct answers: ${correctAnswerCount}`,
    `Incorrect answers: ${incorrectAnswers.length}`,
    "",
    incorrectAnswers.length > 0
      ? "Evidence from incorrect answers:"
      : "The student answered every question correctly. Reinforce what they understood and suggest one useful next step.",
  ];

  incorrectAnswers.forEach((answer, index) => {
    const correctOptions = answer.question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.text);

    lines.push(
      `${index + 1}. Question: ${answer.question.text}`,
      `   Student selection: ${answer.selectedOption?.text ?? "No answer selected"}`,
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

async function sendChatCompletion(
  messages: ChatMessage[],
  options?: {
    maxCompletionTokens?: number;
    model?: string;
    provider?: ChatProvider;
  }
) {
  const provider = options?.provider ?? "openai";
  const isLocalProvider = provider === "local";
  const apiKey = isLocalProvider
    ? cleanEnvValue(process.env.LOCAL_API_TOKEN)
    : cleanEnvValue(process.env.OPENAI_API_KEY);
  const model = isLocalProvider
    ? options?.model?.trim() ?? ""
    : cleanEnvValue(process.env.OPENAI_MODEL, "gpt-5.4");
  const serviceTier = cleanEnvValue(process.env.OPENAI_SERVICE_TIER, "flex");
  const localEndpoint = cleanEnvValue(process.env.LOCAL_API_ENDPOINT);
  const endpoint = isLocalProvider
    ? (localEndpoint ? resolveLocalChatEndpoint(localEndpoint) : "")
    : "https://api.openai.com/v1/chat/completions";

  if (!isLocalProvider && !apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return NextResponse.json({ error: "OpenAI integration is currently unavailable" }, { status: 503 });
  }

  if (isLocalProvider && !endpoint) {
    console.error("LOCAL_API_ENDPOINT is not set");
    return NextResponse.json({ error: "Local chat integration is currently unavailable" }, { status: 503 });
  }

  if (isLocalProvider && !model) {
    return NextResponse.json({ error: "A local model selection is required" }, { status: 400 });
  }

  const payload: {
    model: string;
    messages: ChatMessage[];
    temperature: number;
    stream: boolean;
    stream_options?: { include_usage: true };
    max_completion_tokens?: number;
    max_tokens?: number;
    service_tier?: string;
  } = {
    model,
    messages,
    temperature: 0.7,
    stream: true,
  };

  if (!isLocalProvider && (serviceTier === "auto" || serviceTier === "default" || serviceTier === "flex")) {
    payload.service_tier = serviceTier;
    payload.stream_options = { include_usage: true };
  }

  if (options?.maxCompletionTokens) {
    if (isLocalProvider) {
      payload.max_tokens = options.maxCompletionTokens;
    } else {
      payload.max_completion_tokens = options.maxCompletionTokens;
    }
  }

  let response: Response | null = null;
  let attempt = 0;
  const maxRetries = !isLocalProvider && serviceTier === "flex" ? 3 : 0;
  let baseDelay = 1000;
  let lastErrorData: unknown = null;

  const requestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  };

  if (isLocalProvider) {
    try {
      response = await fetchLocalEndpointWithRetry(endpoint, {
        ...requestInit,
        retryLabel: "local chat request",
      });
    } catch {
      lastErrorData = { error: { message: "Network or fetch error" } };
    }
  } else {
    while (attempt <= maxRetries) {
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
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
        console.warn(`${provider} chat request failed, retrying in ${baseDelay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, baseDelay));
        baseDelay *= 2;
      }
    }
  }

  if (isLocalProvider && response && !response.ok) {
    try {
      lastErrorData = await response.json();
    } catch {
      lastErrorData = { error: { message: "Unknown local chat error" } };
    }
  }

  if (!response || !response.ok) {
    console.error(`${provider} chat error:`, lastErrorData);
    return NextResponse.json(
      { error: `Failed to communicate with ${isLocalProvider ? "local chat endpoint" : "OpenAI"}` },
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
    const provider = resolveChatProvider(body?.provider);
    const model = typeof body?.model === "string" ? body.model.trim() : "";
    const messages = body?.messages;

    if (!isChatMessageArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 });
    }

    const resolved = await buildMessages(mode, messages);
    if (mode === "quiz-review" && !resolved.autoReviewAvailable) {
      return new Response(null, { status: 204 });
    }

    return sendChatCompletion(resolved.messages, {
      maxCompletionTokens: mode === "quiz-review" ? 180 : undefined,
      model,
      provider,
    });
  } catch (error) {
    console.error("Error handling chat request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
