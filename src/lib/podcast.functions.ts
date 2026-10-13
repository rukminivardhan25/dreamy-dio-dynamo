import { createServerFn } from "@tanstack/react-start";

const PODCAST_WEBHOOK_URL =
  "https://workflow.ccbp.in/webhook-test/1c8053af-8d37-4525-8023-78921b7ed523";

const AUDIO_KEYS = ["audioFile", "audioUrl", "audio", "fileUrl", "url", "mp3", "file"] as const;

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
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        body: JSON.stringify({ text: data.text }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const body = await response.arrayBuffer();

      if (!response.ok) {
        console.error("Podcast webhook responded with status", response.status, contentType);
        return { ok: false, error: "Generation failed" };
      }

      const audioFile = resolveAudioFile(contentType, body);
      if (!audioFile) {
        console.error(
          "Podcast webhook response missing a playable audioFile",
          contentType,
          body.byteLength,
        );
        return { ok: false, error: "Unexpected response" };
      }

      return { ok: true, audioFile };
    } catch (error) {
      console.error("Podcast webhook request failed", error);
      return { ok: false, error: "Service unavailable" };
    }
  });

function resolveAudioFile(contentType: string, body: ArrayBuffer): string | null {
  const headerMime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const sniffedMime = sniffAudioMime(body) ?? (headerMime.startsWith("audio/") ? headerMime : null);

  if (sniffedMime && body.byteLength > 0) {
    return bufferToDataUrl(body, sniffedMime);
  }

  if (headerMime === "application/octet-stream" && body.byteLength > 0) {
    return bufferToDataUrl(body, "audio/wav");
  }

  const text = new TextDecoder().decode(body).trim();
  if (!text) return null;
  if (isPlayableAudioRef(text)) return text;

  try {
    return extractAudioFile(JSON.parse(text));
  } catch {
    return null;
  }
}

function extractAudioFile(payload: unknown): string | null {
  if (payload == null) return null;

  if (typeof payload === "string") {
    return isPlayableAudioRef(payload) ? payload : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAudioFile(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  for (const key of ["audioFile", ...AUDIO_KEYS]) {
    const value = obj[key];
    if (typeof value === "string" && isPlayableAudioRef(value)) return value.trim();
    if (value && typeof value === "object") {
      const nested = extractAudioFile(value);
      if (nested) return nested;
    }
  }

  for (const wrapper of ["json", "data", "body", "output"]) {
    if (wrapper in obj) {
      const nested = extractAudioFile(obj[wrapper]);
      if (nested) return nested;
    }
  }

  return extractFromN8nBinary(obj.binary);
}

function extractFromN8nBinary(binary: unknown): string | null {
  if (!binary || typeof binary !== "object") return null;

  for (const slot of Object.values(binary as Record<string, unknown>)) {
    if (!slot || typeof slot !== "object") continue;
    const file = slot as Record<string, unknown>;
    if (typeof file.data !== "string" || file.data.length === 0) continue;
    if (isUnusableApiUrl(file.data)) continue;
    if (file.data.startsWith("data:")) return file.data;
    const mime = typeof file.mimeType === "string" ? file.mimeType : "audio/wav";
    return `data:${mime};base64,${file.data}`;
  }

  return null;
}

function sniffAudioMime(body: ArrayBuffer): string | null {
  const bytes = new Uint8Array(body);
  if (bytes.length >= 12) {
    const riff =
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const wave =
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
    if (riff && wave) return "audio/wav";
  }
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return "audio/mpeg";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }
  return null;
}

function isPlayableAudioRef(value: string): boolean {
  const v = value.trim();
  if (!v || isUnusableApiUrl(v)) return false;
  return (
    v.startsWith("https://") ||
    v.startsWith("http://") ||
    v.startsWith("data:audio") ||
    /\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(v)
  );
}

function isUnusableApiUrl(value: string): boolean {
  return /murf\.ai\/v1\/speech/i.test(value);
}

function bufferToDataUrl(body: ArrayBuffer, mime: string): string | null {
  if (body.byteLength === 0) return null;
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(body).toString("base64")
      : encodeBase64(new Uint8Array(body));
  return `data:${mime};base64,${base64}`;
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const a = bytes[i] ?? 0;
    const b = remaining > 1 ? (bytes[i + 1] ?? 0) : 0;
    const c = remaining > 2 ? (bytes[i + 2] ?? 0) : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += remaining > 1 ? alphabet[(triple >> 6) & 63] : "=";
    output += remaining > 2 ? alphabet[triple & 63] : "=";
  }
  return output;
}
