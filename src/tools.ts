import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OctoparseClient } from "./octoparse-client.js";

export function registerTools(server: McpServer, client: OctoparseClient): void {
  // 1. list_task_groups
  server.tool(
    "list_task_groups",
    "タスクグループの一覧を取得します",
    {},
    async () => {
      const res = await client.listTaskGroups();
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(res.data, null, 2),
          },
        ],
      };
    }
  );

  // 2. list_tasks
  server.tool(
    "list_tasks",
    "指定したタスクグループ内のタスク一覧を取得します",
    {
      taskGroupId: z.string().describe("タスクグループ ID"),
    },
    async ({ taskGroupId }) => {
      const res = await client.listTasks(taskGroupId);
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(res.data, null, 2),
          },
        ],
      };
    }
  );

  // 3. get_task_data
  server.tool(
    "get_task_data",
    "指定したタスクのデータをオフセット指定で取得します（エクスポートステータスに影響なし）",
    {
      taskId: z.string().describe("タスク ID"),
      offset: z.number().int().min(0).default(0).describe("開始位置（デフォルト: 0）"),
      size: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe("取得行数（1〜1000、デフォルト: 100）"),
    },
    async ({ taskId, offset, size }) => {
      const res = await client.getTaskData(taskId, offset, size);
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      const summary = `合計: ${res.data.total} 件 | 取得: ${res.data.dataList.length} 件 | 次のオフセット: ${res.data.offset} | 残り: ${res.data.restTotal ?? "不明"}`;
      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(res.data.dataList, null, 2) },
        ],
      };
    }
  );

  // 4. get_not_exported_data
  server.tool(
    "get_not_exported_data",
    "未エクスポートのデータを取得します（取得後ステータスは exporting に変更されます）",
    {
      taskId: z.string().describe("タスク ID"),
      size: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe("取得行数（1〜1000、デフォルト: 100）"),
    },
    async ({ taskId, size }) => {
      const res = await client.getNotExportedData(taskId, size);
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      const summary = `合計: ${res.data.total} 件 | 取得: ${res.data.dataList.length} 件`;
      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(res.data.dataList, null, 2) },
        ],
      };
    }
  );

  // 5. mark_data_as_exported
  server.tool(
    "mark_data_as_exported",
    "未エクスポートデータのステータスを exported に更新します",
    {
      taskId: z.string().describe("タスク ID"),
    },
    async ({ taskId }) => {
      const res = await client.markDataAsExported(taskId);
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      return {
        content: [{ type: "text", text: "データステータスを exported に更新しました。" }],
      };
    }
  );

  // 6. clear_task_data
  server.tool(
    "clear_task_data",
    "指定したタスクの全データを削除します（この操作は取り消せません）",
    {
      taskId: z.string().describe("タスク ID"),
    },
    async ({ taskId }) => {
      const res = await client.clearTaskData(taskId);
      if (res.error !== "success") {
        return { content: [{ type: "text", text: `エラー: ${res.error_Description}` }] };
      }
      return {
        content: [{ type: "text", text: "タスクデータを削除しました。" }],
      };
    }
  );
}
