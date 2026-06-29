"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIONS, type ActionType } from "@/app/types";
import ErrorAlert from "@/app/components/ErrorAlert";
import type { AppErrorCode } from "@/lib/errors";
import {
  requestGenerate,
  requestGenerateAll,
  requestIllustration,
} from "@/lib/apiClient";
import { RESULT_TABS, type ResultTabId } from "@/lib/generateAll";
import { ILLUSTRATION_LOADING_MESSAGE } from "@/lib/prompts/illustration";
import { LOADING_MESSAGES } from "@/lib/prompts";

type Status = "idle" | "loading" | "success" | "error";
type LoadingAction = ActionType | "illustration" | "all" | null;

type TabContent = {
  result: string;
  imageDataUrl?: string | null;
  errorCode?: AppErrorCode | null;
};

const GENERATE_ALL_LOADING_MESSAGE = [
  "Generation de tous les formats en cours...",
  "",
  "- Posts pour X",
  "- Posts pour Instagram",
  "- Infographies pour Instagram",
  "- Post pour Telegram",
  "- Illustration (prompt + image)",
  "",
  "Cela peut prendre 2 a 4 minutes.",
].join("\n");

function getTabStatus(
  tabId: ResultTabId,
  tabResults: Partial<Record<ResultTabId, TabContent>>,
): "empty" | "success" | "error" {
  const tab = tabResults[tabId];

  if (!tab) {
    return "empty";
  }

  if (tab.errorCode) {
    return "error";
  }

  return "success";
}

