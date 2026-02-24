// frontend/src/api/public.ts

export type PublicUser = {
  id: string | number;
  email?: string;
  name?: string;
  [k: string]: any;
};

export type PublicClan = {
  id: number | string;
  name?: string;
  [k: string]: any;
};

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || `API error ${res.status}`);
  }
}

export async function getPublicUser(userId: string | number): Promise<PublicUser> {
  const id = encodeURIComponent(String(userId));
  const res = await fetch(`/public/users/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return safeJson<PublicUser>(res);
}

export async function getPublicClan(clanId: string | number): Promise<PublicClan> {
  const id = encodeURIComponent(String(clanId));
  const res = await fetch(`/public/clans/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return safeJson<PublicClan>(res);
}
