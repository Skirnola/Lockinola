import { isHosted } from "@/lib/access-control";

export type TutorProviderStatus = {
  configured: boolean;
  provider: "ollama" | "openai";
  model: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
};

type OllamaResponse = { message?: { content?: string }; error?: string };

function providerName(): TutorProviderStatus["provider"] {
  return process.env.LOCKINOLA_AI_PROVIDER === "openai" ? "openai" : "ollama";
}

function ollamaSettings() {
  const hosted = isHosted();
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL ?? (hosted ? "https://ollama.com/api" : "http://127.0.0.1:11434/api")).replace(/\/$/, ""),
    apiKey: process.env.OLLAMA_API_KEY ?? "",
    model: hosted ? process.env.OLLAMA_CLOUD_MODEL ?? "gemma4" : process.env.OLLAMA_LOCAL_MODEL ?? "qwen3.8:27b",
    hosted,
  };
}

export function tutorProviderStatus(): TutorProviderStatus {
  const provider = providerName();
  if (provider === "openai") {
    return { provider, configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_TUTOR_MODEL ?? "gpt-5.6-luna" };
  }
  const settings = ollamaSettings();
  return { provider, configured: !settings.hosted || Boolean(settings.apiKey), model: settings.model };
}

export async function generateTutorFeedback(instructions: string, input: string, signal: AbortSignal) {
  const provider = providerName();
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("not_configured");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_TUTOR_MODEL ?? "gpt-5.6-luna", instructions, input, max_output_tokens: 350, store: false }),
      signal,
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "configuration_error" : response.status === 429 ? "provider_limit" : "provider_error");
    const payload = await response.json() as OpenAIResponse;
    const refusal = payload.output?.flatMap(item => item.content ?? []).find(item => item.type === "refusal" && item.refusal)?.refusal;
    if (refusal) throw new Error("refused");
    const feedback = payload.output_text?.trim() || payload.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text" && item.text)?.text?.trim();
    if (!feedback) throw new Error("empty_response");
    return feedback;
  }

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