export default function ArticleForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [activeAction, setActiveAction] = useState<LoadingAction>(null);
  const [activeTab, setActiveTab] = useState<ResultTabId>("x");
  const [tabResults, setTabResults] = useState<
    Partial<Record<ResultTabId, TabContent>>
  >({});
  const [truncated, setTruncated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [globalErrorCode, setGlobalErrorCode] = useState<AppErrorCode | null>(
    null,
  );

  const resultSectionRef = useRef<HTMLElement>(null);
  const requestIdRef = useRef(0);

  const activeTabContent = tabResults[activeTab];
  const hasAnyResult = Object.keys(tabResults).length > 0;
  const showTabs = Object.keys(tabResults).length > 1;

  useEffect(() => {
    if (status === "success" && hasAnyResult) {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [status, hasAnyResult]);

  function resetResultState() {
    setTabResults({});
    setGlobalErrorCode(null);
    setTruncated(false);
    setCopied(false);
  }

  function handleClear() {
    requestIdRef.current += 1;
    setUrl("");
    setStatus("idle");
    setActiveAction(null);
    setActiveTab("x");
    resetResultState();
  }

  async function handleCopy() {
    const text = activeTabContent?.result;

    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleGenerate(action: ActionType) {
    const requestId = ++requestIdRef.current;

    setStatus("loading");
    setActiveAction(action);
    setActiveTab(action);
    resetResultState();

    const response = await requestGenerate(url, action);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (!response.ok) {
      setGlobalErrorCode(response.code);
      setStatus("error");
      return;
    }

    setTabResults({
      [action]: { result: response.result },
    });
    setTruncated(response.truncated);
    setStatus("success");
  }

  async function handleIllustration() {
    const requestId = ++requestIdRef.current;

    setStatus("loading");
    setActiveAction("illustration");
    setActiveTab("illustration");
    resetResultState();

    const response = await requestIllustration(url);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (!response.ok) {
      setGlobalErrorCode(response.code);
      setStatus("error");
      return;
    }

    setTabResults({
      illustration: {
        result: response.result,
        imageDataUrl: response.imageDataUrl,
      },
    });
    setTruncated(response.truncated);
    setStatus("success");
  }

  async function handleGenerateAll() {
    const requestId = ++requestIdRef.current;

    setStatus("loading");
    setActiveAction("all");
    setActiveTab("x");
    resetResultState();

    const response = await requestGenerateAll(url);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (!response.ok) {
      setGlobalErrorCode(response.code);
      setStatus("error");
      return;
    }

    const nextTabResults: Partial<Record<ResultTabId, TabContent>> = {};

    for (const tab of RESULT_TABS) {
      const tabResult = response.results[tab.id];

      if (tabResult.ok) {
        nextTabResults[tab.id] = {
          result: tabResult.result,
          imageDataUrl: tabResult.imageDataUrl ?? null,
        };
      } else {
        nextTabResults[tab.id] = {
          result: "",
          errorCode: tabResult.code,
        };
      }
    }

    setTabResults(nextTabResults);
    setTruncated(response.truncated);
    setStatus("success");
  }

  function getLoadingMessage(): string {
    if (activeAction === "all") {
      return GENERATE_ALL_LOADING_MESSAGE;
    }

    if (activeAction === "illustration") {
      return ILLUSTRATION_LOADING_MESSAGE;
    }

    if (activeAction && activeAction in LOADING_MESSAGES) {
      return LOADING_MESSAGES[activeAction];
    }

    return "Chargement...";
  }

  const canCopy =
    status === "success" &&
    Boolean(activeTabContent?.result) &&
    !activeTabContent?.errorCode;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
      <header className="space-y-2 px-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
          Mon-referent-FR
        </h1>
        <p className="text-sm leading-relaxed text-blue-100 sm:text-base">
          Traitement pour les reseaux sociaux — article francophone vers contenu
          social
        </p>
      </header>

      <section className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-5 lg:p-6">
        <div className="mb-3 flex flex-col gap-2 sm:mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <label
            htmlFor="article-url"
            className="min-w-0 text-sm font-medium text-slate-700"
          >
            URL de l&apos;article en francais
          </label>
          <button
            type="button"
            onClick={handleClear}
            disabled={status === "loading"}
            className="w-full shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#002395] hover:text-[#002395] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-1.5"
          >
            Очистить
          </button>
        </div>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://exemple.fr/article"
          className="w-full min-w-0 rounded-xl border border-blue-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#002395] focus:ring-2 focus:ring-blue-200 sm:text-sm"
        />
      </section>

      <section className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-5 lg:p-6">
        <button
          type="button"
          onClick={() => {
            void handleGenerateAll();
          }}
          disabled={status === "loading"}
          className="w-full rounded-xl border-2 border-[#ED2939] bg-gradient-to-r from-[#002395] to-[#001a70] px-4 py-4 text-left text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-lg font-semibold">
            {status === "loading" && activeAction === "all"
              ? "Generation..."
              : "Сгенерировать всё"}
          </span>
          <span className="mt-1 block text-sm text-blue-100">
            X, Instagram, infographies, Telegram et illustration en une fois
          </span>
        </button>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action) => {
          const isLoading = status === "loading" && activeAction === action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                void handleGenerate(action.id);
              }}
              disabled={status === "loading"}
              className="min-w-0 rounded-xl border border-blue-100 bg-white/95 px-4 py-4 text-left shadow-md backdrop-blur-sm transition hover:border-[#002395] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block break-words font-semibold text-slate-900">
                {isLoading ? "Generation..." : action.label}
              </span>
              <span className="mt-1 block break-words text-sm leading-snug text-slate-500">
                {action.description}
              </span>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-5 lg:p-6">
        <button
          type="button"
          onClick={() => {
            void handleIllustration();
          }}
          disabled={status === "loading"}
          className="w-full rounded-xl border border-[#002395] bg-[#002395] px-4 py-4 text-left text-white shadow-md transition hover:bg-[#001a70] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block font-semibold">
            {status === "loading" && activeAction === "illustration"
              ? "Generation..."
              : "Illustration"}
          </span>
          <span className="mt-1 block text-sm text-blue-100">
            Creer un prompt via OpenRouter, puis generer une image via Hugging
            Face
          </span>
        </button>
      </section>

      <section
        ref={resultSectionRef}
        className="scroll-mt-4 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:scroll-mt-6 sm:p-5 lg:p-6"
      >
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-lg font-semibold text-[#002395]">Resultat</h2>
          <div className="flex flex-wrap items-center gap-2">
            {status === "loading" && (
              <span className="text-sm font-medium text-[#002395]">
                Generation en cours...
              </span>
            )}
            {canCopy && (
              <button
                type="button"
                onClick={() => {
                  void handleCopy();
                }}
                className="rounded-lg border border-[#002395] px-3 py-2 text-sm font-medium text-[#002395] transition hover:bg-blue-50 sm:py-1.5"
              >
                {copied ? "Скопировано" : "Копировать"}
              </button>
            )}
          </div>
        </div>

        {status === "idle" && (
          <p className="text-sm leading-relaxed text-slate-500">
            Saisissez une URL et choisissez une action pour afficher le resultat
            ici.
          </p>
        )}

        {status === "error" && globalErrorCode && (
          <ErrorAlert code={globalErrorCode} />
        )}

        {(status === "loading" || status === "success") && (
          <>
            {status === "success" && showTabs && (
              <div className="mb-3 flex flex-wrap gap-2">
                {RESULT_TABS.map((tab) => {
                  const tabStatus = getTabStatus(tab.id, tabResults);
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                        isActive
                          ? "bg-[#002395] text-white"
                          : "border border-blue-100 bg-blue-50/80 text-slate-700 hover:border-[#002395]",
                        tabStatus === "error"
                          ? "border-red-300 text-red-700"
                          : "",
                        tabStatus === "success" && !isActive
                          ? "border-emerald-200"
                          : "",
                      ].join(" ")}
                    >
                      {tab.label}
                      {tabStatus === "error" ? " !" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            {status === "success" && truncated && (
              <p className="mb-3 break-words rounded-xl bg-amber-50 px-4 py-2 text-sm leading-relaxed text-amber-800">
                Le contenu de l&apos;article a ete tronque (limite 12 000
                caracteres) avant l&apos;envoi a l&apos;IA.
              </p>
            )}

            {status === "success" && activeTabContent?.errorCode ? (
              <ErrorAlert code={activeTabContent.errorCode} />
            ) : (
              <pre className="max-w-full min-h-24 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm leading-relaxed text-slate-800">
                {status === "loading" ? getLoadingMessage() : activeTabContent?.result}
              </pre>
            )}

            {status === "success" &&
              activeTab === "illustration" &&
              activeTabContent?.imageDataUrl && (
                <img
                  src={activeTabContent.imageDataUrl}
                  alt="Illustration generee"
                  className="mt-4 max-h-[32rem] w-full rounded-xl border border-blue-100 object-contain"
                />
              )}
          </>
        )}
      </section>
    </div>
  );
}
