// frontend/src/lib/trust.ts
// Small helpers for calling trust-related endpoints

import { getAccessToken } from "./api";

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

  const res = await fetch(url, { method: "GET", headers });
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

  const res = await fetch(url, {
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
