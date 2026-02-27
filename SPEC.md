# Octoparse MCP Server 仕様書

## 概要

Octoparse OpenAPI を利用した MCP (Model Context Protocol) サーバー。
**スタンダードプラン** で利用可能な API のみを対象とする。

スタンダードプランでは「データエクスポート API」が提供され、タスクグループ・タスクの参照およびデータの取得・エクスポート管理が可能。タスクの操作（開始・停止・パラメータ変更など）はプロフェッショナルプラン以上が必要なため、本 MCP サーバーの対象外とする。

## API 基本情報

| 項目 | 値 |
|------|-----|
| ベース URL | `https://openapi.octoparse.com` |
| 認証方式 | OAuth 2.0 Bearer Token |
| レート制限 | 20 リクエスト/秒（5秒間で最大100リクエスト、リーキーバケット方式） |
| データ取得上限 | 1回のリクエストで最大 1,000 行 |
| アクセストークン有効期限 | 24 時間 |
| リフレッシュトークン有効期限 | 15 日間 |
| レスポンス形式 | JSON |

## 認証

### アクセストークン取得

```
POST /token
Content-Type: application/json

{
  "username": "<Octoparse ユーザー名>",
  "password": "<Octoparse パスワード>",
  "grant_type": "password"
}
```

**レスポンス:**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 86400,
  "refresh_token": "..."
}
```

### アクセストークン更新

```
POST /token
Content-Type: application/json

{
  "refresh_token": "<リフレッシュトークン>",
  "grant_type": "refresh_token"
}
```

### 認証ヘッダー

全 API リクエストに以下のヘッダーが必要:
```
Authorization: Bearer <access_token>
```

## スタンダードプランで利用可能な API エンドポイント

### 1. タスクグループ一覧取得

```
GET /TaskGroup
Authorization: Bearer <access_token>
```

**レスポンス:**
```json
[
  {
    "taskGroupId": 12345,
    "taskGroupName": "グループ名"
  }
]
```

### 2. タスク一覧取得

```
GET /Task/Search?taskGroupId={taskGroupId}
Authorization: Bearer <access_token>
```

**パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskGroupId | integer (int32) | Yes | タスクグループ ID |

**レスポンス:**
```json
[
  {
    "taskId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "taskName": "タスク名"
  }
]
```

### 3. 未エクスポートデータ取得

未エクスポートのデータを取得する。取得後、データのステータスは「exporting」に変更される（「exported」ではない）。同じデータセットを複数回取得可能。

```
GET /data/notexported?taskId={taskId}&size={size}
Authorization: Bearer <access_token>
```

**パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |
| size | integer (int32) | Yes | 取得行数（1〜1000） |

**レスポンス:**
```json
{
  "total": 500,
  "offset": "...",
  "dataList": [
    { "フィールド名1": "値1", "フィールド名2": "値2" }
  ]
}
```

### 4. データステータス更新（エクスポート済みに変更）

未エクスポートデータのステータスを「exported」に更新する。

```
POST /data/markexported
Authorization: Bearer <access_token>
Content-Type: application/json

{ "taskId": "<タスク ID>" }
```

### 5. 全データ取得（オフセット指定）

データのエクスポートステータスに影響を与えずにデータを取得する。ページネーション対応。

```
GET /data/all?taskId={taskId}&offset={offset}&size={size}
Authorization: Bearer <access_token>
```

**パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |
| offset | integer (int64) | Yes | 開始位置（初回は 0） |
| size | integer (int32) | Yes | 取得行数（1〜1000） |

**レスポンス:**
```json
{
  "total": 5000,
  "offset": 1000,
  "dataList": [
    { "フィールド名1": "値1", "フィールド名2": "値2" }
  ],
  "restTotal": 4000
}
```

> **ページネーション:** レスポンスの `offset` 値を次のリクエストの `offset` パラメータに使用する。`restTotal` が 0 になるまで繰り返す。

### 6. タスクデータ削除

指定タスクの全データを削除する。

```
POST /data/remove
Authorization: Bearer <access_token>
Content-Type: application/json

