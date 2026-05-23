import { put } from "@vercel/blob";

export async function uploadToBlob(
  pathname: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const blob = await put(pathname, buffer, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

export async function downloadFromBlob(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch cached file: ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}
