import { Provider } from "./base";

import openai from "./openai";
import groq from "./groq";
import gemini from "./gemini";

import openaiConfig from "./openai/config";
import groqConfig from "./groq/config";
import geminiConfig from "./gemini/config";

import { IConfig, ProviderProps } from "./types";

export const PROVIDER_CONFIGS: Record<string, IConfig> = {
  openai: openaiConfig,
  groq: groqConfig,
  gemini: geminiConfig,
};
/* eslint-disable @typescript-eslint/no-explicit-any */

const PROVIDER_CLASSES: Record<string, new (...args: any[]) => Provider> = {
  openai,
  groq,
  gemini,
};

export function createProvider(type: string, props: ProviderProps): Provider {
  const providerClass = PROVIDER_CLASSES[type];
  if (!providerClass) {
    throw new Error(`Unsupported provider type "${type}". Please re-create it in "Setup Providers".`);
  }
  return new providerClass(props);
}
