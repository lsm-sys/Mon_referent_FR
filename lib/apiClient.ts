import type {
  GenerateAllResponse,
  ResultTabId,
  TabResult,
} from "@/app/types";
import type { AppErrorCode } from "@/lib/errors";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

type ApiJson = Record<string, unknown>;

export async function readApiResponse(response: Response): Promise<ApiJson> {
  try {
    return (await response.json()) as ApiJson;
  } catch {
    return {};
  }
}

export function getApiErrorCode(data: ApiJson): AppErrorCode {
  if (typeof data.code === "string" && data.code in ERROR_MESSAGES) {
    return data.code as AppErrorCode;
  }

  return "UNKNOWN";
}

export type GenerateApiResult =
  | { ok: true; result: string; truncated: boolean }
  | { ok: false; code: AppErrorCode };

export type IllustrationApiResult =
  | {
      ok: true;
      result: string;
      prompt: string;
      imageDataUrl: string;
      truncated: boolean;
    }
  | { ok: false; code: AppErrorCode };

export async function requestGenerate(
  url: string,
  action: string,
): Promise<GenerateApiResult> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, action }),
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      return { ok: false, code: getApiErrorCode(data) };
    }

    if (typeof data.result !== "string") {
      return { ok: false, code: "UNKNOWN" };
    }

    return {
      ok: true,
      result: data.result,
      truncated: Boolean(data.truncated),
    };
  } catch {
    return { ok: false, code: "UNKNOWN" };
  }
}

export type GenerateAllApiResult =
  | {
      ok: true;
      results: Record<ResultTabId, TabResult>;
      truncated: boolean;
    }
  | { ok: false; code: AppErrorCode };

function isTabResult(value: unknown): value is TabResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.ok === true) {
    return typeof record.result === "string";
  }

  if (record.ok === false) {
    return typeof record.code === "string";
  }

  return false;
}

export async function requestGenerateAll(
  url: string,
): Promise<GenerateAllApiResult> {
  try {
    const response = await fetch("/api/generate-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      return { ok: false, code: getApiErrorCode(data) };
    }

    const results = data.results as GenerateAllResponse["results"] | undefined;

    if (!results || typeof results !== "object") {
      return { ok: false, code: "UNKNOWN" };
    }

    const tabIds: ResultTabId[] = [
      "x",
      "instagram-posts",
      "instagram-infographics",
      "telegram",
      "illustration",
    ];

    for (const tabId of tabIds) {
      if (!isTabResult(results[tabId])) {
        return { ok: false, code: "UNKNOWN" };
      }
    }

    return {
      ok: true,
      results,
      truncated: Boolean(data.truncated),
    };
  } catch {
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function requestIllustration(
  url: string,
): Promise<IllustrationApiResult> {
  try {
    const response = await fetch("/api/illustrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await readApiResponse(response);

    if (!response.ok) {
      return { ok: false, code: getApiErrorCode(data) };
    }

    if (
      typeof data.result !== "string" ||
      typeof data.prompt !== "string" ||
      typeof data.imageDataUrl !== "string"
    ) {
      return { ok: false, code: "UNKNOWN" };
    }

    return {
      ok: true,
      result: data.result,
      prompt: data.prompt,
      imageDataUrl: data.imageDataUrl,
      truncated: Boolean(data.truncated),
    };
  } catch {
    return { ok: false, code: "UNKNOWN" };
  }
}
