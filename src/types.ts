export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
  refresh_token: string;
}

// Legacy API wraps responses in {data, error, error_Description}.
// New API may return data directly.
export interface WrappedResponse<T> {
  data: T;
  error: string;
  error_Description: string;
}

export interface TaskGroup {
  taskGroupId: number;
  taskGroupName: string;
}

export interface Task {
  taskId: string;
  taskName: string;
}

export interface DataResult {
  total: number;
  offset: string | number;
  dataList: Record<string, string>[];
  restTotal?: number;
}
