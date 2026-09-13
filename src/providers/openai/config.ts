import fetch from "node-fetch";
import { IConfig, IModel } from "../types";

const fallbackModels: IModel[] = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "o4-mini",
  "o3",
  "o3-mini",
].map((id) => ({ name: id, id }));

const config: IConfig = {
  requireModel: true,
  defaultModel: {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
  },
  supportCustomModel: true,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  async listModels(apikey: string | undefined, entrypoint: string | undefined): Promise<IModel[]> {
    let result = [...fallbackModels];
    if (entrypoint && entrypoint !== "") {
      const url = entrypoint.replace("/chat/completions", "/models");

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apikey}`,
          },
        });

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
        }

        const data = (await response.json()) as { data: { id: string }[] };
        // check gpt inside the model list
        result = data.data
          .filter((model: { id: string }) => {
            return (
              model.id.includes("gpt") ||
              model.id.startsWith("o1") ||
              model.id.startsWith("o3") ||
              model.id.startsWith("o4")
            );
          })
          .map((model: { id: string }) => ({
            name: model.id,
            id: model.id,
          }));
        return result;
      } catch (error) {
        console.error("Failed to fetch model list from API, using fallback models:", error);
      }
    }
    return Promise.resolve(result);
  },
  defaultEntrypoint: "https://api.openai.com/v1/chat/completions",
  supportCustomEntrypoint: true,
  requireApiKey: false,
  hasApiKey: true,
};

export default config;
