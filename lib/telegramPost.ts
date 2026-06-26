import {
  TELEGRAM_MAX_WORDS,
  TELEGRAM_MIN_WORDS,
} from "@/lib/prompts/telegramPost";

export type ParsedTelegramPost = {
  content: string;
  wordCount: number;
  wordCountNote: string | null;
  sourceUrl: string;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getWordCountNote(wordCount: number): string | null {
  if (wordCount < TELEGRAM_MIN_WORDS) {
    return `${wordCount} mots (recommande : ${TELEGRAM_MIN_WORDS}-${TELEGRAM_MAX_WORDS})`;
  }
  if (wordCount > TELEGRAM_MAX_WORDS) {
    return `${wordCount} mots (recommande : ${TELEGRAM_MIN_WORDS}-${TELEGRAM_MAX_WORDS})`;
  }
  return null;
}

export function buildSourceLine(sourceUrl: string): string {
  return `Source : ${sourceUrl}`;
}

function stripExistingSourceBlock(content: string, sourceUrl: string): string {
  let cleaned = content.trim();

  cleaned = cleaned.replace(/\n*Source\s*:\s*[^\n]*/gi, "").trim();
  cleaned = cleaned.replace(
    new RegExp(`\\n*${escapeRegex(sourceUrl)}\\s*$`, "i"),
    "",
  ).trim();

  return cleaned;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function appendSourceLink(content: string, sourceUrl: string): string {
  const body = stripExistingSourceBlock(content, sourceUrl);
  const sourceLine = buildSourceLine(sourceUrl);

  if (!body) {
    return sourceLine;
  }

  return `${body}\n\n${sourceLine}`;
}

export function parseTelegramPostResponse(
  raw: string,
  sourceUrl: string,
): ParsedTelegramPost {
  const content = appendSourceLink(raw, sourceUrl);
  const wordCount = countWords(content);

  return {
    content,
    wordCount,
    wordCountNote: getWordCountNote(wordCount),
    sourceUrl,
  };
}

export function formatTelegramPostOutput(post: ParsedTelegramPost): string {
  const header = post.wordCountNote
    ? `Post Telegram (${post.wordCountNote})`
    : `Post Telegram (${post.wordCount} mots)`;

  return `${header}\n\n${post.content}`;
}

export function validateTelegramPost(post: ParsedTelegramPost): string | null {
  if (!post.content.trim()) {
    return "Le post Telegram est vide.";
  }

  if (!post.content.includes(post.sourceUrl)) {
    return "Le post Telegram doit contenir le lien vers la source.";
  }

  if (!post.content.trimEnd().endsWith(post.sourceUrl)) {
    return "Le lien source doit apparaitre a la fin du post.";
  }

  if (post.wordCount < 200) {
    return `Le post Telegram est trop court (${post.wordCount} mots).`;
  }

  return null;
}
