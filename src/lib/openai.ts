import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function summarizeText(
  text: string,
  filename: string
): Promise<string> {
  if (!text || text.startsWith("[")) {
    return `Unable to generate summary: could not extract text from ${filename}.`;
  }

  const truncated = text.slice(0, 60_000);

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a document analyzer. Generate concise, informative summaries. Focus on the document's purpose, key content, and notable details. Keep summaries to 2-4 sentences.",
      },
      {
        role: "user",
        content: `Summarize this document titled "${filename}":\n\n${truncated}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  return (
    response.choices[0]?.message?.content ?? "Unable to generate summary."
  );
}
