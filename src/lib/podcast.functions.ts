import { createServerFn } from "@tanstack/react-start";

const PODCAST_WEBHOOK_URL =
  "https://workflow.ccbp.in/webhook/1c8053af-8d37-4525-8023-78921b7ed523";

export type GeneratePodcastResult =
  | { ok: true; audioFile: string }
  | { ok: false; error: string };

export const generatePodcast = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string }) => {
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text || text.length > 500) {
      throw new Error("Please provide a podcast topic of 1–500 characters.");
    }
    return { text };
  })
  .handler(async ({ data }): Promise<GeneratePodcastResult> => {
    try {
      const response = await fetch(PODCAST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text }),
      });
      if (!response.ok) {
        console.error("Podcast webhook responded with status", response.status);
        return { ok: false, error: "Generation failed" };
      }
      const payload = (await response.json()) as { audioFile?: unknown };
      const audioFile =
        typeof payload?.audioFile === "string" && payload.audioFile.length > 0
          ? payload.audioFile
          : null;
      if (!audioFile) {
        console.error("Podcast webhook response missing audioFile");
        return { ok: false, error: "Unexpected response" };
      }
      return { ok: true, audioFile };
    } catch (error) {
      console.error("Podcast webhook request failed", error);
      return { ok: false, error: "Service unavailable" };
    }
  });
