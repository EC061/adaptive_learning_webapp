import { NextResponse } from "next/server";
import {
  cleanEnvValue,
  fetchLocalEndpointWithRetry,
  resolveLocalModelsEndpoint,
} from "../local";

type LocalModelEntry = {
  id?: unknown;
  name?: unknown;
  model?: unknown;
};

function readModelId(entry: unknown) {
  if (typeof entry === "string") {
    return entry.trim();
  }

  if (!entry || typeof entry !== "object") {
    return "";
  }

  const model = entry as LocalModelEntry;
  const id = model.id ?? model.name ?? model.model;
  return typeof id === "string" ? id.trim() : "";
}

function normalizeModelIds(value: unknown) {
  const rawModels = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)
      ? (value as { data: unknown[] }).data
      : [];

  return Array.from(new Set(rawModels.map(readModelId).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const localEndpoint = cleanEnvValue(process.env.LOCAL_API_ENDPOINT);
  const apiKey = cleanEnvValue(process.env.LOCAL_API_TOKEN);

  if (!localEndpoint) {
    return NextResponse.json({ error: "Local chat endpoint is not configured" }, { status: 503 });
  }

  try {
    const response = await fetchLocalEndpointWithRetry(resolveLocalModelsEndpoint(localEndpoint), {
      method: "GET",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      retryLabel: "local models request",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load local models" },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json({ models: normalizeModelIds(data) });
  } catch (error) {
    console.error("Local models error:", error);
    return NextResponse.json({ error: "Failed to load local models" }, { status: 503 });
  }
}
