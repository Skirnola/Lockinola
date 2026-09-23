import { env } from "cloudflare:workers";
import { isHosted } from "@/lib/access-control";

export type ReviewProviderStatus = {
  configured: boolean;
  provider: "ollama";
  model: string;
};

type OllamaResponse = { message?: { content?: string }; error?: string };

function ollamaSettings() {
  const hosted = isHosted();
  return {
    baseUrl: (env.OLLAMA_BASE_URL ?? process.env.OLLAMA_BASE_URL ?? (hosted ? "https://ollama.com/api" : "http://127.0.0.1:11434/api")).replace(/\/$/, ""),
    apiKey: env.OLLAMA_API_KEY ?? process.env.OLLAMA_API_KEY ?? "",
    model: hosted ? env.OLLAMA_CLOUD_MODEL ?? process.env.OLLAMA_CLOUD_MODEL ?? "gemma4" : env.OLLAMA_LOCAL_MODEL ?? process.env.OLLAMA_LOCAL_MODEL ?? "qwen3.8:27b",
    hosted,
  };
}

export function reviewProviderStatus(): ReviewProviderStatus {
  const settings = ollamaSettings();
  return { provider: "ollama", configured: !settings.hosted || Boolean(settings.apiKey), model: settings.model };
}

export async function generateReview(instructions: string, input: string, signal: AbortSignal) {
  const settings = ollamaSettings();
  if (settings.hosted && !settings.apiKey) throw new Error("not_configured");
  const response = await fetch(`${settings.baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
      stream: false,
      think: false,
      options: { temperature: 0.35, num_predict: 350 },
    }),
    signal,
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "configuration_error" : response.status === 429 ? "provider_limit" : "provider_error");
  const payload = await response.json() as OllamaResponse;
  const feedback = payload.message?.content?.trim();
  if (!feedback) throw new Error(payload.error ? "provider_error" : "empty_response");
  return feedback;
}
