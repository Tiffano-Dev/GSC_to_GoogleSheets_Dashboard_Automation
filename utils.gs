/**
 * ユーティリティ関数
 * アプリケーション全体で使用される共通ヘルパー関数
 */

/**
 * システムモニタークラス
 * 監視、ログ、ステータス更新を処理
 */
class SystemMonitor {
  constructor() {
    this.logEntries = [];
    this.startTime = new Date();
  }
  
  /**
   * システムステータスを更新
   * @param {Object} site - サイト設定
   * @param {Array} data - 処理されたデータ
   */
  updateStatus(site, data) {
    try {
      const status = {
        timestamp: new Date(),
        site: site.name,
        recordsProcessed: data ? data.length : 0,
        status: 'Success',
        executionTime: new Date() - this.startTime
      };
      
      this.logEntries.push(status);
      
      Logger.log(`${site.name}のステータスを更新: ${status.recordsProcessed}レコードを処理`);
      
    } catch (error) {
      Logger.log(`ステータス更新に失敗: ${error.message}`);
    }
  }
  
  /**
   * システムステータスを取得
   * @return {Object} 現在のシステムステータス
   */
  getStatus() {
    return {
      startTime: this.startTime,
      totalLogEntries: this.logEntries.length,
      lastEntry: this.logEntries.length > 0 ? this.logEntries[this.logEntries.length - 1] : null
    };
  }
  
  /**
   * 実行ログを取得
   * @return {Array} ログエントリの配列
   */
  getLogs() {
    return this.logEntries;
  }
}

/**
 * 表示用に日付をフォーマット
 * @param {Date} date - フォーマットする日付
 * @param {string} format - フォーマット文字列（オプション）
 * @return {string} フォーマットされた日付文字列
 */
function formatDate(date, format = null) {
  try {
    const defaultFormat = format || CONFIG.spreadsheet.dateFormat;
    return Utilities.formatDate(date, CONFIG.spreadsheet.timezone, defaultFormat);
  } catch (error) {
    Logger.log(`日付フォーマットに失敗: ${error.message}`);
    return date.toString();
  }
}

/**
 * 表示用に数値をフォーマット
 * @param {number} number - フォーマットする数値
 * @param {number} decimals - 小数点以下の桁数
 * @return {string} フォーマットされた数値文字列
 */
function formatNumber(number, decimals = 2) {
  try {
    return parseFloat(number).toFixed(decimals);
  } catch (error) {
    Logger.log(`数値フォーマットに失敗: ${error.message}`);
    return number.toString();
  }
}

/**
 * 表示用にパーセンテージをフォーマット
 * @param {number} value - パーセンテージとしてフォーマットする値
 * @param {number} decimals - 小数点以下の桁数
 * @return {string} フォーマットされたパーセンテージ文字列
 */
function formatPercentage(value, decimals = 2) {
  try {
    return `${formatNumber(value, decimals)}%`;
  } catch (error) {
    Logger.log(`パーセンテージフォーマットに失敗: ${error.message}`);
    return `${value}%`;
  }
}

/**
 * メールアドレス形式を検証
 * @param {string} email - 検証するメールアドレス
 * @return {boolean} 有効なメール形式の場合true
 */
function isValidEmail(email) {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  } catch (error) {
    Logger.log(`メール検証に失敗: ${error.message}`);
    return false;
  }
}

/**
 * 通知メールを送信
 * @param {string} to - 受信者メールアドレス
 * @param {string} subject - メール件名
 * @param {string} body - メール本文
 * @param {boolean} isHtml - 本文がHTML形式かどうか
 */
