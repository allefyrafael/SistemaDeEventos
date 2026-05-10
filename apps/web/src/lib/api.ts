// Wrapper de chamadas ao backend Nest com injecao automatica de Bearer token
// e refresh transparente (retry 1x em 401 trocando o refresh token).

import { getTokens, setTokens, clearTokens } from './auth-store';

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiInit extends Omit<RequestInit, 'body'> {
  body?: RequestInit['body'] | Record<string, unknown> | unknown[];
}

function normalizeInit(init: ApiInit): RequestInit {
  const { body, ...rest } = init;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams)
  ) {
    return { ...rest, body: JSON.stringify(body) };
  }
  return { ...rest, body: body as RequestInit['body'] | undefined };
}

async function rawFetch(path: string, init: ApiInit, token?: string | null): Promise<Response> {
  const url = path.startsWith('/api') ? path : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  const normalized = normalizeInit(init);
  const headers = new Headers(normalized.headers);
  if (!headers.has('Content-Type') && normalized.body && typeof normalized.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...normalized, headers });
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : (null as unknown);
  if (!res.ok) {
    const msg = (body as { message?: string | string[] } | null)?.message;
    throw new ApiError(Array.isArray(msg) ? msg.join('; ') : msg ?? res.statusText, res.status, body);
  }
  return body as T;
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const tokens = getTokens();
  let res = await rawFetch(path, init, tokens?.accessToken);

  if (res.status === 401 && tokens?.refreshToken) {
    const refreshRes = await rawFetch('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
    });
    if (refreshRes.ok) {
      const newTokens = (await refreshRes.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; nome: string; tipoPerfil: 'ADMIN' | 'COMPANY' | 'STUDENT' };
      };
      setTokens(newTokens);
      res = await rawFetch(path, init, newTokens.accessToken);
    } else {
      clearTokens();
    }
  }

  return parseResponse<T>(res);
}

export function apiDownload(path: string): string {
  const tokens = getTokens();
  const url = path.startsWith('/api') ? path : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  // Para download autenticado via link, fica a cargo do caller adicionar
  // Authorization via fetch+blob se necessario. Aqui retornamos apenas a URL.
  return tokens?.accessToken ? `${url}?__t=${encodeURIComponent(tokens.accessToken)}` : url;
}

export async function apiDownloadBlob(path: string): Promise<Blob> {
  const tokens = getTokens();
  const res = await rawFetch(path, { method: 'GET' }, tokens?.accessToken);
  if (!res.ok) throw new ApiError(res.statusText, res.status, await res.text());
  return res.blob();
}
