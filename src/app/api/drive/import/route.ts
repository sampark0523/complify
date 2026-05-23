import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveMetadata, downloadDriveFile } from "@/lib/drive";
import { extractText } from "@/lib/extract";
import { summarizeText } from "@/lib/openai";
import { uploadToBlob } from "@/lib/storage";

interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  resourceKey?: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { files: PickedFile[] };
  const files = body?.files;
  if (!files?.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = [];

  for (const file of files) {
    let record: Awaited<ReturnType<typeof prisma.importedFile.upsert>> | null =
      null;

    try {
      record = await prisma.importedFile.upsert({
        where: {
          userId_driveFileId: { userId: session.userId, driveFileId: file.id },
        },
        create: {
          userId: session.userId,
          driveFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          importStatus: "IMPORTING",
          processingStatus: "PENDING",
        },
        update: {
          name: file.name,
          importStatus: "IMPORTING",
          processingStatus: "PENDING",
          importError: null,
          processingError: null,
        },
      });

      const metadata = await getDriveMetadata(
        file.id,
        session.accessToken,
        file.resourceKey
      );

      const { buffer, exportedMimeType, extension } = await downloadDriveFile(
        file.id,
        file.mimeType,
        session.accessToken,
        file.resourceKey
      );

      const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_");
      const fileName = safeName.endsWith(extension)
        ? safeName
        : `${safeName}${extension}`;

      const blobUrl = await uploadToBlob(
        `${session.userId}/${record.id}/${fileName}`,
        buffer,
        exportedMimeType || "application/octet-stream"
      );

      await prisma.importedFile.update({
        where: { id: record.id },
        data: {
          importStatus: "COMPLETE",
          processingStatus: "PROCESSING",
          cachedPath: blobUrl,
          cachedSize: buffer.length,
          driveModifiedTime: metadata.modifiedTime
            ? new Date(metadata.modifiedTime)
            : null,
          size: metadata.size ?? null,
          md5Checksum: metadata.md5Checksum ?? null,
          resourceKey: metadata.resourceKey ?? null,
          webViewLink: metadata.webViewLink ?? file.webViewLink,
          lastSyncedAt: new Date(),
        },
      });

      const text = await extractText(buffer, exportedMimeType, file.name);
      const summary = await summarizeText(text, file.name);

      record = await prisma.importedFile.update({
        where: { id: record.id },
        data: { summary, processingStatus: "COMPLETE" },
      });

      results.push({ success: true, file: record });
    } catch (err) {
      console.error(`Error importing ${file.id}:`, err);
      const message = err instanceof Error ? err.message : "Unknown error";
      if (record) {
        await prisma.importedFile
          .update({
            where: { id: record.id },
            data: { importStatus: "ERROR", importError: message },
          })
          .catch(console.error);
      }
      results.push({ success: false, fileId: file.id, error: message });
    }
  }

  return NextResponse.json({ results });
}