{ "taskId": "<タスク ID>" }
```

## スタンダードプランでは利用不可（プロフェッショナル以上）

以下の API はプロフェッショナルプラン以上で利用可能な「Advanced API」に含まれ、本 MCP サーバーの対象外:

| 機能 | エンドポイント |
|------|-------------|
| タスクステータス一括取得 | POST `/task/getTaskStatusByIdList` |
| タスクパラメータ取得 | POST `/task/getTaskRulePropertyByName` |
| タスクパラメータ更新 | POST `/task/updateTaskRule` |
| タスクにURL/テキスト追加 | POST `/task/addUrlOrTextToTask` |
| タスク開始 | POST `/task/startTask` |
| タスク停止 | POST `/task/stopTask` |

## MCP Server 設計

### 技術スタック

| 項目 | 選択 |
|------|------|
| 言語 | TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk` |
| HTTP クライアント | `fetch` (Node.js built-in) |
| パッケージマネージャ | npm |
| ランタイム | Node.js >= 18 |

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `OCTOPARSE_USERNAME` | Yes | Octoparse アカウントのユーザー名 |
| `OCTOPARSE_PASSWORD` | Yes | Octoparse アカウントのパスワード |

### MCP Tools 定義

#### 1. `list_task_groups`

タスクグループの一覧を取得する。

**入力パラメータ:** なし

**出力:** タスクグループ ID と名前の一覧

---

#### 2. `list_tasks`

指定したタスクグループ内のタスク一覧を取得する。

**入力パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskGroupId | number (int32) | Yes | タスクグループ ID |

**出力:** タスク ID と名前の一覧

---

#### 3. `get_task_data`

指定したタスクのデータをオフセット指定で取得する。エクスポートステータスに影響を与えない。

**入力パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |
| offset | number | No | 開始位置（デフォルト: 0） |
| size | number | No | 取得行数（デフォルト: 100、最大: 1000） |

**出力:** データ行の配列、合計件数、次のオフセット値、残件数

---

#### 4. `get_not_exported_data`

未エクスポートのデータを取得する。取得後ステータスは「exporting」に変更される。

**入力パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |
| size | number | No | 取得行数（デフォルト: 100、最大: 1000） |

**出力:** 未エクスポートデータの配列、合計件数

---

#### 5. `mark_data_as_exported`

データのステータスを「exported」に更新する。

**入力パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |

**出力:** 成功/失敗のステータス

---

#### 6. `clear_task_data`

指定したタスクの全データを削除する。

**入力パラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| taskId | string | Yes | タスク ID |

**出力:** 成功/失敗のステータス

### 内部実装方針

#### トークン管理

- サーバー起動時にアクセストークンを取得
- トークンをメモリ内にキャッシュし、有効期限を追跡
- 有効期限の 5 分前にリフレッシュトークンで自動更新
- リフレッシュトークンも期限切れの場合はユーザー名/パスワードで再認証
- API レスポンスで 401 を受けた場合もトークンを再取得してリトライ

#### エラーハンドリング

| HTTP ステータス | 対応 |
|----------------|------|
| 401 Unauthorized | トークン再取得後リトライ |
| 403 Forbidden | プラン制限エラーとしてユーザーに通知 |
| 429 Too Many Requests | レート制限エラーとしてユーザーに通知 |
| 5xx | サーバーエラーとしてユーザーに通知 |

#### レート制限対策

- リクエスト間に最低 50ms の間隔を設ける
- 429 レスポンス時は適切なエラーメッセージを返す

### ディレクトリ構成

```
octoparse-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP サーバーエントリポイント
│   ├── octoparse-client.ts  # Octoparse API クライアント
│   ├── tools.ts          # MCP Tools 定義・ハンドラー
│   └── types.ts          # 型定義
└── README.md
```

### Claude Code 設定例

```bash
claude mcp add octoparse \
  -e OCTOPARSE_USERNAME=your-username \
  -e OCTOPARSE_PASSWORD=your-password \
  -- node /path/to/octoparse-mcp/dist/index.js
```

## 参考情報

- [Octoparse OpenAPI ドキュメント](https://openapi.octoparse.com/ja-JP/)
- [Octoparse Data API ドキュメント](http://dataapi.octoparse.com/DataApi/en-US/)
- [Octoparse ヘルプセンター - API FAQ](https://helpcenter.octoparse.com/en/articles/6471015-octoparse-api-faqs)
- [Octoparse プラン比較](https://helpcenter.octoparse.com/en/articles/6471103-compare-all-octoparse-plans)
- [Postman 接続ガイド](https://helpcenter.octoparse.com/en/articles/6471017-connect-to-octoparse-apis-with-postman)

## 注意事項

- エンドポイントのパスは Octoparse OpenAPI (`openapi.octoparse.com`) の形式に基づく。旧 Data API (`dataapi.octoparse.com`) とはパスが異なる場合がある。
- Octoparse 側の API 仕様変更により、パスやレスポンス形式が変わる可能性がある。実装時に最新のドキュメントを確認すること。
- `clear_task_data` は破壊的操作のため、MCP ツール呼び出し時に確認プロンプトの追加を推奨。
