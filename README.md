# Google Search Console (GSC) Automation Project

自動化されたGoogle Search Consoleデータ収集・分析システム。複数のサイトから検索パフォーマンスデータを取得し、Googleスプレッドシートにエクスポートし、週間ランキングとトレンド分析を生成します。

## 📋 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [アーキテクチャ](#アーキテクチャ)
- [セットアップ](#セットアップ)
- [設定](#設定)
- [使用方法](#使用方法)
- [ファイル構造](#ファイル構造)
- [API要件](#api要件)
- [トラブルシューティング](#トラブルシューティング)

## 📖 概要

このプロジェクトは、Google Apps Scriptを使用してGoogle Search Console APIから検索パフォーマンスデータを自動的に取得し、分析するシステムです。複数のウェブサイト、国、デバイスタイプに対応し、日次データの収集から週間ランキングの生成まで、完全に自動化されています。

### 主な特徴

- ✅ **複数サイト対応**: 複数のウェブサイトを同時に監視
- ✅ **多国語・多デバイス対応**: 6カ国（米国、カナダ、イギリス、オーストラリア、ニュージーランド、シンガポール）と3デバイスタイプ（PC、スマホ、タブレット）
- ✅ **自動データ収集**: 日次または週次の自動データ取得
- ✅ **週間ランキング**: 週間データの集計とランキング計算
- ✅ **トレンド分析**: 週間のパフォーマンス変化を追跡
- ✅ **自動チャート生成**: 週間トレンドチャートの自動生成
- ✅ **日本語対応**: すべてのログ、エラーメッセージ、シート名が日本語

## 🚀 主な機能

### 1. 日次データ収集
- Google Search Console APIから検索パフォーマンスデータを取得
- クリック数、インプレッション数、CTR、平均ポジションを収集
- 検索クエリ、ページURL、国、デバイス別にデータを分類

### 2. 週間ランキング生成
- 日次データを週間データに集計
- 国別・デバイス別の週間ランキングを計算
- 前週との比較（変化率、トレンド方向）を計算

### 3. トレンド分析
- 週間のパフォーマンス変化を追跡
- トレンドインジケーター（↑、↓、→、NEW）を表示
- クリック数、インプレッション数、CTR、ポジションの変化を可視化

### 4. 自動チャート生成
- 週間パフォーマンストレンドチャートを自動生成
- 複数の指標を1つのチャートで表示
- ダッシュボードシートに自動配置

## 🏗️ アーキテクチャ

```
┌─────────────────┐
│   main.gs       │  ← エントリーポイント
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│ auth  │ │ gsc-client│  ← 認証とAPI呼び出し
└───────┘ └───────────┘
    │         │
    └────┬────┘
         │
┌────────▼──────────┐
│ data-processor    │  ← データ処理
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────────┐
│ sheet │ │ weekly-processor│  ← スプレッドシート管理と週間処理
└───────┘ └─────────────────┘
```

### 主要コンポーネント

- **main.gs**: メインオーケストレーションファイル
- **auth.gs**: サービスアカウント認証処理
- **gsc-client.gs**: Google Search Console APIクライアント
- **data-processor.gs**: データ処理とバリデーション
- **sheet-manager.gs**: スプレッドシート操作
- **weekly-processor.gs**: 週間データ集計とランキング計算
- **config.gs**: プロジェクト設定
- **utils.gs**: ユーティリティ関数

## ⚙️ セットアップ

### 前提条件

1. Googleアカウント
2. Google Apps Scriptプロジェクト
3. Google Cloud Platform (GCP) プロジェクト
4. サービスアカウントの作成と設定
5. Google Search Consoleプロパティへのアクセス権限

### セットアップ手順

#### 1. Google Cloud Platformでサービスアカウントを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを使用）
3. 「IAM & Admin」→「Service Accounts」に移動
4. 「Create Service Account」をクリック
5. サービスアカウント名を入力（例: `gsc-automation-service`）
6. 「Create and Continue」をクリック
7. ロールを割り当て（この時点では不要）
8. 「Done」をクリック

#### 2. サービスアカウントキーを生成

1. 作成したサービスアカウントをクリック
2. 「Keys」タブに移動
3. 「Add Key」→「Create new key」を選択
4. キータイプ: 「JSON」を選択
5. 「Create」をクリック（JSONファイルがダウンロードされます）

#### 3. サービスアカウント情報を設定

1. ダウンロードしたJSONファイルを開く
2. `auth.gs`ファイルの`SERVICE_ACCOUNT_CONFIG`に情報をコピー：

```javascript
const SERVICE_ACCOUNT_CONFIG = {
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\n...",
  client_email: "your-service-account@project.iam.gserviceaccount.com",
  // ... その他の設定
};
```

#### 4. Google Search Console APIを有効化

1. GCPコンソールで「APIs & Services」→「Library」に移動
2. 「Google Search Console API」を検索
3. 「Enable」をクリック

#### 5. サービスアカウントにGSCプロパティへのアクセス権限を付与

1. [Google Search Console](https://search.google.com/search-console)にアクセス
2. 各プロパティ（サイト）を選択
3. 「設定」→「ユーザーと権限」に移動
4. 「ユーザーを追加」をクリック
5. サービスアカウントのメールアドレス（`client_email`）を入力
6. 「所有者」または「フル」権限を付与

#### 6. スプレッドシートにサービスアカウントを共有

1. 使用するGoogleスプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを追加
4. 「編集者」権限を付与

#### 7. スプレッドシートIDを設定

`sheet-manager.gs`ファイルでスプレッドシートIDを設定：

```javascript
const SPREADSHEET_ID = "your-spreadsheet-id";
```

スプレッドシートIDは、スプレッドシートのURLから取得できます：
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

#### 8. サイト設定を更新

`config.gs`ファイルで監視するサイトを設定：

```javascript
const CONFIG = {
  sites: [
    {
      name: "Your Site Name",
      url: "https://your-site.com",
      property: "https://your-site.com/", // または "sc-domain:your-site.com"
      owner: "Client",
      description: "サイトの説明"
    }
  ],
  // ... その他の設定
};
```

#### 9. 初回実行とテスト

1. Google Apps Scriptエディタで`main()`関数を実行
2. 実行ログを確認してエラーがないかチェック
3. スプレッドシートにデータが正しくエクスポートされているか確認

## 🔧 設定

### config.gs の主要設定

#### データ設定

```javascript
data: {
  dateRange: 20,              // データを取得する日数
  updateFrequency: "daily",   // "daily" または "weekly"
  countries: ["usa", "can", "gbr", "aus", "nzl", "sgp"],
  devices: ["desktop", "mobile", "tablet"],
  rowLimit: 1500             // API呼び出しあたりの最大行数
}
```

#### 週間ランキング設定

```javascript
const WEEKLY_CONFIG = {
  enabled: true,                    // 週間ランキングを有効化
  aggregationMethod: "sum",         // "sum", "average", "max"
  rankingMetrics: ["clicks", "impressions", "ctr", "position"],
  topRankings: 50,                  // 表示するトップランキング数
  weekStartDay: 1,                  // 1=月曜日、0=日曜日
  enableTrends: true,               // トレンド分析を有効化
  historicalTracking: true          // 履歴データ追跡を有効化
}
```

#### ログ設定

```javascript
const LOGGING = {
  enabled: true,
  level: "INFO",                    // "DEBUG", "INFO", "WARN", "ERROR"
  emailNotifications: true,
  notificationEmail: "your-email@example.com",
  language: "ja"                    // 日本語ログ
}
```

## 📝 使用方法

### 手動実行

1. Google Apps Scriptエディタを開く
2. `main()`関数を選択
3. 「実行」ボタンをクリック

### 自動実行の設定

`setupTriggers()`関数を実行して、自動実行トリガーを設定：

```javascript
function setupTriggers() {
  // 日次実行（毎日9時）
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}
```

### 週間ランキングの生成

週間ランキングは`main()`関数の実行時に自動的に処理されます。手動で実行する場合：

```javascript
function runWeeklyProcessor() {
  const processor = new WeeklyProcessor();
  const dailyData = getDailyDataFromSpreadsheet();
  const result = processor.processWeeklyRankings(dailyData);
  exportWeeklyRankingsToSpreadsheet(result.reports);
}
```

### 週間チャートの生成

```javascript
function generateWeeklyCharts() {
  // 週間トレンドチャートを生成
}
```

### 特定の週のデータを取得

```javascript
function runOct13To19WeekProcessor() {
  // 2025年10月13日〜19日の週データを処理
}
```

## 📁 ファイル構造

```
Google Apps Script - Google Console/
│
├── main.gs                 # メインオーケストレーションファイル
├── config.gs                # プロジェクト設定と定数
├── auth.gs                  # サービスアカウント認証
├── gsc-client.gs            # Google Search Console APIクライアント
├── data-processor.gs        # データ処理とバリデーション
├── sheet-manager.gs         # スプレッドシート操作
├── weekly-processor.gs      # 週間データ集計とランキング計算
├── utils.gs                 # ユーティリティ関数
└── README.md                # このファイル
```

### 各ファイルの役割

- **main.gs**: システムのエントリーポイント。すべての処理をオーケストレート
- **config.gs**: サイト設定、API設定、スプレッドシートテンプレート定義
- **auth.gs**: サービスアカウント認証とトークン管理
- **gsc-client.gs**: GSC APIへのリクエスト送信とレスポンス処理
- **data-processor.gs**: 生データの処理、バリデーション、変換
- **sheet-manager.gs**: スプレッドシートの作成、更新、フォーマット
- **weekly-processor.gs**: 週間データの集計、ランキング計算、トレンド分析
- **utils.gs**: 日付処理、文字列操作などの共通ユーティリティ

## 🔌 API要件

### 必要なAPI

1. **Google Search Console API**
   - 検索パフォーマンスデータの取得
   - スコープ: `https://www.googleapis.com/auth/webmasters.readonly`

2. **Google Sheets API**
   - スプレッドシートへのデータ書き込み
   - スコープ: `https://www.googleapis.com/auth/spreadsheets`

3. **Google Drive API**
   - スプレッドシートの作成と管理
   - スコープ: `https://www.googleapis.com/auth/drive`

### APIクォータ

- Google Search Console API: 1日あたり2,000リクエスト
- Google Sheets API: 1分あたり300リクエスト
- Google Drive API: 1分あたり1,000リクエスト

## 🐛 トラブルシューティング

### 認証エラー

**問題**: `Authentication failed` または `Service account setup required`

**解決方法**:
1. サービスアカウントがGSCプロパティに追加されているか確認
2. スプレッドシートがサービスアカウントと共有されているか確認
3. `auth.gs`の`SERVICE_ACCOUNT_CONFIG`が正しく設定されているか確認
4. `testAuthentication()`関数を実行して認証をテスト

### データが取得できない

**問題**: データがスプレッドシートに表示されない

**解決方法**:
1. GSC APIが有効になっているか確認
2. サービスアカウントに適切な権限が付与されているか確認
3. `config.gs`のサイト設定が正しいか確認
4. 実行ログを確認してエラーメッセージを確認

### 週間ランキングが生成されない

**問題**: 週間ランキングシートが空または更新されない

**解決方法**:
1. `WEEKLY_CONFIG.enabled`が`true`に設定されているか確認
2. 「全サイトデータ」シートにデータが存在するか確認
3. `getDailyDataFromSpreadsheet()`関数が正しくデータを取得しているか確認
4. 実行ログで週間処理のエラーを確認

### チャートが表示されない

**問題**: 週間トレンドチャートが生成されない

**解決方法**:
1. 週間ランキングシートにデータが存在するか確認
2. `generateWeeklyCharts()`関数を手動で実行
3. チャートの配置位置（行、列）が正しいか確認

### スプレッドシートが見つからない

**問題**: `Spreadsheet not found` エラー

**解決方法**:
1. `sheet-manager.gs`の`SPREADSHEET_ID`が正しいか確認
2. スプレッドシートがサービスアカウントと共有されているか確認
3. スプレッドシートIDがURLから正しく取得できているか確認

## 📊 スプレッドシート構造

### シート一覧

1. **全サイトデータ**: すべてのサイトの日次データを統合
2. **[サイト名]**: 各サイトの個別データシート
3. **サマリーダッシュボード**: サイト別のサマリー情報
4. **APIステータス**: API実行状況とステータス
5. **[国名]週間ランキング**: 国別の週間ランキング（6シート）

### 週間ランキングシートの列

- 週
- 国
- デバイス
- 検索クエリ
- ページURL
- クリック数
- インプレッション数
- CTR
- 平均ポジション
- 週間ランキング
- トレンド
- クリック数変化
- インプレッション数変化
- CTR変化
- ポジション変化

## 🔒 セキュリティ

### 重要な注意事項

1. **サービスアカウントキー**: 秘密鍵は絶対に公開しないでください
2. **スプレッドシートID**: 機密情報が含まれる可能性があるため、慎重に扱ってください
3. **アクセス権限**: サービスアカウントには必要最小限の権限のみを付与してください

### ベストプラクティス

- サービスアカウントキーをバージョン管理システムにコミットしない
- 定期的にアクセス権限を確認
- 不要なAPIアクセスを無効化

## 📞 サポート

問題が発生した場合：

1. 実行ログを確認
2. エラーメッセージを確認
3. このREADMEのトラブルシューティングセクションを参照
4. 設定ファイル（`config.gs`、`auth.gs`）を再確認

## 📝 ライセンス

このプロジェクトはクライアント専用のプロプライエタリプロジェクトです。

## 🔄 更新履歴

- **v1.0**: 初期リリース
  - 日次データ収集機能
  - 週間ランキング生成機能
  - トレンド分析機能
  - 自動チャート生成機能

---

**作成日**: 2025年
**最終更新**: 2025年10月
**バージョン**: 1.0

