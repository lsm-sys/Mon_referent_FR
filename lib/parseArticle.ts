import * as cheerio from "cheerio";

export type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

const CONTENT_SELECTORS = [
  "article",
  '[role="article"]',
  ".post-content",
  ".article-content",
  ".entry-content",
  ".article-body",
  ".post-body",
  ".post",
  ".content",
  "main",
];

const DATE_SELECTORS = [
  "time[datetime]",
  "time",
  ".date",
  ".published",
  ".post-date",
  '[class*="publish"]',
  '[class*="date"]',
];

const NOISE_SELECTORS =
  "script, style, noscript, nav, footer, header, aside, iframe, form, .share, .social, .comments, .related, .advertisement, .ad";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractJsonLdDate(html: string): string | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]) as unknown;
      const date = findDateInJsonLd(data);
      if (date) return date;
    } catch {
      continue;
    }
  }

  return null;
}

function findDateInJsonLd(data: unknown): string | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const date = findDateInJsonLd(item);
      if (date) return date;
    }
    return null;
  }

  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const candidates = ["datePublished", "dateCreated", "uploadDate", "dateModified"];

  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if ("@graph" in record) {
    return findDateInJsonLd(record["@graph"]);
  }

  return null;
}

function extractMetaContent(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().attr("content") ?? "");
    if (value) return value;
  }
  return null;
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const ogTitle = extractMetaContent($, ['meta[property="og:title"]']);
  if (ogTitle) return ogTitle;

  const articleHeading = normalizeText($("article h1").first().text());
  if (articleHeading) return articleHeading;

  const pageHeading = normalizeText($("h1").first().text());
  if (pageHeading) return pageHeading;

  const documentTitle = normalizeText($("title").first().text());
  return documentTitle || null;
}

function extractDate($: cheerio.CheerioAPI, html: string): string | null {
  const metaDate = extractMetaContent($, [
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[name="publish-date"]',
    'meta[itemprop="datePublished"]',
  ]);
  if (metaDate) return metaDate;

  const timeDatetime = $("time[datetime]").first().attr("datetime");
  if (timeDatetime?.trim()) return timeDatetime.trim();

  for (const selector of DATE_SELECTORS) {
    const element = $(selector).first();
    const datetime = element.attr("datetime");
    if (datetime?.trim()) return datetime.trim();

    const text = normalizeText(element.text());
    if (text) return text;
  }

  return extractJsonLdDate(html);
}

function extractContent($: cheerio.CheerioAPI): string | null {
  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (!element.length) continue;

    const clone = element.clone();
    clone.find(NOISE_SELECTORS).remove();

    const text = normalizeText(clone.text());
    if (text.length >= 100) return text;
  }

  const body = $("body").clone();
  body.find(NOISE_SELECTORS).remove();
  const fallback = normalizeText(body.text());

  return fallback.length >= 50 ? fallback : null;
}

export function parseArticleHtml(html: string): ParsedArticle {
  const $ = cheerio.load(html);

  return {
    date: extractDate($, html),
    title: extractTitle($),
    content: extractContent($),
  };
}

export async function fetchArticleHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MonReferentFR/1.0; +https://github.com/lsm-sys/Mon_referent_FR)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Impossible de charger la page (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("La reponse ne contient pas de HTML.");
  }

  return response.text();
}

export async function parseArticleFromUrl(url: string): Promise<ParsedArticle> {
  const html = await fetchArticleHtml(url);
  return parseArticleHtml(html);
}
