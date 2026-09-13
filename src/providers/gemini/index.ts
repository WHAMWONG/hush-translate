/* eslint-disable @typescript-eslint/no-explicit-any */
import { Provider, Message } from "../base";
import { Prompt } from "../prompt";
import { ProviderProps, TranslateQuery } from "../types";
import { fetchSSE, SSETransform } from "../utils";
/* @ts-expect-error: has no exported member 'compose' */
import { compose } from "stream";
import config from "./config";

// Thinking can't be turned off on Gemini 3.x and delays the first token, so keep it as low
// as the model allows. gemini-3.7+ doesn't accept "minimal"; 2.x uses thinkingBudget instead.
function thinkingLevel(model: string | undefined): string | undefined {
  const [, major, minor] = model?.match(/^gemini-(\d+)(?:\.(\d+))?/) ?? [];
  if (!major || Number(major) < 3) {
    return undefined;
  }
  if (Number(major) > 3 || Number(minor ?? 0) >= 7) {
    return "low";
  }
  return "minimal";
}

// Uses Gemini's native streaming API. The OpenAI-compatible endpoint was measured at
// 0.7–12s before the first byte, versus a steady ~0.7s here.
export default class extends Provider {
  protected model: string | undefined;
  protected apikey: string | undefined;

  constructor(props: ProviderProps) {
    super(props);
    this.model = props.apiModel || config.defaultModel?.id;
    this.apikey = props.apikey;
  }

  protected async *doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message> {
    const { rolePrompt, assistantPrompts, commandPrompt, contentPrompt } = prompt;
    const level = thinkingLevel(this.model);
    const body = {
      systemInstruction: { parts: [{ text: rolePrompt }] },
      contents: [
        {
          role: "user",
          parts: [...assistantPrompts, commandPrompt, contentPrompt].filter((text) => text).map((text) => ({ text })),
        },
      ],
      generationConfig: level ? { thinkingConfig: { thinkingLevel: level } } : {},
    };
    // Providers saved earlier may carry the old OpenAI-compatible entrypoint, so always use the native one
    const url = `${config.defaultEntrypoint}/models/${this.model}:streamGenerateContent?alt=sse`;
    const source = await fetchSSE(url, {
      method: "POST",
      signal: query.signal,
      agent: query.agent,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apikey ?? "",
      },
      body: JSON.stringify(body),
    } as any);

    yield* compose(source, new SSETransform(), this.handleMessage(prompt));
  }

  handleMessage(prompt: Prompt): (source: any) => AsyncGenerator<Message> {
    return async function* (source) {
      const { quoteProcessor, meta } = prompt;
      const { isWordMode } = meta;
      let finished = false;
      for await (const chunk of source) {
        if (!chunk || finished) {
          continue;
        }
        let resp;
        try {
          resp = JSON.parse(chunk.data);
        } catch (error) {
          console.debug({ error: "Parse error" });
          continue;
        }
        if (resp.error) {
          finished = true;
          yield resp.error.message || "error";
          continue;
        }
        const candidate = resp.candidates?.[0];
        const text = (candidate?.content?.parts ?? [])
          .filter((part: any) => part.text && !part.thought)
          .map((part: any) => part.text)
          .join("");
        if (text) {
          yield { content: quoteProcessor ? quoteProcessor.processText(text) : text, isWordMode };
        }
        if (candidate?.finishReason) {
          finished = true;
          yield candidate.finishReason === "STOP" ? "stop" : String(candidate.finishReason).toLowerCase();
        }
      }
      // The stream ended without a finishReason; finish anyway so the UI doesn't keep loading
      if (!finished) {
        yield "stop";
      }
    };
  }
}
