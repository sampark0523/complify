import { google } from "googleapis";

const GOOGLE_EXPORT_MAP: Record<string, { mimeType: string; extension: string }> = {
  "application/vnd.google-apps.document": { mimeType: "text/plain", extension: ".txt" },
  "application/vnd.google-apps.spreadsheet": { mimeType: "text/csv", extension: ".csv" },
  "application/vnd.google-apps.presentation": { mimeType: "application/pdf", extension: ".pdf" },
  "application/vnd.google-apps.drawing": { mimeType: "image/png", extension: ".png" },
};

const MIME_TO_EXT: Record<string, string> = {
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};

function makeOAuth2Client(accessToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ access_token: accessToken });
  return client;
}

function resourceKeyHeaders(fileId: string, resourceKey?: string) {
  if (!resourceKey) return {};
  return { "X-Goog-Drive-Resource-Keys": `${fileId}/${resourceKey}` };
}

export async function getDriveMetadata(
  fileId: string,
  accessToken: string,
  resourceKey?: string
) {
  const auth = makeOAuth2Client(accessToken);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.get(
    {
      fileId,
      fields: "id,name,mimeType,webViewLink,modifiedTime,size,md5Checksum,resourceKey",
      supportsAllDrives: true,
    },
    { headers: resourceKeyHeaders(fileId, resourceKey) }
  );

  return res.data;
}

export async function downloadDriveFile(
  fileId: string,
  mimeType: string,
  accessToken: string,
  resourceKey?: string
): Promise<{ buffer: Buffer; exportedMimeType: string; extension: string }> {
  const auth = makeOAuth2Client(accessToken);
  const drive = google.drive({ version: "v3", auth });
  const headers = resourceKeyHeaders(fileId, resourceKey);

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    const exportConfig = GOOGLE_EXPORT_MAP[mimeType] ?? {
      mimeType: "text/plain",
      extension: ".txt",
    };

    const res = await drive.files.export(
      { fileId, mimeType: exportConfig.mimeType },
      { responseType: "arraybuffer", headers }
    );

    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      exportedMimeType: exportConfig.mimeType,
      extension: exportConfig.extension,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer", headers }
  );

  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    exportedMimeType: mimeType,
    extension: MIME_TO_EXT[mimeType] ?? "",
  };
}
