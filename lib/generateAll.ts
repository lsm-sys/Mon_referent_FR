import type { ActionType } from "@/app/types";
import { formatArticleSource } from "@/lib/formatArticle";
import {
  generateInfographicsForInstagram,
  generatePostForTelegram,
  generatePostsForInstagram,
  generatePostsForX,
} from "@/lib/generateContent";
import { generateIllustration } from "@/lib/generateIllustration";
import type { AppErrorCode } from "@/lib/errors";
import { resolveAppError } from "@/lib/errors";
import type { ParsedArticle } from "@/lib/parseArticle";

export type ResultTabId = ActionType | "illustration";

export type TabSuccessResult = {
  ok: true;
  result: string;
  truncated: boolean;
  imageDataUrl?: string;
};

export type TabErrorResult = {
  ok: false;
  code: AppErrorCode;
};

export type TabResult = TabSuccessResult | TabErrorResult;

export type GenerateAllResults = Record<ResultTabId, TabResult>;

const TEXT_ACTIONS: ActionType[] = [
  "x",
  "instagram-posts",
  "instagram-infographics",
  "telegram",
];

async function runTextAction(
  action: ActionType,
  article: ParsedArticle,
  sourceUrl: string,
): Promise<TabResult> {
  try {
    const generators: Record<
      ActionType,
      (
        article: ParsedArticle,
        sourceUrl: string,
      ) => Promise<{ content: string; truncated: boolean }>
    > = {
      x: generatePostsForX,
      "instagram-posts": generatePostsForInstagram,
      "instagram-infographics": generateInfographicsForInstagram,
      telegram: generatePostForTelegram,
    };

    const { content, truncated } = await generators[action](article, sourceUrl);

    return {
      ok: true,
      result: content,
      truncated,
    };
  } catch (error) {
    return { ok: false, code: resolveAppError(error).code };
  }
}

async function runIllustration(
  article: ParsedArticle,
  sourceUrl: string,
): Promise<TabResult> {
  try {
    const illustration = await generateIllustration(article, sourceUrl);

    return {
      ok: true,
      result: illustration.result,
      truncated: illustration.truncated,
      imageDataUrl: illustration.imageDataUrl,
    };
  } catch (error) {
    return { ok: false, code: resolveAppError(error).code };
  }
}

export async function generateAllContent(
  article: ParsedArticle,
  sourceUrl: string,
): Promise<{ results: GenerateAllResults; truncated: boolean }> {
  const { truncated } = formatArticleSource(article);

  const textResults = await Promise.all(
    TEXT_ACTIONS.map(async (action) => ({
      action,
      result: await runTextAction(action, article, sourceUrl),
    })),
  );

  const illustrationResult = await runIllustration(article, sourceUrl);

  const results = {} as GenerateAllResults;

  for (const { action, result } of textResults) {
    results[action] = result;
  }

  results.illustration = illustrationResult;

  return { results, truncated };
}

export const RESULT_TABS: Array<{ id: ResultTabId; label: string }> = [
  { id: "x", label: "X" },
  { id: "instagram-posts", label: "Instagram" },
  { id: "instagram-infographics", label: "Infographies" },
  { id: "telegram", label: "Telegram" },
  { id: "illustration", label: "Illustration" },
];
