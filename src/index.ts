#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OctoparseClient } from "./octoparse-client.js";
import { registerTools } from "./tools.js";

const username = process.env.OCTOPARSE_USERNAME;
const password = process.env.OCTOPARSE_PASSWORD;

if (!username || !password) {
  console.error(
    "環境変数 OCTOPARSE_USERNAME と OCTOPARSE_PASSWORD を設定してください。"
  );
  process.exit(1);
}

const client = new OctoparseClient(username, password);

const server = new McpServer({
  name: "octoparse",
  version: "1.0.0",
});

registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
