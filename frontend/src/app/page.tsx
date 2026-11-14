"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

const T = {
  es: {
    title: "Parser de Cuestionarios",
    subtitle: "Sube un PDF, Word o Excel y obtén los ítems estructurados en JSON.",
    drop: "Arrastra un archivo aquí o haz clic para seleccionar",
    formats: "Formatos soportados: PDF, DOCX, XLSX (máx. 10 MB)",
    process: "Procesar",
    processing: "Procesando...",
    download: "Descargar JSON",
    result: "Resultado",
    noItems: "No se detectaron ítems.",
    error: "Error",
    lang: "Idioma del documento",
  },
  en: {
    title: "Questionnaire Parser",
    subtitle: "Upload a PDF, Word or Excel and get structured items as JSON.",
    drop: "Drag a file here or click to select",
    formats: "Supported formats: PDF, DOCX, XLSX (max 10 MB)",
    process: "Process",
    processing: "Processing...",
    download: "Download JSON",
    result: "Result",
    noItems: "No items detected.",
    error: "Error",
    lang: "Document language",
  },
};

export default function Home() {
  const [uiLang, setUiLang] = useState<"es" | "en">("es");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = T[uiLang];

  const onFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const process = async () => {
    if (!file) return;
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

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setUiLang(uiLang === "es" ? "en" : "es")}
            className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-sm"
          >
            {uiLang === "es" ? "EN" : "ES"}
          </button>
        </header>

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 transition"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.xlsx"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          <p className="text-lg">{file ? file.name : t.drop}</p>
          <p className="text-sm text-zinc-500 mt-2">{t.formats}</p>
        </section>

        <div className="mt-4 flex gap-3">
          <button
            onClick={process}
            disabled={!file || loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.processing : t.process}
          </button>
          {result && (
            <button
              onClick={download}
              className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-medium"
            >
              {t.download}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200">
            <strong>{t.error}:</strong> {error}
          </div>
        )}

        {result && (
          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-2">{t.result}</h2>
            <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">{result.titulo}</span> · {t.lang}: {result.idioma} · {result.total_items} items
            </div>
            <div className="space-y-4">
              {result.items.map((it) => (
                <article key={it.numero} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">{it.numero}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{it.enunciado}</p>
                      <p className="text-xs text-zinc-500 mt-1">Tipo: {it.tipo}</p>
                      {it.alternativas.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {it.alternativas.map((a, i) => (
                            <li key={i} className="text-sm">
                              <span className="font-mono text-zinc-500 mr-2">{String(a.valor)}</span>
                              {a.texto}
                            </li>
                          ))}
                        </ul>
                      )}
                      {it.respuesta_correcta !== null && it.respuesta_correcta !== undefined && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                          Respuesta correcta: {String(it.respuesta_correcta)}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <pre className="mt-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
