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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          Complify
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Imported Files
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Select files from Google Drive to import, cache, and summarize.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {importing && (
              <span className="text-sm text-blue-600 flex items-center gap-2">
                <Spinner />
                Importing…
              </span>
            )}
            <GooglePicker
              onFilesPicked={handleFilesPicked}
              disabled={importing}
            />
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
            <span className="font-medium">Import error:</span> {importError}
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
    <svg
      className="w-4 h-4 animate-spin text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}
