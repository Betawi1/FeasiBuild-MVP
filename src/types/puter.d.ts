/** Puter.js loaded from https://js.puter.com/v2/ */
interface PuterChatResponse {
  message?: { content?: string; role?: string };
  text?: string;
  content?: string;
}

interface PuterAI {
  chat(
    prompt: string,
    options?: { model?: string; stream?: boolean }
  ): Promise<PuterChatResponse | string>;
}

interface PuterKV {
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  list(): Promise<string[]>;
}

interface PuterAuth {
  getUser(): Promise<{ username?: string; email?: string } | null | undefined>;
}

interface PuterGlobal {
  ai: PuterAI;
  kv: PuterKV;
  auth: PuterAuth;
}

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

export {};
