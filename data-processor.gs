/**
 * データ処理モジュール
 * データ変換、検証、計算を処理
 */

/**
 * データプロセッサークラス
 * 生のGSCデータをフォーマットされたスプレッドシートデータに処理
 */
class DataProcessor {
  constructor() {
    this.processedData = [];
    this.errors = [];
  }
  
  /**
   * 生のGSC APIレスポンスを処理
   * @param {Object} rawData - GSC APIからの生データ
   * @return {Array} 処理されたデータ配列
   */
  process(rawData) {
    Logger.log("データ処理を開始...");
    
    try {
      // 入力データを検証
      this.validateInput(rawData);
      
      // 各行を処理
      if (rawData.rows && rawData.rows.length > 0) {
        rawData.rows.forEach((row, index) => {
          try {
            const processedRow = this.processRow(row);
            if (processedRow) { // フィルタリングされていない行のみ追加
              this.processedData.push(processedRow);
            }
          } catch (rowError) {
            Logger.log(`行${index}の処理でエラー: ${rowError.message}`);
            this.errors.push({
              row: index,
              error: rowError.message,
              data: row
            });
          }
        });
      }
      
      // サマリーデータを追加
      this.addSummaryData();
      
      // 日付の降順でデータをソート（最新が最初）
      this.processedData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // 降順（最新が最初）
      });
      
      Logger.log(`データ処理完了。${this.processedData.length}行を処理し、${this.errors.length}個のエラー。`);
      
