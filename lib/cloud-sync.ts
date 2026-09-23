import { parseLearningData, type LearningData } from "@/lib/learning-data";

type CloudLoadReply = {
  configured?: boolean;
  data?: unknown;
  error?: string;
};

export async function loadCloudLearningData(signal?: AbortSignal) {
  const response = await fetch("/api/progress", { cache: "no-store", signal });
  const reply = await response.json() as CloudLoadReply;
  if (!response.ok) throw new Error(reply.error ?? "Cloud progress could not be loaded.");
  return reply.data ? parseLearningData(reply.data) : null;
}

export async function saveCloudLearningData(data: LearningData, signal?: AbortSignal) {
  const response = await fetch("/api/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
    signal,
  });
  const reply = await response.json() as { saved?: boolean; updatedAt?: string; error?: string };
  if (!response.ok || !reply.saved) throw new Error(reply.error ?? "Cloud progress could not be saved.");
  return reply;
}
