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
      } else {
        const data = await res.json();
        alert(`Refresh failed: ${data.error}`);
      }
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "summarize" }));
    try {
      const res = await fetch(`/api/files/${id}/summarize`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => prev.map((f) => (f.id === id ? data.file : f)));
      } else {
        const data = await res.json();
        alert(`Summarize failed: ${data.error}`);
      }
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Loading files…
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-base font-medium">No files imported yet</p>
        <p className="text-sm mt-1">
          Click &quot;Import from Google Drive&quot; to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3">File</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Cache</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Summary</th>
            <th className="px-4 py-3">Last Synced</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              action={actionLoading[file.id]}
              onRefresh={() => handleRefresh(file.id)}
              onRegenerate={() => handleRegenerate(file.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileRow({
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

  const importBadge = {
    PENDING: "bg-gray-100 text-gray-600",
    IMPORTING: "bg-blue-100 text-blue-700",
    COMPLETE: "bg-green-100 text-green-700",
    ERROR: "bg-red-100 text-red-700",
  }[file.importStatus];

  const processBadge = {
    PENDING: "bg-gray-100 text-gray-600",
    PROCESSING: "bg-yellow-100 text-yellow-700",
    COMPLETE: "bg-green-100 text-green-700",
    ERROR: "bg-red-100 text-red-700",
  }[file.processingStatus];

  const isBusy = !!action;

  return (
    <tr className="hover:bg-gray-50 transition-colors align-top">
      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
        {file.name}
      </td>
      <td className="px-4 py-3">
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Google Drive"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
        >
          <ExternalLinkIcon />
          Drive
        </a>
      </td>
      <td className="px-4 py-3">
        {file.cachedPath ? (
          <a
            href={`/api/files/${file.id}/download`}
            title="Download cached copy"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs"
          >
            <DownloadIcon />
            Download
          </a>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${importBadge}`}>
            {file.importStatus === "IMPORTING" ? "Importing…" : file.importStatus.toLowerCase()}
          </span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${processBadge}`}>
            {file.processingStatus === "PROCESSING"
              ? "Processing…"
              : file.processingStatus.toLowerCase()}
          </span>
          {file.importError && (
            <span className="text-xs text-red-500" title={file.importError}>
              {file.importError.slice(0, 60)}…
            </span>
          )}
          {file.processingError && (
            <span className="text-xs text-red-500" title={file.processingError}>
              {file.processingError.slice(0, 60)}…
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-[300px]">
        {file.summary ? (
          <div>
            <p className={`text-gray-700 text-xs leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
              {file.summary}
            </p>
            {file.summary.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-500 hover:text-blue-700 text-xs mt-1"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
        {file.lastSyncedAt
          ? new Date(file.lastSyncedAt).toLocaleString()
          : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isBusy}
            title="Refresh from Drive"
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded border border-gray-200 hover:border-gray-300 bg-white transition-colors"
          >
            <RefreshIcon spinning={action === "refresh"} />
            {action === "refresh" ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isBusy || !file.cachedPath}
            title="Regenerate AI summary"
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded border border-gray-200 hover:border-gray-300 bg-white transition-colors"
          >
            <SparkleIcon />
            {action === "summarize" ? "Generating…" : "Summarize"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg className={`w-3 h-3 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 4.5L12 9l-5.5 1.5L5 15l-1.5-4.5L-2 9l6.5-1.5zm14 9l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
    </svg>
  );
}
