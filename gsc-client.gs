/**
 * Google Search Console APIクライアント
 * GSC APIとのすべてのやり取りを処理
 */

/**
 * GSCクライアントクラス
 * APIリクエストと認証を管理
 */
class GSCClient {
  constructor(site) {
    this.site = site;
    this.baseUrl = 'https://www.googleapis.com/webmasters/v3/sites/';
    this.property = this.site.property || this.site.url;
  }
  
  /**
   * GSCから検索アナリティクスデータを取得
   * @return {Object} 検索アナリティクスデータ
   */
  getSearchAnalytics() {
    Logger.log(`${this.site.name}の検索アナリティクスを取得中...`);
    
    try {
      const requestData = this.buildSearchAnalyticsRequest();
      const response = this.makeAPIRequest('searchAnalytics/query', requestData);
      
      return response;
      
    } catch (error) {
      Logger.log(`GSC APIリクエストに失敗: ${error.message}`);
      throw new Error(`検索アナリティクスの取得に失敗: ${error.message}`);
    }
  }
  
  /**
   * 検索アナリティクスリクエストペイロードを構築
   * @return {Object} リクエストデータ
   */
  buildSearchAnalyticsRequest() {
    // GSC APIには2-3日のデータ遅延があるため、endDateを2日前に設定
    const latestAvailableDate = new Date();
    latestAvailableDate.setDate(latestAvailableDate.getDate() - 2);
    
    // 開始日を計算（最新利用可能日から30日前）
    const earliestDate = new Date(latestAvailableDate);
    earliestDate.setDate(earliestDate.getDate() - CONFIG.data.dateRange);
    
    // APIはstartDate < endDateを期待するが、結果を最新順でソートしたい
    // そのため通常の時系列順（古い順から新しい順）でリクエスト
    // その後、取得後に結果を降順でソート
    return {
      startDate: Utilities.formatDate(earliestDate, CONFIG.spreadsheet.timezone, 'yyyy-MM-dd'),
      endDate: Utilities.formatDate(latestAvailableDate, CONFIG.spreadsheet.timezone, 'yyyy-MM-dd'),
      dimensions: ['date', 'query', 'page', 'country', 'device'],
      rowLimit: CONFIG.data.rowLimit,
      dimensionFilterGroups: this.buildDimensionFilters()
    };
  } 
  
  /**
   * 設定に基づいてディメンションフィルターを構築
   * @return {Array} ディメンションフィルターグループ
   */
  buildDimensionFilters() {
    // フィルターなし - すべての国とデバイスのデータを取得
    // GSC APIは利用可能なすべての国とデバイスのデータを返します
    // 必要に応じて処理中にデータをフィルタリング
    return [];
  }
  
  /**
   * GSCにAPIリクエストを送信
   * @param {string} endpoint - APIエンドポイント
   * @param {Object} data - リクエストデータ
   * @return {Object} APIレスポンス
   */
  makeAPIRequest(endpoint, data) {
    // GSCが認識する正確なプロパティURL形式を使用
    const propertyUrl = this.property;
    const url = this.baseUrl + encodeURIComponent(propertyUrl) + '/' + endpoint;
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getAccessToken(),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(data)
    };
    
