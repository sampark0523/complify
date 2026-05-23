import mammoth from "mammoth";
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/csv",
  "text/tab-separated-values",
]);

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  try {
    if (TEXT_MIME_TYPES.has(mimeType)) {
      return buffer.toString("utf-8").slice(0, 50_000);
    }

    if (mimeType === "application/pdf") {
      const data = await pdfParse(buffer);
      return data.text.slice(0, 50_000);
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.slice(0, 50_000);
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const chunks: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        chunks.push(`Sheet: ${sheetName}\n${csv}`);
      }
      return chunks.join("\n\n").slice(0, 50_000);
    }

    return `[File: ${filename} — type ${mimeType} not supported for text extraction]`;
  } catch (err) {
    console.error("Text extraction failed:", err);
    return `[Failed to extract text from ${filename}]`;
  }
}
