import type {
  TokenResponse,
  WrappedResponse,
  TaskGroup,
  Task,
  DataResult,
} from "./types.js";

const BASE_URL = "https://openapi.octoparse.com";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Unwrap API response: handles both new (direct) and legacy (wrapped) formats.
 * Legacy format: { data: T, error: "success", error_Description: "" }
 * New format: T directly
 *
 * Detection: legacy wrapper has "error" as a string (not in data payloads).
 */
export function unwrap<T>(raw: unknown): T {
  if (
    raw !== null &&
    typeof raw === "object" &&
    "data" in raw &&
    "error" in raw &&
    typeof (raw as Record<string, unknown>).error === "string"
  ) {
    const wrapped = raw as WrappedResponse<T>;
    if (wrapped.error !== "success") {
      throw new Error(`API error: ${wrapped.error_Description || wrapped.error}`);
    }
    return wrapped.data;
  }
  return raw as T;
}

export class OctoparseClient {
  private username: string;
  private password: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  // --- Token Management ---

  private async authenticate(): Promise<void> {
    const res = await fetch(`${BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        grant_type: "password",
      }),
    });

    if (!res.ok) {
      throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
    }

    const token: TokenResponse = await res.json();
    this.setToken(token);
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      return this.authenticate();
    }

    const res = await fetch(`${BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      return this.authenticate();
    }

    const token: TokenResponse = await res.json();
    this.setToken(token);
  }

  private setToken(token: TokenResponse): void {
    this.accessToken = token.access_token;
    this.refreshToken = token.refresh_token;
    // expires_in may be string or number per Swagger spec
    const parsed = typeof token.expires_in === "string"
      ? parseInt(token.expires_in, 10)
      : token.expires_in;
    const expiresIn = Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
  }

  private async ensureToken(): Promise<string> {
    if (
      !this.accessToken ||
      Date.now() >= this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS
    ) {
      if (this.refreshToken && Date.now() < this.tokenExpiresAt) {
        await this.refreshAccessToken();
      } else {
        await this.authenticate();
      }
    }
    return this.accessToken!;
  }

  // --- HTTP ---

  private async get<T>(
    path: string,
    query?: Record<string, string | number>,
    retry = true,
  ): Promise<T> {
    const token = await this.ensureToken();

    let url = `${BASE_URL}${path}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        qs.set(k, String(v));
      }
      url += `?${qs.toString()}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    return this.handleResponse<T>(res, () => this.get<T>(path, query, false), retry);
  }

  private async post<T>(
    path: string,
    body?: Record<string, unknown>,
    retry = true,
  ): Promise<T> {
    const token = await this.ensureToken();
    const url = `${BASE_URL}${path}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(res, () => this.post<T>(path, body, false), retry);
  }

  private async handleResponse<T>(
    res: Response,
    retryFn: () => Promise<T>,
    retry: boolean,
  ): Promise<T> {
    if (res.status === 401 && retry) {
      this.accessToken = null;
      await this.authenticate();
      return retryFn();
    }

    if (res.status === 403) {
      throw new Error(
        "403 Forbidden: この操作はプロフェッショナルプラン以上が必要です。"
      );
    }

    if (res.status === 429) {
      throw new Error(
        "429 Too Many Requests: レート制限に達しました。しばらく待ってから再試行してください。"
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const json: unknown = await res.json();
    return unwrap<T>(json);
  }

  // --- Public API Methods (New OpenAPI endpoints) ---

  async listTaskGroups(): Promise<TaskGroup[]> {
    return this.get<TaskGroup[]>("/TaskGroup");
  }

  async listTasks(taskGroupId: number): Promise<Task[]> {
    return this.get<Task[]>("/Task/Search", { taskGroupId });
  }

  async getTaskData(
    taskId: string,
    offset: number = 0,
    size: number = 100,
  ): Promise<DataResult> {
    return this.get<DataResult>("/data/all", { taskId, offset, size });
  }

  async getNotExportedData(
    taskId: string,
    size: number = 100,
  ): Promise<DataResult> {
    return this.get<DataResult>("/data/notexported", { taskId, size });
  }

  async markDataAsExported(taskId: string): Promise<unknown> {
    return this.post<unknown>("/data/markexported", { taskId });
  }

  async clearTaskData(taskId: string): Promise<unknown> {
    return this.post<unknown>("/data/remove", { taskId });
  }
}
