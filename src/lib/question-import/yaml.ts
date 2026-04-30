import { parse } from "yaml";

export type ImportedOption = {
  text: string;
  isCorrect: boolean;
};

export type ImportedQuestion = {
  sourceQuestionId?: string;
  title?: string;
  text: string;
  points?: number;
  answerMode: "SINGLE_SELECT" | "MULTI_SELECT";
  feedbackGeneral?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  options: ImportedOption[];
};

export type QuestionImportError = {
  index: number;
  sourceQuestionId?: string;
  message: string;
};

export type ParsedQuestionBank = {
  bankId?: string;
  bankTitle?: string;
  questions: ImportedQuestion[];
  errors: QuestionImportError[];
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return undefined;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

function normalizeOptions(answers: unknown): ImportedOption[] {
  if (!Array.isArray(answers)) return [];

  return answers
    .map((entry) => {
      const answer = isRecord(entry) && isRecord(entry.answer) ? entry.answer : entry;
      if (!isRecord(answer)) return null;

      const text = stringValue(answer.text);
      if (!text) return null;

      return {
        text,
        isCorrect: booleanValue(answer.correct),
      };
    })
    .filter((option): option is ImportedOption => option !== null);
}

function getQuestionPayload(entry: unknown): { type: string; payload: UnknownRecord } | null {
  if (!isRecord(entry)) return null;

  for (const type of ["multiple_answers", "multiple_choice", "question"]) {
    const payload = entry[type];
    if (isRecord(payload)) return { type, payload };
  }

  return null;
}

export function parseYamlQuestionBank(contents: string): ParsedQuestionBank {
  const parsed = parse(contents) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("YAML must contain a top-level object.");
  }

  const bankInfo = isRecord(parsed.bank_info) ? parsed.bank_info : {};
  const rawQuestions = parsed.questions;
  if (!Array.isArray(rawQuestions)) {
    throw new Error("YAML must contain a questions array.");
  }

  const questions: ImportedQuestion[] = [];
  const errors: QuestionImportError[] = [];

  rawQuestions.forEach((entry, index) => {
    const questionPayload = getQuestionPayload(entry);
    if (!questionPayload) {
      errors.push({ index, message: "Question entry is missing a supported question payload." });
      return;
    }

    const { type, payload } = questionPayload;
    const sourceQuestionId = stringValue(payload.id);
    const text = stringValue(payload.text);
    const options = normalizeOptions(payload.answers);
    const correctCount = options.filter((option) => option.isCorrect).length;

    if (!text) {
      errors.push({ index, sourceQuestionId, message: "Question text is required." });
      return;
    }

    if (options.length < 2) {
      errors.push({ index, sourceQuestionId, message: "At least 2 answer choices are required." });
      return;
    }

    if (correctCount < 1) {
      errors.push({ index, sourceQuestionId, message: "At least one answer choice must be correct." });
      return;
    }

    const feedback = isRecord(payload.feedback) ? payload.feedback : {};

    questions.push({
      sourceQuestionId,
      title: stringValue(payload.title),
      text,
      points: numberValue(payload.points),
      answerMode: type === "multiple_answers" || correctCount > 1 ? "MULTI_SELECT" : "SINGLE_SELECT",
      feedbackGeneral: stringValue(feedback.general),
      feedbackCorrect: stringValue(feedback.on_correct),
      feedbackIncorrect: stringValue(feedback.on_incorrect),
      options,
    });
  });

  return {
    bankId: stringValue(bankInfo.bank_id),
    bankTitle: stringValue(bankInfo.title),
    questions,
    errors,
  };
}
