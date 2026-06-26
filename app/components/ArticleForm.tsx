"use client";

import { useState } from "react";
import { ACTIONS, type ActionType, type GenerateResponse } from "@/app/types";

type Status = "idle" | "loading" | "success" | "error";

export default function ArticleForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate(action: ActionType) {
    setStatus("loading");
    setActiveAction(action);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action }),
      });

      const data = (await response.json()) as GenerateResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Une erreur est survenue.");
      }

      setResult(data.result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Mon referent FR
        </h1>
        <p className="text-slate-600">
          Traitement pour les reseaux sociaux — article francophone vers contenu
          social
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-700">
          URL de l&apos;article en francais
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://exemple.fr/article"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const isLoading = status === "loading" && activeAction === action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleGenerate(action.id)}
              disabled={status === "loading"}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block font-semibold text-slate-900">
                {isLoading ? "Generation..." : action.label}
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {action.description}
              </span>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Resultat</h2>
          {status === "loading" && (
            <span className="text-sm text-blue-600">Generation en cours...</span>
          )}
        </div>

        {status === "idle" && (
          <p className="text-sm text-slate-500">
            Saisissez une URL et choisissez une action pour afficher le resultat
            ici.
          </p>
        )}

        {status === "error" && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {(status === "loading" || status === "success") && (
          <pre className="min-h-40 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
            {status === "loading"
              ? "Chargement et analyse du HTML de l'article..."
              : result}
          </pre>
        )}
      </section>
    </div>
  );
}
