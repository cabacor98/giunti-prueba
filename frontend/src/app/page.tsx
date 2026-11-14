"use client";

import { useState, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MAX_SIZE_MB = 10;
const ALLOWED_EXT = [".pdf", ".docx", ".xlsx"];

type Alternative = { valor: number | string | null; texto: string };
type Item = {
  numero: number;
  enunciado: string;
  tipo: string;
  alternativas: Alternative[];
  respuesta_correcta: number | string | null;
};
type Result = {
  titulo: string;
  idioma: string;
  total_items: number;
  items: Item[];
};

const TYPE_LABEL: Record<string, { es: string; en: string; badge: string }> = {
  escala_likert: { es: "Escala Likert", en: "Likert scale", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" },
  seleccion_multiple: { es: "Selección múltiple", en: "Multiple choice", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" },
  verdadero_falso: { es: "Verdadero/Falso", en: "True/False", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  desarrollo: { es: "Desarrollo", en: "Open-ended", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  emparejamiento: { es: "Emparejamiento", en: "Matching", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
};

const T = {
  es: {
    title: "Parser de cuestionarios",
    uploadHeading: "Subir archivo",
    subtitle: "Sube un cuestionario en PDF, Word o Excel y obtén los ítems estructurados en JSON.",
    drop: "Arrastra un archivo aquí o haz clic para seleccionar",
    dropHint: "Formatos: PDF, DOCX, XLSX — máximo 10 MB",
    selected: "Archivo seleccionado",
    change: "Cambiar",
    process: "Procesar",
    processing: "Procesando…",
    download: "Descargar JSON",
    result: "Resultado",
    items: "ítems",
    lang: "Idioma detectado",
    correct: "Respuesta correcta",
    empty: "No se detectaron ítems en el documento.",
    emptyHint: "Verifica que el archivo contenga texto legible y preguntas numeradas.",
    errorTitle: "No se pudo procesar el archivo",
    retry: "Reintentar",
    invalidType: "Formato no soportado. Usa PDF, DOCX o XLSX.",
    tooBig: "El archivo supera los 10 MB.",
    noFile: "Selecciona un archivo primero.",
    loadingTitle: "Analizando documento…",
    loadingHint: "Extrayendo texto e identificando ítems con el modelo.",
    copy: "Copiar JSON",
    copied: "Copiado",
    footer: "Giunti Psychometrics · Prueba técnica Backend Python",
  },
  en: {
    title: "Questionnaire parser",
    uploadHeading: "Upload file",
    subtitle: "Upload a questionnaire in PDF, Word or Excel and get the items structured as JSON.",
    drop: "Drag a file here or click to select",
    dropHint: "Formats: PDF, DOCX, XLSX — max 10 MB",
    selected: "Selected file",
    change: "Change",
    process: "Process",
    processing: "Processing…",
    download: "Download JSON",
    result: "Result",
    items: "items",
    lang: "Detected language",
    correct: "Correct answer",
    empty: "No items detected in the document.",
    emptyHint: "Make sure the file contains readable text and numbered questions.",
    errorTitle: "Could not process the file",
    retry: "Retry",
    invalidType: "Unsupported format. Use PDF, DOCX or XLSX.",
    tooBig: "File exceeds 10 MB.",
    noFile: "Select a file first.",
    loadingTitle: "Analyzing document…",
    loadingHint: "Extracting text and identifying items with the model.",
    copy: "Copy JSON",
    copied: "Copied",
    footer: "Giunti Psychometrics · Backend Python technical test",
  },
};

export default function Home() {
  const [uiLang, setUiLang] = useState<"es" | "en">("es");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const t = T[uiLang];

  const validate = useCallback((f: File): string | null => {
    const ext = "." + f.name.toLowerCase().split(".").pop();
    if (!ALLOWED_EXT.includes(ext)) return t.invalidType;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return t.tooBig;
    return null;
  }, [t]);

  const onFile = useCallback((f: File | null) => {
    if (!f) return;
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  }, [validate]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const process = async () => {
    if (!file) {
      setError(t.noFile);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/parse`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Result;
      setResult(data);
      setTimeout(() => statusRef.current?.focus(), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.titulo || "result"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available */
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-white focus:text-zinc-900 focus:rounded focus:shadow">
        Skip to content
      </a>

      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{t.title}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setUiLang(uiLang === "es" ? "en" : "es")}
            aria-label={uiLang === "es" ? "Switch to English" : "Cambiar a español"}
            className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {uiLang === "es" ? "EN" : "ES"}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <section aria-labelledby="upload-heading" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="p-5 sm:p-6">
            <h2 id="upload-heading" className="text-base font-semibold mb-4">{t.uploadHeading}</h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              aria-label={t.drop}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 sm:p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
              <svg className="mx-auto h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-3 text-sm font-medium">{file ? file.name : t.drop}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : t.dropHint}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={process}
                disabled={loading || !file}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t.processing}
                  </>
                ) : t.process}
              </button>
              {file && !loading && (
                <button
                  type="button"
                  onClick={reset}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {t.change}
                </button>
              )}
            </div>
          </div>
        </section>

        <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none" />

        {loading && (
          <section className="mt-8" aria-busy="true" aria-label={t.loadingTitle}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{t.loadingTitle}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.loadingHint}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
              ))}
            </div>
          </section>
        )}

        {error && !loading && (
          <section role="alert" className="mt-8 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-5">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">{t.errorTitle}</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300 break-words">{error}</p>
                <button
                  type="button"
                  onClick={process}
                  disabled={!file}
                  className="mt-3 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {t.retry}
                </button>
              </div>
            </div>
          </section>
        )}

        {result && result.items.length === 0 && !loading && (
          <section className="mt-8 text-center py-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-3 text-sm font-medium">{t.empty}</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.emptyHint}</p>
          </section>
        )}

        {result && result.items.length > 0 && !loading && (
          <section className="mt-8" aria-labelledby="result-heading">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 id="result-heading" className="text-lg font-semibold tracking-tight">{t.result}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{result.titulo}</span>
                  {" · "}
                  {t.lang}: <span className="font-medium">{result.idioma}</span>
                  {" · "}
                  {result.total_items} {t.items}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={copyJson}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {copied ? t.copied : t.copy}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {t.download}
                </button>
              </div>
            </div>

            <ol className="space-y-3" role="list">
              {result.items.map((it) => {
                const typeInfo = TYPE_LABEL[it.tipo] || { es: it.tipo, en: it.tipo, badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" };
                return (
                  <li key={it.numero} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {it.numero}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeInfo.badge}`}>
                            {uiLang === "es" ? typeInfo.es : typeInfo.en}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base leading-relaxed">{it.enunciado}</p>

                        {it.alternativas.length > 0 && (
                          <ul className="mt-3 space-y-1.5" role="list">
                            {it.alternativas.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="shrink-0 font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 min-w-[1.5rem]">
                                  {String(a.valor)}
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-200">{a.texto}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {it.respuesta_correcta !== null && it.respuesta_correcta !== undefined && (
                          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t.correct}: {String(it.respuesta_correcta)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <details className="mt-6 group">
              <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 select-none">
                JSON completo
              </summary>
              <pre className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs overflow-auto max-h-96 border border-zinc-200 dark:border-zinc-800">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {t.footer}
        </footer>
      </main>
    </div>
  );
}
