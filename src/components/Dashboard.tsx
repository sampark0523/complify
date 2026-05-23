"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { GooglePicker } from "./GooglePicker";
import { FileTable } from "./FileTable";

interface Props {
  session: Session;
}

interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  resourceKey?: string;
}

export function Dashboard({ session }: Props) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFilesPicked = async (files: PickedFile[]) => {
    setImporting(true);
    setImportError(null);

    try {
      const payload = files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.url,
        resourceKey: f.resourceKey,
      }));

      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Import failed");
      }

      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Complify</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Your files</h1>
          <div className="flex items-center gap-3">
            {importing && (
              <span className="text-xs text-indigo-500 flex items-center gap-1.5">
                <Spinner />
                Importing…
              </span>
            )}
            <GooglePicker onFilesPicked={handleFilesPicked} disabled={importing} />
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <span>{importError}</span>
            <button
              onClick={() => setImportError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        <FileTable refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
