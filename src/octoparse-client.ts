import type {
  TokenResponse,
  ApiResponse,
  TaskGroup,
  Task,
  DataResult,
} from "./types.js";

const BASE_URL = "https://openapi.octoparse.com";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes before expiry

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
      // Refresh failed, fall back to full auth
      return this.authenticate();
    }

    const token: TokenResponse = await res.json();
    this.setToken(token);
  }

  private setToken(token: TokenResponse): void {
    this.accessToken = token.access_token;
    this.refreshToken = token.refresh_token;
    this.tokenExpiresAt = Date.now() + token.expires_in * 1000;
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

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string | number>,
    retry = true
  ): Promise<T> {
    const token = await this.ensureToken();

    let url = `${BASE_URL}${path}`;
    if (params && (method === "GET" || method === "DELETE")) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        qs.set(k, String(v));
      }
      url += `?${qs.toString()}`;
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body:
        method !== "GET" && params ? JSON.stringify(params) : undefined,
    });

    if (res.status === 401 && retry) {
      this.accessToken = null;
      await this.authenticate();
      return this.request<T>(method, path, params, false);
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
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Public API Methods ---

  async listTaskGroups(): Promise<ApiResponse<TaskGroup[]>> {
    return this.request<ApiResponse<TaskGroup[]>>("GET", "/taskGroup");
  }

  async listTasks(taskGroupId: string): Promise<ApiResponse<Task[]>> {
    return this.request<ApiResponse<Task[]>>("GET", "/task", {
      taskGroupId,
    });
  }

  async getTaskData(
    taskId: string,
    offset: number = 0,
    size: number = 100
  ): Promise<ApiResponse<DataResult>> {
    return this.request<ApiResponse<DataResult>>(
      "GET",
      "/alldata/getDataOfTaskByOffset",
      { taskId, offset, size }
    );
  }

  async getNotExportedData(
    taskId: string,
    size: number = 100
  ): Promise<ApiResponse<DataResult>> {
    return this.request<ApiResponse<DataResult>>(
      "GET",
      "/data/notexported",
      { taskId, size }
    );
  }

  async markDataAsExported(
    taskId: string
  ): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(
      "POST",
      "/data/notexported/update",
      { taskId }
    );
  }

  async clearTaskData(taskId: string): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>(
      "POST",
      "/task/removeDataByTaskId",
      { taskId }
    );
  }
}
