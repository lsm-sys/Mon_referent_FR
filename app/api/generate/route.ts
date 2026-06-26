import { NextResponse } from "next/server";
import type { ActionType } from "@/app/types";
import { parseArticleFromUrl } from "@/lib/parseArticle";

const ACTION_LABELS: Record<ActionType, string> = {
  x: "Posts pour X",
  "instagram-posts": "Posts pour Instagram",
  "instagram-infographics": "Infographies pour Instagram",
  telegram: "Post pour Telegram",
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    url?: string;
    action?: ActionType;
  };

  const url = body.url?.trim() ?? "";
  const action = body.action;

  if (!url) {
    return NextResponse.json(
      { error: "Veuillez saisir l'URL de l'article." },
      { status: 400 },
    );
  }

  if (!isValidUrl(url)) {
    return NextResponse.json(
      { error: "L'URL saisie n'est pas valide." },
      { status: 400 },
    );
  }

  if (!action || !(action in ACTION_LABELS)) {
    return NextResponse.json(
      { error: "Action non reconnue." },
      { status: 400 },
    );
  }

  try {
    const article = await parseArticleFromUrl(url);

    if (!article.title && !article.content) {
      return NextResponse.json(
        {
          error:
            "Impossible d'extraire le titre ou le contenu de cette page.",
        },
        { status: 422 },
      );
    }

    const result = JSON.stringify(
      {
        date: article.date,
        title: article.title,
        content: article.content,
      },
      null,
      2,
    );

    return NextResponse.json({ action, url, article, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors du parsing de l'article.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
