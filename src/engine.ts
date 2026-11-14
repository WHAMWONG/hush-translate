import { environment } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { access, chmod, constants } from "fs/promises";
import path from "path";
import { createInterface } from "readline";

/** The Swift helper in `Sources/translator`: Apple Intelligence, Vision OCR and the pasteboard. */
const binary = path.join(environment.assetsPath, "translator");

/** Where captured screenshots and clipboard images are kept while history refers to them. */
export const imageDirectory = path.join(environment.supportPath, "images");

export type UnavailableReason = "notEnabled" | "notReady" | "notEligible" | "unknown";
export const UNAVAILABLE_REASONS: readonly string[] = ["notEnabled", "notReady", "notEligible", "unknown"];

export interface Status {
  available: boolean;
  reason?: UnavailableReason;
}

/** Text taken from the clipboard or read out of an image. */
export interface Capture {
  kind: "text" | "image" | "empty";
  text?: string;
  image?: string;
}

export interface Translation {
  from: string;
  to: string;
  text: string;
}

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let executable: Promise<void> | undefined;

/** Bundling can drop the executable bit from files in `assets`. */
function ensureExecutable() {
  executable ??= access(binary, constants.X_OK).catch(() => chmod(binary, 0o755));
  return executable;
}

function parseLine(line: string) {
  const message = JSON.parse(line);
  if (message.type === "error") throw new EngineError(message.code, message.message);
  return message;
}

/** Runs a subcommand that answers with a single JSON line. */
async function run<T>(args: string[]): Promise<T> {
  await ensureExecutable();
  return new Promise<T>((resolve, reject) => {
    execFile(binary, args, { maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
      try {
        const line = stdout.trim().split("\n").pop();
        if (!line) throw error ?? new EngineError("failed", "The translator did not answer.");
        resolve(parseLine(line));
      } catch (failure) {
        reject(failure);
      }
    });
  });
}

export const getStatus = () => run<Status>(["status"]);
export const readClipboard = () => run<Capture>(["clipboard", "--out", imageDirectory]);
export const recognizeText = (image: string) => run<Capture>(["ocr", "--file", image]);

interface TranslateOptions {
  /** Preferred target language. */
  to: string;
  /** Target to use instead when the text is already in `to`. */
  alt?: string;
  signal?: AbortSignal;
  onStart?: (from: string, to: string) => void;
  onText?: (text: string) => void;
}

/** Translates `text`, reporting the growing result as the model writes it. */
export async function translate(text: string, options: TranslateOptions): Promise<Translation> {
  await ensureExecutable();
  const args = ["translate", "--to", options.to, ...(options.alt ? ["--alt", options.alt] : [])];
  const child = spawn(binary, args, { signal: options.signal, stdio: ["pipe", "pipe", "ignore"] });

  return new Promise<Translation>((resolve, reject) => {
    const result: Translation = { from: "", to: options.to, text: "" };
    let finished = false;
    let failure: unknown;

    createInterface({ input: child.stdout }).on("line", (line) => {
      try {
        const message = parseLine(line);
        if (message.type === "start") {
          result.from = message.from;
          result.to = message.to;
          options.onStart?.(message.from, message.to);
        } else if (message.type === "text") {
          options.onText?.(message.text);
        } else if (message.type === "done") {
          result.text = message.text;
          finished = true;
        }
      } catch (error) {
        failure ??= error;
      }
    });

    child.on("error", reject);
    child.on("close", () => {
      if (failure) reject(failure);
      else if (finished) resolve(result);
      else reject(new EngineError("failed", "The translation stopped unexpectedly."));
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(text);
  });
}
