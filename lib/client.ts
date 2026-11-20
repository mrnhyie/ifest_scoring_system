import type { AuthStatus, BoardState } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseJson(res: Response): Promise<any> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || "Request failed. Try again.");
  }
  return data;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth", { cache: "no-store" });
  return parseJson(res);
}

export async function fetchState(rev?: number): Promise<BoardState | null> {
  const url = rev == null ? "/api/state" : `/api/state?rev=${rev}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await parseJson(res);
  return data.unchanged ? null : (data.state as BoardState);
}

export async function postJSON<T = { state: BoardState }>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function postForm<T = { state: BoardState }>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: form, cache: "no-store" });
  return parseJson(res);
}