      return this.processedData;
      
    } catch (error) {
      Logger.log(`データ処理に失敗: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 国コードを日本語名に翻訳
   * @param {string} countryCode - 国コード
   * @return {string} 日本語国名
   */
  translateCountry(countryCode) {
    const countryMapping = CONFIG.countryMapping || {
      "usa": "米国",
      "can": "カナダ", 
      "gbr": "イギリス",
      "aus": "オーストラリア",
      "nzl": "ニュージーランド",
      "sgp": "シンガポール"
    };
    return countryMapping[countryCode.toLowerCase()] || countryCode;
  }
  
  /**
   * デバイスタイプを日本語名に翻訳
   * @param {string} deviceType - デバイスタイプ
   * @return {string} 日本語デバイス名
   */
  translateDevice(deviceType) {
    const deviceMapping = CONFIG.deviceMapping || {
      "desktop": "パソコン",
      "mobile": "スマホ全般", 
      "tablet": "タブレット"
    };
    return deviceMapping[deviceType.toLowerCase()] || deviceType;
  }

  /**
   * 入力データ構造を検証
   * @param {Object} rawData - 検証する生データ
   */
  validateInput(rawData) {
    if (!rawData) {
      throw new Error("処理するデータが提供されていません");
    }
    
    // 修正: エラーを投げる代わりに空のデータを適切に処理
    if (!rawData.rows) {
      Logger.log("データ行が見つかりません - 空の結果を返します");
      return { rows: [] };
    }
    
    if (!Array.isArray(rawData.rows)) {
      throw new Error("無効なデータ構造 - rowsが配列ではありません");
    }
    
    Logger.log(`${rawData.rows.length}行のデータを検証中`);
  }
  
  /**
   * 個別のデータ行を処理
   * @param {Object} row - GSC APIからの単一行
   * @return {Object} 処理された行データ
   */
  processRow(row) {
    try {
      // デバッグ: 生の行構造をログ出力
      Logger.log(`Raw row structure: ${JSON.stringify(row)}`);
      
      // キー（ディメンション）を抽出
      // 順序: 日付、クエリ、ページ、国、デバイス
      const keys = row.keys || [];
      
      // 修正: メトリクスはrow.metricsではなく、rowオブジェクトに直接あります
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const position = row.position || 0;
      const ctr = row.ctr || 0;
      
      // デバッグ: 抽出された値をログ出力
      Logger.log(`Extracted - clicks: ${clicks}, impressions: ${impressions}, position: ${position}, ctr: ${ctr}`);
      
      // ディメンションキーから日付を抽出
      // keys[0] = 日付、keys[1] = クエリ、keys[2] = ページ、keys[3] = 国、keys[4] = デバイス
      const dateFromAPI = keys[0] || 'Unknown';
      const originalCountry = keys[3] || 'Unknown';
      const originalDevice = keys[4] || 'Unknown';
      
      // GSC APIからの日付をフォーマット（形式: YYYY-MM-DD）
      const searchDate = this.formatSearchDate(dateFromAPI);
      
      // 日本語マッピングの前にフィルタリングをチェック（元の国コードを使用）
      // 設定された国とデバイスでフィルタリング
      if (!this.shouldIncludeRow({ country: originalCountry, device: originalDevice })) {
        return null; // この行をスキップ
      }
      
      // ディメンションを読み取り可能な値にマッピング（日本語名を含む）
      const dimensions = this.mapDimensions(keys);
      
      // 処理された行をフォーマット
      const processedRow = {
        date: searchDate,
        searchQuery: dimensions.query || 'Unknown',
        pageUrl: dimensions.page || 'Unknown',
        country: dimensions.country || 'Unknown',
        device: dimensions.device || 'Unknown',
        clicks: parseInt(clicks) || 0,
        impressions: parseInt(impressions) || 0,
        ctr: parseFloat(ctr) || 0,
        averagePosition: parseFloat(position) || 0
      };
      
      // デバッグ: 最終的な処理された行をログ出力
      Logger.log(`Final processed row: ${JSON.stringify(processedRow)}`);
      Logger.log(`Date from API: ${dateFromAPI} -> Formatted: ${searchDate}`);
      Logger.log(`Country mapping check: original=${originalCountry}, mapped=${dimensions.country}`);
      Logger.log(`Device mapping check: original=${originalDevice}, mapped=${dimensions.device}`);
      
      // 処理された行を検証
      this.validateProcessedRow(processedRow);
      
      return processedRow;
      
    } catch (error) {
      throw new Error(`行処理に失敗: ${error.message}`);
    }
  }
  
  /**
   * 設定に基づいて行を含めるべきかチェック
   * @param {Object} dimensions - 行のディメンション
   * @return {boolean} 行を含めるべき場合true
   */
  shouldIncludeRow(dimensions) {
    // 設定された国のみでフィルタリング
    // すべてのデバイスを含める（デスクトップ、モバイル、タブレット）
    
    // 国フィルターをチェック（フィルタリングには元の国コードを使用）
    if (CONFIG.data.countries && CONFIG.data.countries.length > 0) {
      if (!CONFIG.data.countries.includes(dimensions.country)) {
        Logger.log(`❌ 国でフィルタリングされました: ${dimensions.country}`);
        return false;
      }
    }
    
    // デバイスフィルタリングなし - すべてのデバイスを含める（デスクトップ、モバイル、タブレット）
    Logger.log(`✅ 行が含まれました: country=${dimensions.country}, device=${dimensions.device}`);
    return true;
  }
  
  /**
   * ディメンションキーを読み取り可能な値にマッピング
   * @param {Array} keys - GSC APIからのディメンションキー
   * @return {Object} マッピングされたディメンション
   */
  mapDimensions(keys) {
    // 順序: 日付、クエリ、ページ、国、デバイス
    return {
      query: keys[1] || 'Unknown',
      page: keys[2] || 'Unknown',
      country: this.translateCountry(keys[3]) || 'Unknown',
      device: this.translateDevice(keys[4]) || 'Unknown'
    };
  }

  /**
   * 国コードを英語表示名にマッピング
   * @param {string} countryCode - GSC APIからの国コード
   * @return {string} 英語国名
   */
  mapCountryToEnglish(countryCode) {
    const countryMap = {
      'usa': 'USA',
      'can': 'Canada', 
      'gbr': 'United Kingdom',
      'aus': 'Australia',
      'nzl': 'New Zealand',
      'sgp': 'Singapore'
    };
    
    Logger.log(`国をマッピング中: ${countryCode} -> ${countryMap[countryCode] || countryCode}`);
    return countryMap[countryCode] || countryCode;
  }

  /**
   * デバイスタイプを英語表示名にマッピング
   * @param {string} deviceType - GSC APIからのデバイスタイプ
   * @return {string} 英語デバイス名
   */
  mapDeviceToEnglish(deviceType) {
    const deviceMap = {
      'DESKTOP': 'Desktop',
      'MOBILE': 'Mobile',
      'TABLET': 'Tablet'
    };
    
    Logger.log(`デバイスをマッピング中: ${deviceType} -> ${deviceMap[deviceType] || deviceType}`);
    return deviceMap[deviceType] || deviceType;
  }
  
  /**
   * クリック率を計算
   * @param {number} clicks - クリック数
   * @param {number} impressions - インプレッション数
   * @return {number} パーセンテージとしてのCTR
   */
  calculateCTR(clicks, impressions) {
    if (!impressions || impressions === 0) {
      return 0;
    }
    
    const ctr = (clicks / impressions) * 100;
    return Math.round(ctr * 100) / 100; // 小数点以下2桁に丸める
  }
  
  /**
   * 設定された形式で現在の日付を取得
   * @return {string} フォーマットされた日付文字列
   */
  getCurrentDate() {
    return Utilities.formatDate(
      new Date(), 
      CONFIG.spreadsheet.timezone, 
      CONFIG.spreadsheet.dateFormat
    );
  }
  
  /**
   * GSC APIからの日付（YYYY-MM-DD）を設定された形式にフォーマット
   * @param {string} dateStr - YYYY-MM-DD形式のGSC APIからの日付文字列
   * @return {string} フォーマットされた日付文字列
   */
  formatSearchDate(dateStr) {
    try {
      if (!dateStr || dateStr === 'Unknown') {
        return this.getCurrentDate(); // 現在の日付にフォールバック
      }
      
      // GSC APIからの日付を解析（形式: YYYY-MM-DD）
      const dateObj = new Date(dateStr);
      
      if (isNaN(dateObj.getTime())) {
        Logger.log(`警告: GSC APIからの無効な日付: ${dateStr}`);
        return this.getCurrentDate(); // 現在の日付にフォールバック
      }
      
      // 設定に従ってフォーマット
      return Utilities.formatDate(
        dateObj, 
        CONFIG.spreadsheet.timezone, 
        CONFIG.spreadsheet.dateFormat
      );
    } catch (error) {
      Logger.log(`検索日付のフォーマットエラー ${dateStr}: ${error.message}`);
      return this.getCurrentDate(); // 現在の日付にフォールバック
    }
  }
  
  /**
   * 処理された行データを検証
   * @param {Object} row - 検証する処理された行
   */
  validateProcessedRow(row) {
    const requiredFields = ['date', 'searchQuery', 'pageUrl', 'country', 'device'];
    
    requiredFields.forEach(field => {
      if (!row[field] || row[field] === 'Unknown') {
        Logger.log(`警告: フィールドの値が欠落または不明: ${field}`);
      }
    });
    
    // 数値フィールドを検証
    if (row.clicks < 0 || row.impressions < 0 || row.averagePosition < 0) {
      throw new Error("処理された行に無効な数値があります");
    }
    
    if (row.ctr < 0 || row.ctr > 100) {
      throw new Error("無効なCTR値");
    }
  }
  
  /**
   * 処理されたデータにサマリーとメタデータを追加
   */
  addSummaryData() {
    try {
      // サマリー統計計算は削除 - サマリー行は不要
      
    } catch (error) {
      Logger.log(`サマリー計算に失敗: ${error.message}`);
    }
  }
  
  // calculateSummary関数は削除 - サマリー行は不要
  
  /**
   * 処理エラーを取得
   * @return {Array} 処理エラーの配列
   */
  getErrors() {
    return this.errors;
  }
  
  /**
   * 処理統計を取得
   * @return {Object} 処理統計
   */
  getStats() {
    return {
      totalRows: this.processedData.length,
      errorCount: this.errors.length,
      successRate: this.processedData.length > 0 ? 
        ((this.processedData.length - this.errors.length) / this.processedData.length * 100).toFixed(2) : 0
    };
  }
}

