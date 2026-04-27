import { AIProviderType } from "../types";

export async function fetchModelsForProvider(
  provider: AIProviderType,
  apiKey: string,
): Promise<string[]> {
  switch (provider) {
    case "google":
      return fetchGoogleModels(apiKey);
    case "openai":
      return fetchOpenAIModels(apiKey);
    case "anthropic":
      return getAnthropicModels();
  }
}

async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  if (!response.ok) throw new Error("Failed to fetch Google models");

  const data = await response.json();
  return data.models
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes("generateContent"),
    )
    .map((m: { name: string }) => m.name.replace("models/", ""))
    .sort();
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error("Failed to fetch OpenAI models");

  const data = await response.json();
  return data.data
    .filter((m: { id: string }) => m.id.startsWith("gpt-"))
    .map((m: { id: string }) => m.id)
    .sort()
    .reverse();
}

function getAnthropicModels(): Promise<string[]> {
  return Promise.resolve([
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ]);
}
