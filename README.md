# Octoparse MCP Server

Octoparse OpenAPI を利用した MCP サーバー。スタンダードプランで利用可能な API に対応。

stdio トランスポートで動作するため、ポート開放不要。

## 必要環境

- Node.js >= 18
- Octoparse スタンダードプラン以上のアカウント

## セットアップ

```bash
git clone https://github.com/itsumonotakumi/octoparse-mcp.git
cd octoparse-mcp
npm install
npm run build
npm test          # テスト実行
```

## 利用可能なツール

| ツール | 説明 |
|--------|------|
| `list_task_groups` | タスクグループ一覧を取得 |
| `list_tasks` | 指定グループ内のタスク一覧を取得 |
| `get_task_data` | タスクデータをオフセット指定で取得（エクスポートステータス影響なし） |
| `get_not_exported_data` | 未エクスポートデータを取得（ステータスが exporting に変更される） |
| `mark_data_as_exported` | データステータスを exported に更新 |
| `clear_task_data` | タスクの全データを削除（取り消し不可） |

## MCP クライアントの設定

Claude Code で使う場合:

```bash
claude mcp add octoparse \
  -e OCTOPARSE_USERNAME=your-username \
  -e OCTOPARSE_PASSWORD=your-password \
  -- node /path/to/octoparse-mcp/dist/index.js
```

または、プロジェクトルートに `.env` ファイルを作成して環境変数を設定:

```
OCTOPARSE_USERNAME=your-username
OCTOPARSE_PASSWORD=your-password
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `OCTOPARSE_USERNAME` | Yes | Octoparse アカウントのユーザー名 |
| `OCTOPARSE_PASSWORD` | Yes | Octoparse アカウントのパスワード |

## API 仕様

- ベース URL: `https://openapi.octoparse.com`
- 認証: OAuth 2.0 Bearer Token（自動取得・自動更新）
- レート制限: 20 リクエスト/秒
- データ取得上限: 1 リクエストあたり最大 1,000 行

詳細は [SPEC.md](SPEC.md) を参照。
