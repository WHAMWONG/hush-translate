import fetch from "node-fetch";
import { IConfig, IModel } from "../types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// gemini-2.5-* is no longer available to new API keys
const fallbackModels: IModel[] = [
  { name: "gemini-3.5-flash-lite", id: "gemini-3.5-flash-lite" },
  { name: "gemini-3.6-flash", id: "gemini-3.6-flash" },
];

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "gemini-3.5-flash-lite",
    name: "gemini-3.5-flash-lite",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, _: string | undefined): Promise<IModel[]> {
    if (!apikey) {
      return [...fallbackModels];
    }
    try {
      const response = await fetch(`${API_BASE}/models?pageSize=1000`, {
        method: "GET",
        headers: {
          "x-goog-api-key": apikey,
        },
      });
      if (!response.ok) {
        console.error(`API request failed with status ${response.status}`);
        return [...fallbackModels];
      }
      const data = (await response.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      // names look like "models/gemini-3.5-flash-lite"; keep text generation models only
      const models = (data.models ?? [])
        .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model) => model.name.replace(/^models\//, ""))
        .filter((id) => id.startsWith("gemini") && !/embedding|tts|image|audio|live/.test(id))
        .map((id) => ({ name: id, id }));
      return models.length > 0 ? models : [...fallbackModels];
    } catch (error) {
      console.error("Failed to fetch model list from API, using fallback models:", error);
      return [...fallbackModels];
    }
  },
  defaultEntrypoint: API_BASE,
  supportCustomEntrypoint: false,
  requireApiKey: true,
  hasApiKey: true,
};

export default config;
