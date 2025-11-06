/**
 * GSC自動化プロジェクト設定ファイル
 * すべてのプロジェクト設定と定数を含む
 */

// プロジェクト設定
const CONFIG = {
  // クライアントサイト設定 - 現在はブログサイトのみでテスト中
  sites: [
    {
      name: "Bespoke Discovery Blog",
      url: "https://blog.bespoke-discovery.com",
      property: "https://blog.bespoke-discovery.com/",
      owner: "Client",
      description: "ブログサブドメイン追跡 - サービスアカウントテスト"
    }
    // テストのためメインサイトは一時的に無効化
    // {
    //   name: "Bespoke Discovery Main Site",
    //   url: "https://bespoke-discovery.com",
    //   property: "sc-domain:bespoke-discovery.com",
    //   owner: "Client",
    //   description: "メインウェブサイト追跡"
    // }
    // Shirofuneは削除 - クライアントがまだアクセスを追加していない
    // {
    //   name: "Shirofune Main Site", 
    //   url: "https://shirofune.com",
    //   property: "https://shirofune.com/",
    //   owner: "Client's Client",
    //   description: "メインサイトサブディレクトリ追跡"
    // }
  ],
  
  // データ設定
  data: {
    dateRange: 20, // データを取得する日数
    updateFrequency: "daily", // "daily" または "weekly"    
    countries: ["usa", "can", "gbr", "aus", "nzl", "sgp"], // 英語圏市場
    devices: ["desktop", "mobile", "tablet"], // PC、スマートフォン、タブレット
    rowLimit: 1500 // API呼び出しあたりの最大行数
  },
  
  // 国とデバイス名マッピング（日本語）
  countryMapping: {
    "usa": "米国",
    "can": "カナダ", 
    "gbr": "イギリス",
    "aus": "オーストラリア",
    "nzl": "ニュージーランド",
    "sgp": "シンガポール"
  },
  
  deviceMapping: {
    "desktop": "パソコン",
    "mobile": "スマホ全般", 
    "tablet": "タブレット"
  },
  
  // API設定
  api: {
    maxRetries: 3,
    retryDelay: 1000, // ミリ秒
    batchSize: 100
  },
  
  // スプレッドシート設定
  spreadsheet: {
    timezone: "Asia/Tokyo", // 日本標準時
    locale: "en", // 英語ロケール
    dateFormat: "yyyy-MM-dd" // 日付形式
  }
};

// 週間ランキング設定
const WEEKLY_CONFIG = {
  enabled: true,
  aggregationMethod: "sum", // sum、average、max
  rankingMetrics: ["clicks", "impressions", "ctr", "position"],
  reportFormat: "weekly_rankings",
  rankingPeriod: "weekly", // weekly、monthly
  topRankings: 50, // 表示するトップランキング数
  weekStartDay: 1, // 1=月曜日、0=日曜日
  // フェーズ3: トレンド分析設定
  enableTrends: true, // 週間トレンド計算を有効化
  historicalTracking: true, // 履歴データ追跡を有効化
  supportedFilters: ["country", "query", "device"], // データビューで利用可能なフィルター
  trendIndicators: {
    up: "↑",
    down: "↓",
    stable: "→",
    new: "NEW"
  }
};

// OAuth 2.0設定はauth.gsで定義

// スプレッドシートテンプレート設定（日本語）
const SPREADSHEET_TEMPLATE = {
  fileName: "GSC検索パフォーマンスレポート - 全サイト",
  sheets: [
    {
      name: "全サイトデータ",
      columns: [
        "サイト",
        "日付",
        "検索クエリ",
        "ページURL",
        "国",
        "デバイス",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション"
      ]
    },
    {
      name: "Bespoke Discovery Main",
      columns: [
        "日付",
        "検索クエリ",
        "ページURL",
        "国",
        "デバイス",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション"
      ]
    },
    {
      name: "Bespoke Discovery Blog",
      columns: [
        "日付",
        "検索クエリ",
        "ページURL",
        "国",
        "デバイス",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション"
      ]
    },
    {
      name: "Shirofune Main Site",
      columns: [
        "日付",
        "検索クエリ",
        "ページURL",
        "国",
        "デバイス",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション"
      ]
    },
    {
      name: "サマリーダッシュボード",
      columns: [
        "サイト",
        "指標",
        "現在の値",
        "前回の値", 
        "変化率",
        "トレンド",
        "最終更新"
      ]
    },
    {
      name: "APIステータス",
      columns: [
        "サイト",
        "最終実行",
        "ステータス",
        "処理レコード数",
        "エラー",
        "次回実行",
        "APIクォータ使用状況"
      ]
    },
    // 国別週間ランキングテンプレート（集計シートなし）
    {
      name: "米国週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    },
    {
      name: "カナダ週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    },
    {
      name: "イギリス週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    },
    {
      name: "オーストラリア週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    },
    {
      name: "ニュージーランド週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    },
    {
      name: "シンガポール週間ランキング",
      columns: [
        "週",
        "国",
        "デバイス",
        "検索クエリ",
        "ページURL",
        "クリック数",
        "インプレッション数",
        "CTR",
        "平均ポジション",
        "週間ランキング",
        "トレンド",
        "クリック数変化",
        "インプレッション数変化",
        "CTR変化",
        "ポジション変化"
      ]
    }
  ]
};

// エラーメッセージ（英語）
const ERROR_MESSAGES = {
  apiError: "GSC APIエラー: ",
  authError: "認証エラー: ",
  quotaError: "APIクォータ超過: ",
  dataError: "データ処理エラー: ",
  sheetError: "スプレッドシートエラー: "
};

// ログ設定
const LOGGING = {
  enabled: true,
  level: "INFO", // DEBUG、INFO、WARN、ERROR
  emailNotifications: true,
  notificationEmail: "client@bespoke-discovery.com", // 通知用クライアントメール
  language: "ja" // 日本語ログ
};
