export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadFromBlob } from "@/lib/storage";
import path from "path";

export async function GET(
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
      { error: "No cached copy available" },
      { status: 404 }
    );
  }

  try {
    const buffer = await downloadFromBlob(file.cachedPath);
    const filename = path.basename(new URL(file.cachedPath).pathname);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Cached file not available" },
      { status: 404 }
    );
  }
}
