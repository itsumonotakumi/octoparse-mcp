export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface ApiResponse<T> {
  data: T;
  error: string;
  error_Description: string;
}

export interface TaskGroup {
  taskGroupId: string;
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
