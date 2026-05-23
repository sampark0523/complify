export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/extract";
import { summarizeText } from "@/lib/openai";
import { downloadFromBlob } from "@/lib/storage";

function mimeTypeFromUrl(url: string): string | null {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
  };
  return ext ? (map[ext] ?? null) : null;
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.importedFile.findUnique({
    where: { id: params.id },
  });

  if (!file || file.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!file.cachedPath) {
    return NextResponse.json(
      { error: "No cached copy — refresh from Drive first" },
      { status: 400 }
    );
  }

  try {
    await prisma.importedFile.update({
      where: { id: file.id },
      data: { processingStatus: "PROCESSING", processingError: null },
    });

    const buffer = await downloadFromBlob(file.cachedPath);
    const cachedMimeType = mimeTypeFromUrl(file.cachedPath) ?? file.mimeType;
    const text = await extractText(buffer, cachedMimeType, file.name);
    const summary = await summarizeText(text, file.name);

    const updated = await prisma.importedFile.update({
      where: { id: file.id },
      data: { summary, processingStatus: "COMPLETE", processingError: null },
    });

    return NextResponse.json({ file: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.importedFile
      .update({
        where: { id: file.id },
        data: { processingStatus: "ERROR", processingError: message },
      })
      .catch(console.error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