    try {
      Logger.log(`APIリクエストを送信中: ${url}`);
      Logger.log(`プロパティURL: ${propertyUrl}`);
      Logger.log(`エンコードされたプロパティ: ${encodeURIComponent(propertyUrl)}`);
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        return JSON.parse(response.getContentText());
      } else if (responseCode === 403) {
        // クォータの問題かチェック
        const responseText = response.getContentText();
        if (responseText.includes('quota') || responseText.includes('Quota')) {
          Logger.log(`${this.site.name}のAPIクォータが超過しました。このサイトをスキップします。`);
          Logger.log(`クォータ情報: GSC APIには日次制限があります。クォータは24時間ごとにリセットされます。`);
          Logger.log(`解決策: 明日まで待つか、データリクエストを減らしてください。`);
          return { rows: [] }; // エラーを投げる代わりに空のデータを返す
        }
        throw new Error('APIクォータ超過または権限不足');
      } else if (responseCode === 401) {
        throw new Error('認証に失敗 - サービスアカウントトークンが無効');
      } else if (responseCode === 404) {
        Logger.log(`404エラーの詳細:`);
        Logger.log(`プロパティ: ${this.property}`);
        Logger.log(`URL: ${url}`);
        Logger.log(`レスポンス: ${response.getContentText()}`);
        throw new Error(`プロパティが見つからないか、サービスアカウントにアクセス権限がありません: ${this.property}。GSCプロパティにサービスアカウントを追加してください。`);
      } else {
        Logger.log(`APIエラーの詳細:`);
        Logger.log(`ステータスコード: ${responseCode}`);
        Logger.log(`レスポンス: ${response.getContentText()}`);
        throw new Error(`APIリクエストがステータス${responseCode}で失敗: ${response.getContentText()}`);
      }
      
    } catch (error) {
      if (error.message.includes('quota') || error.message.includes('403')) {
        Logger.log(`${this.site.name}のAPIクォータが超過しました。空のデータを返します。`);
        return { rows: [] }; // エラーを投げる代わりに空のデータを返す
      }
      throw error;
    }
  }
  
  /**
   * 検証済みサイトのリストを取得
   * @return {Array} 検証済みサイトのリスト
   */
  getSites() {
    try {
      const response = UrlFetchApp.fetch(this.baseUrl, {
        headers: {
          'Authorization': 'Bearer ' + getAccessToken()
        }
      });
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        return data.siteEntry || [];
      } else {
        throw new Error(`サイトの取得に失敗: ${response.getResponseCode()}`);
      }
      
    } catch (error) {
      Logger.log(`サイト取得エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * API接続をテスト
   * @return {boolean} APIにアクセス可能な場合true
   */
  testConnection() {
    try {
      const sites = this.getSites();
      Logger.log(`GSC API接続に成功。${sites.length}個の検証済みサイトが見つかりました。`);
      
      // デバッグ: 利用可能なすべてのサイトをログ出力
      if (sites.length > 0) {
        Logger.log("利用可能なサイト:");
        sites.forEach((site, index) => {
          Logger.log(`${index + 1}. ${site.siteUrl || site.siteUrl || 'Unknown URL'}`);
        });
      } else {
        Logger.log("サイトが見つかりません。これは以下を意味する可能性があります:");
        Logger.log("1. GSCでサイトが検証されていません");
        Logger.log("2. OAuthアカウントがGSCにアクセスできません");
        Logger.log("3. サイトを最初に検証する必要があります");
      }
      
      return true;
      
    } catch (error) {
      Logger.log(`GSC API接続に失敗: ${error.message}`);
      return false;
    }
  }
}

// getAccessToken()関数はauth.gsで定義


/**
 * 利用可能なGSCサイトをチェックするデバッグ関数
 */
function debugGCSSites() {
  Logger.log("GSCサイトをデバッグ中...");
  
  try {
    // すべてのサイトを取得するためのシンプルなGSCクライアントを作成
    const gscClient = new GSCClient({});
    const sites = gscClient.getSites();
    
    Logger.log(`GSCで${sites.length}個のサイトが見つかりました:`);
    
    if (sites.length > 0) {
      sites.forEach((site, index) => {
        Logger.log(`サイト${index + 1}:`);
        Logger.log(`  URL: ${site.siteUrl || 'URLなし'}`);
        Logger.log(`  権限レベル: ${site.permissionLevel || '不明'}`);
        Logger.log(`  完全なオブジェクト: ${JSON.stringify(site)}`);
      });
    } else {
      Logger.log("サイトが見つかりません。考えられる問題:");
      Logger.log("1. Google Search Consoleでサイトが検証されていません");
      Logger.log("2. サービスアカウントがGSCにアクセスできません");
      Logger.log("3. サイトを最初にGSCに追加する必要があります");
    }
    
  } catch (error) {
    Logger.log(`デバッグに失敗: ${error.message}`);
  }
}

