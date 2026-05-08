const LOCAL_ENDPOINT_RETRY_COUNT = 3;
const LOCAL_ENDPOINT_INITIAL_RETRY_DELAY_MS = 500;

type RetryableFetchOptions = RequestInit & {
  retryLabel: string;
  retries?: number;
};

export function cleanEnvValue(value: string | undefined, fallback = "") {
  return (value || fallback).replace(/^["']|["']$/g, "").trim();
}

function normalizeLocalEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

export function resolveLocalChatEndpoint(endpoint: string) {
  const normalizedEndpoint = normalizeLocalEndpoint(endpoint);
  return normalizedEndpoint.endsWith("/chat/completions")
    ? normalizedEndpoint
    : `${normalizedEndpoint}/chat/completions`;
}

export function resolveLocalModelsEndpoint(endpoint: string) {
  const normalizedEndpoint = normalizeLocalEndpoint(endpoint);
  const baseEndpoint = normalizedEndpoint.endsWith("/chat/completions")
    ? normalizedEndpoint.slice(0, -"/chat/completions".length)
    : normalizedEndpoint;

  return `${baseEndpoint}/models`;
}

function shouldRetryResponse(response: Response) {
  return response.status === 429 || response.status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLocalEndpointWithRetry(
  endpoint: string,
  { retryLabel, retries = LOCAL_ENDPOINT_RETRY_COUNT, ...init }: RetryableFetchOptions
) {
  let response: Response | null = null;
  let lastError: unknown = null;
  let delayMs = LOCAL_ENDPOINT_INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      response = await fetch(endpoint, init);
      if (response.ok || !shouldRetryResponse(response) || attempt === retries) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
    }

    console.warn(`${retryLabel} failed, retrying in ${delayMs}ms... (Attempt ${attempt + 1}/${retries})`);
    await wait(delayMs);
    delayMs *= 2;
  }

  if (response) {
    return response;
  }

  throw lastError instanceof Error ? lastError : new Error(`${retryLabel} failed`);
}
