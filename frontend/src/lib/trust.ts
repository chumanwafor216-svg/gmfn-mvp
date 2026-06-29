// frontend/src/lib/trust.ts
// Small helpers for calling trust-related endpoints

import { getAccessToken } from "./api";

const TRUST_API_TIMEOUT_MS = 30000;

async function fetchTrustApi(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    TRUST_API_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function parseOrText(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const url = "/api" + (path.startsWith("/") ? path : `/${path}`);

  const t = token ?? getAccessToken();
  const headers: Record<string, string> = {};
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetchTrustApi(url, { method: "GET", headers });
  const data: any = await parseOrText(res);

  if (res.status === 401) {
    throw new Error("Unauthorized (401). Please log in again.");
  }
  if (!res.ok) {
    throw new Error(data?.detail || String(data) || `HTTP ${res.status}`);
  }

  return data as T;
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  const url = "/api" + (path.startsWith("/") ? path : `/${path}`);


  const t = token ?? getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetchTrustApi(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data: any = await parseOrText(res);

  if (res.status === 401) {
    throw new Error("Unauthorized (401). Please log in again.");
  }
  if (!res.ok) {
    throw new Error(data?.detail || String(data) || `HTTP ${res.status}`);
  }

  return data as T;
} 
