export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveMetadata, downloadDriveFile } from "@/lib/drive";
import { uploadToBlob } from "@/lib/storage";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.importedFile.findUnique({
    where: { id: params.id },
  });

  if (!file || file.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.importedFile.update({
      where: { id: file.id },
      data: { importStatus: "IMPORTING", importError: null },
    });

    const metadata = await getDriveMetadata(
      file.driveFileId,
      session.accessToken,
      file.resourceKey ?? undefined
    );

    const { buffer, exportedMimeType, extension } = await downloadDriveFile(
      file.driveFileId,
      metadata.mimeType ?? file.mimeType,
      session.accessToken,
      file.resourceKey ?? undefined
    );

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_");
    const fileName = safeName.endsWith(extension)
      ? safeName
      : `${safeName}${extension}`;

    const blobUrl = await uploadToBlob(
      `${session.userId}/${file.id}/${fileName}`,
      buffer,
      exportedMimeType || "application/octet-stream"
    );

    const updated = await prisma.importedFile.update({
      where: { id: file.id },
      data: {
        importStatus: "COMPLETE",
        importError: null,
        cachedPath: blobUrl,
        cachedSize: buffer.length,
        driveModifiedTime: metadata.modifiedTime
          ? new Date(metadata.modifiedTime)
          : null,
        size: metadata.size ?? null,
        md5Checksum: metadata.md5Checksum ?? null,
        mimeType: metadata.mimeType ?? file.mimeType,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({ file: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.importedFile
      .update({
        where: { id: file.id },
        data: { importStatus: "ERROR", importError: message },
      })
      .catch(console.error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
