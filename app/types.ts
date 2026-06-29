export type ActionType =
  | "x"
  | "instagram-posts"
  | "instagram-infographics"
  | "telegram";

export type ActionConfig = {
  id: ActionType;
  label: string;
  description: string;
};

export const ACTIONS: ActionConfig[] = [
  {
    id: "x",
    label: "Posts pour X",
    description: "Générer des posts pour X (Twitter)",
  },
  {
    id: "instagram-posts",
    label: "Posts pour Instagram",
    description: "Générer des posts pour Instagram",
  },
  {
    id: "instagram-infographics",
    label: "Infographies pour Instagram",
    description: "Générer des infographies pour Instagram",
  },
  {
    id: "telegram",
    label: "Post pour Telegram",
    description: "Générer un post pour Telegram",
  },
];

import type { AppErrorCode } from "@/lib/errors";
import type { ParsedArticle } from "@/lib/parseArticle";

export type { ParsedArticle };

export type GenerateResponse = {
  action: ActionType;
  url: string;
  article: ParsedArticle;
  result: string;
  truncated?: boolean;
};

export type ApiErrorBody = {
  code: AppErrorCode;
};

export type TranslateResponse = {
  url: string;
  article: ParsedArticle;
  result: string;
};

export type IllustrationResponse = {
  url: string;
  article: ParsedArticle;
  prompt: string;
  imageDataUrl: string;
  result: string;
  truncated?: boolean;
};

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

export type GenerateAllResponse = {
  url: string;
  article: ParsedArticle;
  results: Record<ResultTabId, TabResult>;
  truncated: boolean;
};
