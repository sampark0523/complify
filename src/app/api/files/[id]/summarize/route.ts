export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/extract";
import { summarizeText } from "@/lib/openai";
import { downloadFromBlob } from "@/lib/storage";

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
    const text = await extractText(buffer, file.mimeType, file.name);
    const summary = await summarizeText(text, file.name);

    const updated = await prisma.importedFile.update({
      where: { id: file.id },
      data: { summary, processingStatus: "COMPLETE" },
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
