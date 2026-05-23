"use client";

import { useCallback, useEffect, useState } from "react";
import type { ImportedFile } from "@prisma/client";

interface Props {
  refreshTrigger: number;
}

export function FileTable({ refreshTrigger }: Props) {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  const handleRefresh = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "refresh" }));
    try {
      const res = await fetch(`/api/files/${id}/refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => prev.map((f) => (f.id === id ? data.file : f)));
      }
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "summarize" }));
    try {
      const res = await fetch(`/api/files/${id}/summarize`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => prev.map((f) => (f.id === id ? data.file : f)));
      }
    } finally {
      setActionLoading((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No files yet</p>
        <p className="text-xs text-gray-400 mt-1">Import files from Google Drive to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          action={actionLoading[file.id]}
          onRefresh={() => handleRefresh(file.id)}
          onRegenerate={() => handleRegenerate(file.id)}
        />
      ))}
    </div>
  );
}

function FileCard({
  file,
  action,
  onRefresh,
  onRegenerate,
}: {
  file: ImportedFile;
  action?: string;
  onRefresh: () => void;
  onRegenerate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBusy = !!action;
  const isImporting = file.importStatus === "IMPORTING";
  const isProcessing = file.processingStatus === "PROCESSING";
  const isLoading = isImporting || isProcessing;
  const hasError = file.importStatus === "ERROR" || file.processingStatus === "ERROR";
  const errorMessage = file.importError || file.processingError;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon mimeType={file.mimeType} />
          <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
            title="Open in Google Drive"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isBusy}
            title="Refresh from Drive"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${action === "refresh" ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onRegenerate}
            disabled={isBusy || !file.cachedPath}
            title="Regenerate summary"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${action === "summarize" ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-indigo-500">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {isImporting ? "Importing from Drive…" : "Generating summary…"}
        </div>
      )}

      {/* Error state */}
      {hasError && errorMessage && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
      )}

      {/* Summary — main content */}
      {file.summary ? (
        <div>
          <p className={`text-sm text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {file.summary}
          </p>
          {file.summary.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-400 hover:text-indigo-600 mt-1.5 transition-colors"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      ) : !isLoading && !hasError ? (
        <p className="text-xs text-gray-400 italic">No summary yet.</p>
      ) : null}

      {/* Footer: download + last synced */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        {file.cachedPath ? (
          <a
            href={`/api/files/${file.id}/download`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="Download cached copy"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download cached copy
          </a>
        ) : (
          <span />
        )}
        {file.lastSyncedAt && (
          <span className="text-xs text-gray-300">
            Synced {new Date(file.lastSyncedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isDoc = mimeType.includes("document") || mimeType.includes("word");
  const isSheet = mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv");
  const isPdf = mimeType.includes("pdf");

  const color = isDoc
    ? "text-blue-400"
    : isSheet
    ? "text-green-400"
    : isPdf
    ? "text-red-400"
    : "text-gray-400";

  return (
    <svg className={`w-4 h-4 shrink-0 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