function sendNotification(to, subject, body, isHtml = false) {
  try {
    if (!isValidEmail(to)) {
      throw new Error(`無効なメールアドレス: ${to}`);
    }
    
    const options = {
      to: to,
      subject: subject,
      body: body
    };
    
    if (isHtml) {
      options.htmlBody = body;
    }
    
    MailApp.sendEmail(options);
    Logger.log(`${to}に通知を送信`);
    
  } catch (error) {
    Logger.log(`通知送信に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * エラーレポートを作成
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 * @return {Object} エラーレポートオブジェクト
 */
function createErrorReport(error, context) {
  return {
    timestamp: new Date(),
    context: context,
    message: error.message,
    stack: error.stack,
    site: context.includes('Site:') ? context.split('Site: ')[1] : 'Unknown'
  };
}

/**
 * コンテキスト付きでエラーをログ出力
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 */
function logError(error, context) {
  try {
    const errorReport = createErrorReport(error, context);
    
    Logger.log(`ERROR [${errorReport.timestamp}]: ${errorReport.context} - ${errorReport.message}`);
    
    // デバッグ用にPropertiesServiceにエラーを保存
    const errorKey = `error_${Date.now()}`;
    PropertiesService.getScriptProperties().setProperty(errorKey, JSON.stringify(errorReport));
    
  } catch (logError) {
    Logger.log(`エラーログに失敗: ${logError.message}`);
  }
}

/**
 * 古いエラーログをクリーンアップ
 * @param {number} maxAge - 最大年齢（ミリ秒）
 */
function cleanupOldLogs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  try {
    const properties = PropertiesService.getScriptProperties();
    const cutoffTime = Date.now() - maxAge;
    
    properties.getProperties().forEach((value, key) => {
      if (key.startsWith('error_')) {
        const timestamp = parseInt(key.split('_')[1]);
        if (timestamp < cutoffTime) {
          properties.deleteProperty(key);
        }
      }
    });
    
    Logger.log("古いエラーログをクリーンアップ");
    
  } catch (error) {
    Logger.log(`ログクリーンアップに失敗: ${error.message}`);
  }
}

/**
 * 文字列が空またはnullかチェック
 * @param {string} str - チェックする文字列
 * @return {boolean} 空またはnullの場合true
 */
function isEmpty(str) {
  return !str || str.trim().length === 0;
}

/**
 * スプレッドシートエクスポート用に文字列をサニタイズ
 * @param {string} str - サニタイズする文字列
 * @return {string} サニタイズされた文字列
 */
function sanitizeString(str) {
  if (isEmpty(str)) {
    return '';
  }
  
  // 問題のある文字を削除または置換
  return str.toString()
    .replace(/[\r\n\t]/g, ' ') // 改行とタブをスペースに置換
    .replace(/[^\x20-\x7E]/g, '') // 非ASCII文字を削除
    .trim();
}

/**
 * GSCプロパティ形式を検証
 * @param {string} property - 検証するGSCプロパティ
 * @return {boolean} 有効なプロパティ形式の場合true
 */
function isValidGSCProperty(property) {
  if (isEmpty(property)) {
    return false;
  }
  
  // ドメイン形式をチェック（sc-domain:example.com）
  if (property.startsWith('sc-domain:')) {
    const domain = property.substring(10);
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
  
  // URL形式をチェック（https://example.com/）
  if (property.startsWith('https://') || property.startsWith('http://')) {
    try {
      new URL(property);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * GSCプロパティを表示名に変換
 * @param {string} property - GSCプロパティ
 * @return {string} 表示名
 */
function getPropertyDisplayName(property) {
  if (isEmpty(property)) {
    return 'Unknown';
  }
  
  if (property.startsWith('sc-domain:')) {
    return property.substring(10);
  }
  
  if (property.startsWith('https://')) {
    return property.replace('https://', '').replace(/\/$/, '');
  }
  
  return property;
}

/**
 * 現在のタイムスタンプ文字列を取得
 * @return {string} 現在のタイムスタンプ
 */
function getCurrentTimestamp() {
  return formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 人間が読みやすい形式で時間差を計算
 * @param {Date} startTime - 開始時間
 * @param {Date} endTime - 終了時間（オプション、デフォルトは現在）
 * @return {string} 人間が読みやすい時間差
 */
function getTimeDifference(startTime, endTime = new Date()) {
  try {
    const diffMs = endTime - startTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m ${diffSeconds % 60}s`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
    
  } catch (error) {
    Logger.log(`時間差計算に失敗: ${error.message}`);
    return 'Unknown';
  }
}

