import { NextResponse } from "next/server";
import { createApiErrorResponse, resolveAppError } from "@/lib/errors";
import { generateAllContent } from "@/lib/generateAll";
import { parseArticleFromUrl } from "@/lib/parseArticle";

export const runtime = "nodejs";
export const maxDuration = 300;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim() ?? "";

    if (!url) {
      return createApiErrorResponse("MISSING_URL", 400);
    }

    if (!isValidUrl(url)) {
      return createApiErrorResponse("INVALID_URL", 400);
    }

    const article = await parseArticleFromUrl(url);

    if (!article.title && !article.content) {
      return createApiErrorResponse("ARTICLE_PARSE_FAILED", 422);
    }

    const { results, truncated } = await generateAllContent(article, url);

    const hasSuccess = Object.values(results).some((result) => result.ok);

    if (!hasSuccess) {
      const firstError = Object.values(results).find(
        (result) => !result.ok,
      );

      return createApiErrorResponse(
        firstError && !firstError.ok ? firstError.code : "UNKNOWN",
        502,
      );
    }

    return NextResponse.json({
      url,
      article,
      results,
      truncated,
    });
  } catch (error) {
    console.error("[generate-all]", error);
    const appError = resolveAppError(error);
    return createApiErrorResponse(appError.code, appError.status);
  }
}
