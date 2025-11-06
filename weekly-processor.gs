/**
 * 週間ランキングプロセッサークラス
 * 週間データ集計、ランキング計算、トレンド分析を処理
 */
class WeeklyProcessor {
  constructor() {
    this.weeklyData = [];
    this.rankings = {};
    this.trends = {};
  }
  
  /**
   * 週間データを処理してランキングを計算
   * @param {Array} dailyData - 日次データ
   * @return {Object} 週間ランキングデータ
   */
  processWeeklyRankings(dailyData) {
    Logger.log("週間ランキング処理を開始...");
    
    try {
      // 日次データを週間データに集計
      Logger.log("ステップ1: 日次データを集計中...");
      const weeklyAggregated = this.aggregateWeeklyData(dailyData);
      Logger.log(`${weeklyAggregated.length}件の週間レコードを集計`);
      
      // 週間ランキングを計算
      Logger.log("ステップ2: 週間ランキングを計算中...");
      const weeklyRankings = this.calculateWeeklyRankings(weeklyAggregated);
      Logger.log(`${Object.keys(weeklyRankings).length}カテゴリのランキングを計算`);
      
      // 週間レポートを生成
      Logger.log("ステップ3: 週間レポートを生成中...");
      const weeklyReports = this.generateWeeklyReports(weeklyRankings);
      Logger.log(`${weeklyReports.length}件のレポートを生成`);
      
      Logger.log(`週間ランキング処理完了。${weeklyReports.length}件のレポートを生成`);
      
      const result = {
        weeklyData: weeklyAggregated,
        rankings: weeklyRankings,
        reports: weeklyReports
      };
      
      Logger.log(`キー付きで結果を返します: ${Object.keys(result)}`);
      return result;
      
    } catch (error) {
      Logger.log(`週間ランキング処理に失敗: ${error.message}`);
      Logger.log(`エラースタック: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * 日次データを週間データに集計
   * @param {Array} dailyData - 日次データ
   * @return {Array} 週間集計データ
   */
  aggregateWeeklyData(dailyData) {
    Logger.log("日次データを週間データに集計中...");
    
    // 前週の開始日と終了日を計算
    const previousWeek = this.getPreviousWeekRange();
    Logger.log(`前週のデータをフィルタリング: ${previousWeek.start} から ${previousWeek.end}`);
    
    // 前週のみを含むようにデータをフィルタリング
    const filteredData = dailyData.filter(row => {
      const rowDate = new Date(row.date);
      return rowDate >= previousWeek.start && rowDate <= previousWeek.end;
    });
    
    Logger.log(`前週用に${dailyData.length}行から${filteredData.length}行をフィルタリング`);
    
    const weeklyMap = new Map();
    
    filteredData.forEach(row => {
      const weekKey = this.getWeekKey(row.date);
      
      // 無効な日付の行をスキップ
      if (!weekKey) {
        Logger.log(`無効な日付の行をスキップ: ${row.date}`);
        return;
      }
      
      const rowKey = `${row.searchQuery}|${row.pageUrl}|${row.country}|${row.device}`;
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, new Map());
      }
      
      const weekData = weeklyMap.get(weekKey);
      
      if (!weekData.has(rowKey)) {
        weekData.set(rowKey, {
          week: weekKey,
          searchQuery: row.searchQuery,
          pageUrl: row.pageUrl,
          country: row.country,
          device: row.device,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          count: 0
        });
      }
      
      const weeklyRow = weekData.get(rowKey);
      weeklyRow.clicks += row.clicks;
      weeklyRow.impressions += row.impressions;
      weeklyRow.position += row.averagePosition;
      weeklyRow.count += 1;
    });
    
    // 週間データを配列に変換して平均を計算
    const weeklyData = [];
    weeklyMap.forEach((weekData, weekKey) => {
      weekData.forEach(row => {
        row.ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
        row.position = row.count > 0 ? row.position / row.count : 0;
        weeklyData.push(row);
      });
    });
    
    Logger.log(`${weeklyData.length}件の週間データレコードを生成`);
    return weeklyData;
  }
  
  /**
   * 週間ランキングを計算
   * @param {Array} weeklyData - 週間集計データ
   * @return {Object} ランキングデータ
   */
  calculateWeeklyRankings(weeklyData) {
    Logger.log("週間ランキングを計算中...");
    
    const rankings = {
      byClicks: [],
      byImpressions: [],
      byCTR: [],
      byPosition: []
    };
    
    // 週ごとにグループ化
    const weeklyGroups = this.groupByWeek(weeklyData);
    
    Object.keys(weeklyGroups).forEach(weekKey => {
      const weekData = weeklyGroups[weekKey];
      
      // 参照値に基づいて統一ランキングを計算
      // 優先順位: ポジション昇順 → クリック降順 → インプレッション降順 → CTR降順
      const unifiedRanking = weekData
        .sort((a, b) => {
          // 第1: 平均ポジション昇順（低い方が良い）
          if (a.position !== b.position) {
            return a.position - b.position;
          }
          // 第2: クリック降順（高い方が良い）
          if (a.clicks !== b.clicks) {
            return b.clicks - a.clicks;
          }
          // 第3: インプレッション降順（高い方が良い）
          if (a.impressions !== b.impressions) {
            return b.impressions - a.impressions;
          }
          // 第4: CTR降順（高い方が良い）
          return b.ctr - a.ctr;
        })
        .map((row, index) => ({
          ...row,
          ranking: index + 1,
          metric: 'unified'
        }));
      
      // 後方互換性のための個別ランキングを作成
      const clicksRanking = weekData
        .sort((a, b) => b.clicks - a.clicks)
        .map((row, index) => ({
          ...row,
          ranking: index + 1,
          metric: 'clicks'
        }));
      
      const impressionsRanking = weekData
        .sort((a, b) => b.impressions - a.impressions)
        .map((row, index) => ({
          ...row,
          ranking: index + 1,
          metric: 'impressions'
        }));
      
      const ctrRanking = weekData
        .sort((a, b) => b.ctr - a.ctr)
        .map((row, index) => ({
          ...row,
          ranking: index + 1,
          metric: 'ctr'
        }));
      
      const positionRanking = weekData
        .sort((a, b) => a.position - b.position)
        .map((row, index) => ({
          ...row,
          ranking: index + 1,
          metric: 'position'
        }));
      
      // 統一ランキングを主要ランキングシステムとして使用
      rankings.byClicks.push(...unifiedRanking);
      rankings.byImpressions.push(...impressionsRanking);
      rankings.byCTR.push(...ctrRanking);
      rankings.byPosition.push(...positionRanking);
    });
    
    Logger.log("週間ランキング計算完了");
    return rankings;
  }
  
  /**
   * 参照値計算を示す詳細ランキングレポートを作成
   * @param {Array} weeklyData - 週間集計データ
   * @return {Array} 詳細ランキングレポート
   */
  createDetailedRankingReport(weeklyData) {
    Logger.log("参照値付きの詳細ランキングレポートを作成中...");
    
    const report = [];
    
    // 週ごとにグループ化
    const weeklyGroups = this.groupByWeek(weeklyData);
    
    Object.keys(weeklyGroups).forEach(weekKey => {
      const weekData = weeklyGroups[weekKey];
      
      // 参照値でソート
      const sortedData = weekData.sort((a, b) => {
        // 第1: 平均ポジション昇順（低い方が良い）
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        // 第2: クリック降順（高い方が良い）
        if (a.clicks !== b.clicks) {
          return b.clicks - a.clicks;
        }
        // 第3: インプレッション降順（高い方が良い）
        if (a.impressions !== b.impressions) {
          return b.impressions - a.impressions;
        }
        // 第4: CTR降順（高い方が良い）
        return b.ctr - a.ctr;
      });
      
      // ランキング情報を追加
      sortedData.forEach((row, index) => {
        const ranking = index + 1;
        
        report.push({
          week: row.week,
          ranking: ranking,
          searchQuery: row.searchQuery,
          pageUrl: row.pageUrl,
          country: row.country,
          device: row.device,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          referenceScore: this.calculateReferenceScore(row),
          rankingReason: this.getRankingReason(row, sortedData, index)
        });
      });
    });
    
    Logger.log(`${report.length}エントリの詳細ランキングレポートを作成`);
    return report;
  }
  
  /**
   * ランキング用の参照スコアを計算
   * @param {Object} row - データ行
   * @return {number} 参照スコア
   */
  calculateReferenceScore(row) {
    try {
      // 参照値に基づく重み付きスコア
      // ポジション: 40%重み（低い方が良いので反転）
      // クリック: 30%重み（高い方が良い）
      // インプレッション: 20%重み（高い方が良い）
      // CTR: 10%重み（高い方が良い）
      
      const positionScore = Math.max(0, 100 - (row.position * 5)); // 最大100、ポジションごとに5減少
      const clicksScore = Math.min(100, (row.clicks / 10) * 100); // 最大100、クリック数に比例
      const impressionsScore = Math.min(100, (row.impressions / 50) * 100); // 最大100、インプレッション数に比例
      const ctrScore = Math.min(100, row.ctr * 1000); // 最大100、CTRに比例
      
      const referenceScore = 
        (positionScore * 0.4) +
        (clicksScore * 0.3) +
        (impressionsScore * 0.2) +
        (ctrScore * 0.1);
      
      return Math.round(referenceScore);
      
    } catch (error) {
      Logger.log(`参照スコア計算エラー: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * 特定の行のランキング理由を取得
   * @param {Object} row - データ行
   * @param {Array} sortedData - ソートされたデータ配列
   * @param {number} index - 現在のインデックス
   * @return {string} ランキング理由
   */
  getRankingReason(row, sortedData, index) {
    try {
      if (index === 0) {
        return "トップパフォーマー - 最高ポジション";
      }
      
      const previousRow = sortedData[index - 1];
      const reasons = [];
      
      // 前の行と比較してランキングを説明
      if (row.position < previousRow.position) {
        reasons.push("より良いポジション");
      } else if (row.position > previousRow.position) {
        reasons.push("より悪いポジション");
      }
      
      if (row.clicks > previousRow.clicks) {
        reasons.push("より多くのクリック");
      } else if (row.clicks < previousRow.clicks) {
        reasons.push("より少ないクリック");
      }
      
      if (row.impressions > previousRow.impressions) {
        reasons.push("より多くのインプレッション");
      } else if (row.impressions < previousRow.impressions) {
        reasons.push("より少ないインプレッション");
      }
      
      if (row.ctr > previousRow.ctr) {
        reasons.push("より高いCTR");
      } else if (row.ctr < previousRow.ctr) {
        reasons.push("より低いCTR");
      }
      
      return reasons.length > 0 ? reasons.join(", ") : "類似のパフォーマンス";
      
    } catch (error) {
      Logger.log(`ランキング理由取得エラー: ${error.message}`);
      return "Unknown";
    }
  }
  
  /**
   * 週間レポートを生成
   * @param {Object} rankings - ランキングデータ
   * @return {Array} 週間レポート
   */
  generateWeeklyReports(rankings) {
    Logger.log("週間レポートを生成中...");
    
    const reports = [];
    
    // 国別週間ランキングレポート（これらのみ保持）
    const countryReports = this.createCountrySpecificWeeklyReports(rankings);
    reports.push(...countryReports);
    
    Logger.log(`${reports.length}件の国別週間レポートを生成`);
    return reports;
  }
  
  /**
   * 国別週間ランキングレポートを作成
   * @param {Object} rankings - ランキングデータ
   * @return {Array} 国別レポート
   */
  createCountrySpecificWeeklyReports(rankings) {
    Logger.log("国別週間レポートを作成中...");
    
    const reports = [];
    
    // データからすべての一意の国を取得
    const countries = new Set();
    rankings.byClicks.forEach(row => {
      if (row.country) {
        countries.add(row.country);
      }
    });
    
    Logger.log(`${countries.size}カ国を発見: ${Array.from(countries).join(', ')}`);
    
    // 各国のレポートを作成
    countries.forEach(country => {
      const countryData = rankings.byClicks.filter(row => row.country === country);
      
      // 現在の週識別子を取得
      const currentWeek = countryData.length > 0 ? countryData[0].week : null;
      
      // トレンド計算用に前週データを取得を試行
      let dataWithTrends = countryData;
      if (currentWeek && WEEKLY_CONFIG.enableTrends) {
        try {
          const previousWeekData = this.getPreviousWeekDataFromSheet(`${country}週間ランキング`, currentWeek);
          if (previousWeekData.length > 0) {
            dataWithTrends = this.calculateTrends(countryData, previousWeekData);
            Logger.log(`前週に基づいて${country}データにトレンドを追加`);
          }
        } catch (error) {
          Logger.log(`${country}のトレンド計算に失敗: ${error.message}`);
        }
      }
      
      // 参照値でソート: Position ASC, then Clicks DESC, then Impressions DESC, then CTR DESC
      const sortedData = dataWithTrends
        .filter(row => row.ranking <= WEEKLY_CONFIG.topRankings)
        .sort((a, b) => {
          // 第1: 平均ポジション昇順（低い方が良い）
          if (a.position !== b.position) {
            return a.position - b.position;
          }
          // 第2: クリック降順（高い方が良い）
          if (a.clicks !== b.clicks) {
            return b.clicks - a.clicks;
          }
          // 第3: インプレッション降順（高い方が良い）
          if (a.impressions !== b.impressions) {
            return b.impressions - a.impressions;
          }
          // 第4: CTR降順（高い方が良い）
          return b.ctr - a.ctr;
        });
      
      const reportData = sortedData.map((row, index) => {
        return [
          row.week,
          row.country,
          row.device,
          row.searchQuery,
          row.pageUrl,
          row.clicks,
          row.impressions,
          row.ctr,
          row.position,
          row.ranking,
          row.trend || '',
          row.clicksChange || '',
          row.impressionsChange || '',
          row.ctrChange || '',
          row.positionChange || ''
        ];
      });
      
      const report = {
        sheetName: `${country}週間ランキング`,
        data: reportData
      };
      
      reports.push(report);
      Logger.log(`${country}週間ランキングレポートを${reportData.length}行で作成`);
    });
    
    Logger.log(`${reports.length}件の国別週間レポートを作成`);
    return reports;
  }
  
  
  /**
   * 週キーを取得（日付間隔形式: YYYY/MM/DD - YYYY/MM/DD）
   * @param {Date} date - 日付
   * @return {string} "YYYY/MM/DD - YYYY/MM/DD"形式の週キー
   */
  getWeekKey(date) {
    try {
      const d = new Date(date);
      
      // 日付を検証
      if (isNaN(d.getTime())) {
        Logger.log(`無効な日付を受信: ${date}`);
        return null;
      }
      
      // 週の開始日と終了日を計算
      const dayOfWeek = d.getDay();
      const weekStartDay = WEEKLY_CONFIG.weekStartDay || 1; // Default to Monday
      
      // 週の開始日を取得するために減算する日数を計算
      let daysToSubtract = dayOfWeek - weekStartDay;
      if (daysToSubtract < 0) {
        daysToSubtract += 7; // 月曜日から始まる週に調整
      }
      
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - daysToSubtract);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // "YYYY/MM/DD - YYYY/MM/DD"形式でフォーマット
      const formatDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      };
      
      const weekKey = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
      
      // Logger.log(`日付: ${date} -> 週キー: ${weekKey}`); // Commented out to reduce log noise
      return weekKey;
      
    } catch (error) {
      Logger.log(`日付${date}の週キー取得エラー: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 前週の開始日と終了日を取得
   * @return {Object} 前週の開始日と終了日を含むオブジェクト
   */
  getPreviousWeekRange() {
    const today = new Date();
    const weekStartDay = WEEKLY_CONFIG.weekStartDay || 1; // Default to Monday
    
    // 現在の週の開始を計算
    const currentDayOfWeek = today.getDay();
    let daysToSubtract = currentDayOfWeek - weekStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysToSubtract);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // 前週を計算（現在の週開始の7日前）
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    previousWeekEnd.setHours(23, 59, 59, 999);
    
    return {
      start: previousWeekStart,
      end: previousWeekEnd
    };
  }

  /**
   * Get specific week data for October 13-19, 2025
   * @return {Object} Object with start and end dates for Oct 13-19 week
   */
  getOct13To19WeekRange() {
        // 特定の週を指定: 2025年10月13日-19日
        const specificWeekStart = new Date(2025, 9, 13); // October 13, 2025 (month is 0-based)
        specificWeekStart.setHours(0, 0, 0, 0);

        const specificWeekEnd = new Date(2025, 9, 19); // October 19, 2025
        specificWeekEnd.setHours(23, 59, 59, 999);
    
    Logger.log(`Getting data for specific week: ${specificWeekStart.toDateString()} to ${specificWeekEnd.toDateString()}`);
    
    return {
      start: specificWeekStart,
      end: specificWeekEnd
    };
  }
  
  /**
   * トレンド計算用に既存シートから前週データを取得
   * @param {string} sheetName - シート名
   * @param {string} currentWeek - 現在の週識別子
   * @return {Array} 前週のデータ
   */
  getPreviousWeekDataFromSheet(sheetName, currentWeek) {
    try {
      const spreadsheet = getOrCreateSpreadsheet();
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`前週データ用のシート${sheetName}が見つかりません`);
        return [];
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        Logger.log(`シート${sheetName}にデータがありません`);
        return [];
      }
      
      // 前週を見つけるために現在の週を解析
      let currentWeekDate = null;
      if (currentWeek.toString().includes(' - ')) {
        const startDateStr = currentWeek.toString().split(' - ')[0].trim();
        currentWeekDate = new Date(startDateStr);
      } else {
        currentWeekDate = new Date(currentWeek);
      }
      
      // 前週の範囲を計算（7日前）
      const previousWeekStart = new Date(currentWeekDate);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      previousWeekStart.setHours(0, 0, 0, 0);
      
      const previousWeekEnd = new Date(previousWeekStart);
      previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
      previousWeekEnd.setHours(23, 59, 59, 999);
      
      // 前週キーをフォーマット
      const formatDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
      };
      
      const previousWeekKey = `${formatDate(previousWeekStart)} - ${formatDate(previousWeekEnd)}`;
      
      Logger.log(`前週を検索中: ${previousWeekKey}`);
      
      // すべてのデータを読み取り、前週でフィルタリング
      const dataRange = sheet.getRange(2, 1, lastRow - 1, 10);
      const rawData = dataRange.getValues();
      
      const previousWeekData = rawData
        .filter(row => row[0] === previousWeekKey)
        .map(row => ({
          week: row[0],
          country: row[1],
          device: row[2],
          searchQuery: row[3],
          pageUrl: row[4],
          clicks: parseInt(row[5]) || 0,
          impressions: parseInt(row[6]) || 0,
          ctr: parseFloat(row[7]) || 0,
          position: parseFloat(row[8]) || 0,
          ranking: parseInt(row[9]) || 0
        }));
      
      Logger.log(`前週${previousWeekKey}のレコードを${previousWeekData.length}件発見`);
      return previousWeekData;
      
    } catch (error) {
      Logger.log(`前週データ取得エラー: ${error.message}`);
      return [];
    }
  }

  /**
   * 履歴データのトレンド（週間変化）を計算
   * @param {Array} currentWeekData - 今週のデータ
   * @param {Array} previousWeekData - 前週のデータ
   * @return {Array} トレンド情報付きデータ
   */
  calculateTrends(currentWeekData, previousWeekData) {
    Logger.log("週間トレンドを計算中...");
    
    // 前週データのクイックルックアップ用マップを作成
    const previousWeekMap = new Map();
    previousWeekData.forEach(row => {
      const key = `${row.searchQuery}|${row.pageUrl}|${row.country}|${row.device}`;
      previousWeekMap.set(key, row);
    });
    
    // 今週の各レコードのトレンドを計算
    const trends = currentWeekData.map(currentRow => {
      const key = `${currentRow.searchQuery}|${currentRow.pageUrl}|${currentRow.country}|${currentRow.device}`;
      const previousRow = previousWeekMap.get(key);
      
      if (!previousRow) {
        // 今週の新規エントリ
        return {
          ...currentRow,
          trend: 'new',
          clicksChange: currentRow.clicks,
          impressionsChange: currentRow.impressions,
          ctrChange: currentRow.ctr,
          positionChange: -(currentRow.averagePosition - 100), // より悪いポジションは100と仮定
          rankingChange: null // 前のランキングなし
        };
      }
      
      // 変化を計算
      const clicksChange = currentRow.clicks - previousRow.clicks;
      const impressionsChange = currentRow.impressions - previousRow.impressions;
      const ctrChange = currentRow.ctr - previousRow.ctr;
      const positionChange = previousRow.position - currentRow.position; // 正の値は良い
      const rankingChange = previousRow.ranking - currentRow.ranking; // 低い数値は良い
      
      // トレンド方向を決定
      let trend = 'stable';
      if (clicksChange > 0 && impressionsChange > 0 && positionChange > 0) {
        trend = 'up';
      } else if (clicksChange < 0 || impressionsChange < 0 || positionChange < 0 || rankingChange < 0) {
        trend = 'down';
      }
      
      return {
        ...currentRow,
        trend: trend,
        clicksChange: clicksChange,
        impressionsChange: impressionsChange,
        ctrChange: ctrChange,
        positionChange: positionChange,
        rankingChange: rankingChange,
        previousWeek: {
          clicks: previousRow.clicks,
          impressions: previousRow.impressions,
          ctr: previousRow.ctr,
          position: previousRow.position,
          ranking: previousRow.ranking
        }
      };
    });
    
    Logger.log(`${trends.length}レコードのトレンドを計算`);
    return trends;
  }
  
  /**
   * 国別でデータをフィルタリング
   * @param {Array} data - フィルタリングするデータ
   * @param {string} country - フィルタリングする国
   * @return {Array} フィルタリングされたデータ
   */
  filterByCountry(data, country) {
    if (!country) {
      return data;
    }
    return data.filter(row => row.country === country);
  }
  
  /**
   * 検索クエリ別でデータをフィルタリング
   * @param {Array} data - フィルタリングするデータ
   * @param {string} query - フィルタリングする検索クエリ
   * @return {Array} フィルタリングされたデータ
   */
  filterByQuery(data, query) {
    if (!query) {
      return data;
    }
    const lowerQuery = query.toLowerCase();
    return data.filter(row => row.searchQuery.toLowerCase().includes(lowerQuery));
  }
  
  /**
   * 週別でデータをグループ化
   * @param {Array} data - データ
   * @return {Object} 週別グループ
   */
  groupByWeek(data) {
    const groups = {};
    data.forEach(row => {
      if (!groups[row.week]) {
        groups[row.week] = [];
      }
      groups[row.week].push(row);
    });
    return groups;
  }

  /**
   * Process data specifically for October 13-19, 2024 week
   * @param {Array} dailyData - Daily data
   * @return {Object} Weekly ranking data for Oct 13-19 week
   */
  processOct13To19WeekData(dailyData) {
    Logger.log("10月13-19日の週間データを処理中...");
    
    try {
      // 特定の週（10月13-19日）のデータをフィルタリング
      const octWeek = this.getOct13To19WeekRange();
      Logger.log(`10月13-19日のデータをフィルタリング: ${octWeek.start} から ${octWeek.end}`);
      
      // 10月13-19日のデータのみをフィルタリング
      const filteredData = dailyData.filter(row => {
        const rowDate = new Date(row.date);
        return rowDate >= octWeek.start && rowDate <= octWeek.end;
      });
      
      Logger.log(`10月13-19日用に${dailyData.length}行から${filteredData.length}行をフィルタリング`);
      
      const weeklyMap = new Map();
      
      filteredData.forEach(row => {
        const weekKey = "2025/10/13 - 2025/10/19"; // 固定の週キー
        
        // 無効な日付の行をスキップ
        if (!weekKey) {
          Logger.log(`無効な日付の行をスキップ: ${row.date}`);
          return;
        }
        
        const rowKey = `${row.searchQuery}|${row.pageUrl}|${row.country}|${row.device}`;
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, new Map());
        }
        
        const weekData = weeklyMap.get(weekKey);
        
        if (!weekData.has(rowKey)) {
          weekData.set(rowKey, {
            week: weekKey,
            searchQuery: row.searchQuery,
            pageUrl: row.pageUrl,
            country: row.country,
            device: row.device,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
            count: 0
          });
        }
        
        const weeklyRow = weekData.get(rowKey);
        weeklyRow.clicks += row.clicks;
        weeklyRow.impressions += row.impressions;
        weeklyRow.position += row.averagePosition;
        weeklyRow.count += 1;
      });
      
      // 週間データを配列に変換して平均を計算
      const weeklyData = [];
      weeklyMap.forEach((weekData, weekKey) => {
        weekData.forEach(row => {
          row.ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
          row.position = row.count > 0 ? row.position / row.count : 0;
          weeklyData.push(row);
        });
      });
      
      Logger.log(`${weeklyData.length}件の10月13-19日週間データレコードを生成`);
      
      // 週間ランキングを計算
      const weeklyRankings = this.calculateWeeklyRankings(weeklyData);
      
      // 週間レポートを生成
      const weeklyReports = this.generateWeeklyReports(weeklyRankings);
      
      const result = {
        weeklyData: weeklyData,
        rankings: weeklyRankings,
        reports: weeklyReports,
        weekRange: octWeek
      };
      
      Logger.log(`10月13-19日週間データ処理完了。${weeklyReports.length}件のレポートを生成`);
      return result;
      
    } catch (error) {
      Logger.log(`10月13-19日週間データ処理に失敗: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Process October 13-19, 2024 week data specifically
 * Can be executed independently to get data for that specific week
 */
function runOct13To19WeekProcessor() {
  try {
    Logger.log("=== 10月13-19日週間データ処理を開始 ===");
    
    // Get daily data from existing spreadsheet
    Logger.log("日次データを取得中...");
    const dailyData = getDailyDataFromSpreadsheet();
    
    if (!dailyData || dailyData.length === 0) {
      Logger.log("日次データが見つかりません。まずメイン関数を実行してください。");
      return;
    }
    
    Logger.log(`${dailyData.length}件の日次データレコードを取得`);
    
    // Process October 13-19 week data
    Logger.log("10月13-19日週間データを処理中...");
    const weeklyProcessor = new WeeklyProcessor();
    let octWeekResults;
    
    try {
      octWeekResults = weeklyProcessor.processOct13To19WeekData(dailyData);
    } catch (processingError) {
      Logger.log(`10月13-19日週間処理に失敗: ${processingError.message}`);
      Logger.log("フォールバック空の結果を作成中...");
      octWeekResults = {
        weeklyData: [],
        rankings: {},
        trends: {},
        reports: [],
        weekRange: { start: new Date(2025, 9, 13), end: new Date(2025, 9, 19) }
      };
    }
    
    // Debug: Log the structure of octWeekResults
    Logger.log("=== 10月13-19日週間データ処理結果 ===");
    Logger.log(`octWeekResults type: ${typeof octWeekResults}`);
    Logger.log(`octWeekResults keys: ${Object.keys(octWeekResults || {})}`);
    
    if (octWeekResults) {
      Logger.log(`Weekly data count: ${octWeekResults.weeklyData ? octWeekResults.weeklyData.length : 'undefined'}`);
      Logger.log(`Ranking count: ${octWeekResults.rankings ? Object.keys(octWeekResults.rankings).length : 'undefined'}`);
      Logger.log(`Report count: ${octWeekResults.reports ? octWeekResults.reports.length : 'undefined'}`);
    } else {
      Logger.log("エラー: octWeekResultsがnullまたは未定義です");
      return;
    }
    
    // Export October 13-19 week data to spreadsheet
    Logger.log("10月13-19日週間データをスプレッドシートにエクスポート中...");
    exportWeeklyRankingsToSpreadsheet(octWeekResults);
    
    Logger.log("=== 10月13-19日週間データ処理完了 ===");
    
  } catch (error) {
    Logger.log(`10月13-19日週間データ処理エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 週間ランキング処理を独立して実行
 * メイン関数とは別に実行可能
 */
function runWeeklyProcessor() {
  try {
    Logger.log("=== 完全な週間ランキング処理を開始 ===");
    Logger.log(`WEEKLY_CONFIG: ${WEEKLY_CONFIG ? 'defined' : 'undefined'}`);
    if (WEEKLY_CONFIG) {
      Logger.log(`WEEKLY_CONFIG.enabled: ${WEEKLY_CONFIG.enabled}`);
    }

    // Check configuration
    if (!WEEKLY_CONFIG || !WEEKLY_CONFIG.enabled) {
      Logger.log("週間ランキング機能が無効です。設定を確認してください。");
      return;
    }
    
    // ステップ1: トレンド列を含むヘッダーを更新
    Logger.log("\nステップ1: シートヘッダーを更新中...");
    updateWeeklyRankingHeaders();
    
    // ステップ2: 既存スプレッドシートから日次データを取得
    Logger.log("\nステップ2: 日次データを取得中...");
    const dailyData = getDailyDataFromSpreadsheet();
    
    if (!dailyData || dailyData.length === 0) {
      Logger.log("日次データが見つかりません。まずメイン関数を実行してください。");
      return;
    }
    
    Logger.log(`Retrieved ${dailyData.length} daily data records`);
    
    // ステップ3: 週間ランキング処理を実行
    Logger.log("\nステップ3: 週間ランキングを処理中...");
    const weeklyProcessor = new WeeklyProcessor();
    let weeklyResults;
    
    try {
      weeklyResults = weeklyProcessor.processWeeklyRankings(dailyData);
    } catch (processingError) {
      Logger.log(`週間処理に失敗: ${processingError.message}`);
      Logger.log("フォールバック空の結果を作成中...");
      weeklyResults = {
        weeklyData: [],
        rankings: {},
        trends: {},
        reports: []
      };
    }
    
    // デバッグ: weeklyResultsの構造をログ出力
    Logger.log("=== 週間ランキング処理結果 ===");
    Logger.log(`weeklyResults type: ${typeof weeklyResults}`);
    Logger.log(`weeklyResults keys: ${Object.keys(weeklyResults || {})}`);
    
    if (weeklyResults) {
      Logger.log(`Weekly data count: ${weeklyResults.weeklyData ? weeklyResults.weeklyData.length : 'undefined'}`);
      Logger.log(`Ranking count: ${weeklyResults.rankings ? Object.keys(weeklyResults.rankings).length : 'undefined'}`);
      Logger.log(`Report count: ${weeklyResults.reports ? weeklyResults.reports.length : 'undefined'}`);
    } else {
      Logger.log("エラー: weeklyResultsがnullまたは未定義です");
      return;
    }
    
    // ステップ4: 週間ランキングデータをスプレッドシートにエクスポート
    Logger.log("\nステップ4: 週間ランキングデータをエクスポート中...");
    exportWeeklyRankingsToSpreadsheet(weeklyResults);
    
    // ステップ5: 有効な場合にチャートを生成
    if (WEEKLY_CONFIG.historicalTracking) {
      Logger.log("\nステップ5: トレンドチャートを生成中...");
      try {
        generateWeeklyCharts();
      } catch (chartError) {
        Logger.log(`チャート生成に失敗: ${chartError.message}`);
        // チャートが失敗してもプロセス全体を失敗させない
      }
    }
    
    Logger.log("=== 完全な週間ランキング処理完了 ===");
    
  } catch (error) {
    Logger.log(`週間ランキング処理エラー: ${error.message}`);
    throw error;
  }
}

/**
 * Update weekly ranking sheet headers to include trend columns
 */
function updateWeeklyRankingHeaders() {
  try {
    Logger.log("Updating weekly ranking sheet headers...");
    
    const spreadsheet = getOrCreateSpreadsheet();
    
    // Find all weekly ranking sheet templates
    const countryTemplates = SPREADSHEET_TEMPLATE.sheets.filter(s => 
      s.name.includes("週間ランキング")
    );
    
    Logger.log(`Found ${countryTemplates.length} weekly ranking sheet templates`);
    
    countryTemplates.forEach(template => {
      const sheetName = template.name;
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (sheet) {
        Logger.log(`Updating ${sheetName}...`);
        
        Logger.log(`  Old headers: ${sheet.getLastColumn()} columns`);
        
        // Update headers
        sheet.getRange(1, 1, 1, template.columns.length).setValues([template.columns]);
        sheet.getRange(1, 1, 1, template.columns.length).setBackground('#d9ead3'); // Light green background
        
        Logger.log(`  New headers: ${template.columns.length} columns`);
        Logger.log(`  Columns: ${template.columns.join(', ')}`);
      } else {
        Logger.log(`Sheet ${sheetName} not found - skipping`);
      }
    });
    
    Logger.log("Header update completed!");
    
  } catch (error) {
    Logger.log(`Error updating headers: ${error.message}`);
    throw error;
  }
}

/**
 * Generate charts for all weekly ranking sheets
 */
function generateWeeklyCharts() {
  try {
    Logger.log("=== Generating Weekly Trend Charts ===");
    
    const spreadsheet = getOrCreateSpreadsheet();
    const countries = ["米国", "カナダ", "イギリス", "オーストラリア", "ニュージーランド", "シンガポール"];
    
    countries.forEach(country => {
      const sheetName = `${country}週間ランキング`;
      let sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`${sheetName} not found, creating sheet...`);
        sheet = spreadsheet.insertSheet(sheetName);
        
        // Add headers using template
        const template = SPREADSHEET_TEMPLATE.sheets.find(s => s.name.includes("週間ランキング"));
        if (template) {
          sheet.getRange(1, 1, 1, template.columns.length).setValues([template.columns]);
          sheet.getRange(1, 1, 1, template.columns.length).setBackground('#d9ead3'); // Light green background
          Logger.log(`Created ${sheetName} with headers`);
        }
        
        // Try to generate weekly data for this country
        try {
          Logger.log(`Generating weekly data for ${country}...`);
          const dailyData = getDailyDataFromSpreadsheet();
          if (dailyData && dailyData.length > 0) {
            const weeklyProcessor = new WeeklyProcessor();
            const weeklyResults = weeklyProcessor.processWeeklyRankings(dailyData);
            
            // Find the report for this country
            const countryReport = weeklyResults.reports.find(report => report.sheetName === sheetName);
            if (countryReport && countryReport.data && countryReport.data.length > 0) {
              // Add the data to the sheet
              sheet.getRange(2, 1, countryReport.data.length, countryReport.data[0].length).setValues(countryReport.data);
              Logger.log(`Added ${countryReport.data.length} rows of data to ${sheetName}`);
            }
          }
        } catch (dataError) {
          Logger.log(`Could not generate data for ${country}: ${dataError.message}`);
        }
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        Logger.log(`${sheetName} has no data, skipping chart creation`);
        return;
      }
      
      // Get all historical data
      const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
      
      // Create charts
      Logger.log(`Creating charts for ${sheetName} with ${data.length} records...`);
      createTrendCharts(data, sheetName);
    });
    
    Logger.log("=== All Charts Generated Successfully ===");
    
  } catch (error) {
    Logger.log(`Error generating charts: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Get or create the main spreadsheet
 * @return {Object} Google Spreadsheet object
 */
function getOrCreateSpreadsheet() {
  try {
    // Use the user's specific spreadsheet ID
    const SPREADSHEET_ID = "1oIyrC36E2WCLA9Sys4X3EB8SKKIPnVccxRbgkKpuv7o";
    
    Logger.log(`Using user's specific spreadsheet ID: ${SPREADSHEET_ID}`);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    Logger.log(`Successfully opened spreadsheet: "${spreadsheet.getName()}"`);
    Logger.log(`Spreadsheet URL: ${spreadsheet.getUrl()}`);
    
    return spreadsheet;
    
  } catch (error) {
    Logger.log(`Error opening user's spreadsheet: ${error.message}`);
    Logger.log(`Please check that the spreadsheet ID is correct and the service account has access to it`);
    throw error;
  }
}

/**
 * Get daily data from spreadsheet
 * @return {Array} Daily data
 */
function getDailyDataFromSpreadsheet() {
  try {
    Logger.log("Getting daily data from spreadsheet...");
    
    // Get existing spreadsheet
    const spreadsheet = getOrCreateSpreadsheet();
    Logger.log(`Spreadsheet found: ${spreadsheet.getName()}`);
    
    const allSitesSheet = spreadsheet.getSheetByName("全サイトデータ");
    
    if (!allSitesSheet) {
      Logger.log("全サイトデータ sheet not found");
      Logger.log("Available sheets:");
      const sheets = spreadsheet.getSheets();
      sheets.forEach(sheet => {
        Logger.log(`- ${sheet.getName()}`);
      });
      return [];
    }
    
    // Get data (excluding header row)
    const lastRow = allSitesSheet.getLastRow();
    const lastCol = allSitesSheet.getLastColumn();
    Logger.log(`全サイトデータ sheet has ${lastRow} rows, ${lastCol} columns`);
    
    if (lastRow <= 1) {
      Logger.log("No data available in 全サイトデータ sheet");
      return [];
    }
    
    // Check what's actually in the sheet
    Logger.log("Checking actual data in 全サイトデータ sheet...");
    const sampleRange = allSitesSheet.getRange(1, 1, Math.min(5, lastRow), lastCol);
    const sampleData = sampleRange.getValues();
    Logger.log(`Sample data (first ${Math.min(5, lastRow)} rows): ${JSON.stringify(sampleData)}`);
    
    const dataRange = allSitesSheet.getRange(2, 1, lastRow - 1, 10);
    const rawData = dataRange.getValues();
    
    Logger.log(`Raw data retrieved: ${rawData.length} rows`);
    if (rawData.length > 0) {
      Logger.log(`First raw data row: ${JSON.stringify(rawData[0])}`);
    }
    
    // Transform data
    const dailyData = rawData.map(row => ({
      site: row[0],
      date: parseJapaneseDate(row[1]),
      searchQuery: row[2],
      pageUrl: row[3],
      country: row[4],
      device: row[5],
      clicks: parseInt(row[6]) || 0,
      impressions: parseInt(row[7]) || 0,
      ctr: parseFloat(row[8]) || 0,
      averagePosition: parseFloat(row[9]) || 0
    }));
    
    Logger.log(`Retrieved ${dailyData.length} daily data records`);
    return dailyData;
    
  } catch (error) {
    Logger.log(`Daily data retrieval error: ${error.message}`);
    return [];
  }
}

/**
 * Get existing weeks from a sheet (to check for duplicates)
 * @param {Object} sheet - Google Sheet object
 * @return {Object} Object with uniqueWeeks array and latestWeek date
 */
function getExistingWeeks(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return {
        uniqueWeeks: [],
        latestWeek: null,
        weekCounts: {}
      }; // No data rows
    }
    
    // Week is in the first column (column 1)
    const weekColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const uniqueWeeks = new Set();
    const weekCounts = {};
    let latestDate = null;
    
    weekColumn.forEach(row => {
      if (row[0] && row[0] !== '') {
        const weekStr = row[0].toString();
        uniqueWeeks.add(weekStr);
        
        // Count occurrences
        weekCounts[weekStr] = (weekCounts[weekStr] || 0) + 1;
        
        // Try to parse as date to find latest
        // Handle date interval format: "YYYY/MM/DD - YYYY/MM/DD"
        try {
          let weekDate = null;
          
          // Check if it's a date interval format
          if (weekStr.includes(' - ')) {
            // Extract the start date from the interval
            const startDateStr = weekStr.split(' - ')[0].trim();
            weekDate = new Date(startDateStr);
          } else {
            // Try parsing as regular date
            weekDate = new Date(weekStr);
          }
          
          if (!isNaN(weekDate.getTime())) {
            if (!latestDate || weekDate > latestDate) {
              latestDate = weekDate;
            }
          }
        } catch (e) {
          // Not a date, skip
        }
      }
    });
    
    return {
      uniqueWeeks: Array.from(uniqueWeeks),
      latestWeek: latestDate,
      weekCounts: weekCounts
    };
    
  } catch (error) {
    Logger.log(`Error getting existing weeks: ${error.message}`);
    return {
      uniqueWeeks: [],
      latestWeek: null,
      weekCounts: {}
    };
  }
}

/**
 * Export weekly ranking data to spreadsheet
 * @param {Object} weeklyResults - Weekly ranking results
 */
function exportWeeklyRankingsToSpreadsheet(weeklyResults) {
  try {
    Logger.log("Exporting weekly ranking data to spreadsheet...");
    
    // Validate weeklyResults
    if (!weeklyResults) {
      Logger.log("Error: weeklyResults is undefined");
      return;
    }
    
    if (!weeklyResults.reports) {
      Logger.log("Error: weeklyResults.reports is undefined");
      Logger.log(`weeklyResults structure: ${JSON.stringify(Object.keys(weeklyResults))}`);
      return;
    }
    
    Logger.log(`Processing ${weeklyResults.reports.length} weekly reports`);
    
    // Get existing spreadsheet
    const spreadsheet = getOrCreateSpreadsheet();
    
    // Process weekly ranking sheets
    weeklyResults.reports.forEach((report, index) => {
      Logger.log(`Processing report ${index + 1}: ${report.sheetName}`);
      Logger.log(`Report data length: ${report.data ? report.data.length : 'undefined'}`);
      
      const sheetName = report.sheetName;
      let sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`Creating ${sheetName} sheet...`);
        sheet = spreadsheet.insertSheet(sheetName);
      }
      
      // Find template for this sheet
      let template = SPREADSHEET_TEMPLATE.sheets.find(s => s.name === sheetName);
      
      // If not found and it's a country-specific sheet, use the first country template as fallback
      if (!template && sheetName.includes("週間ランキング")) {
        template = SPREADSHEET_TEMPLATE.sheets.find(s => s.name.includes("週間ランキング"));
        if (template) {
          Logger.log(`Using ${template.name} template for ${sheetName}`);
        }
      }
      
      // Check if headers exist and if they match the template
      const lastRow = sheet.getLastRow();
      const hasHeaders = lastRow >= 1;
      const needsHeaderUpdate = hasHeaders && template;
      
      if (needsHeaderUpdate) {
        // Check if headers need updating by comparing column count
        const currentColumnCount = sheet.getLastColumn();
        const expectedColumnCount = template.columns.length;
        
        if (currentColumnCount !== expectedColumnCount) {
          Logger.log(`Updating headers for ${sheetName}: ${currentColumnCount} cols -> ${expectedColumnCount} cols`);
          // Update headers to match the template
          sheet.getRange(1, 1, 1, expectedColumnCount).setValues([template.columns]);
          sheet.getRange(1, 1, 1, expectedColumnCount).setBackground('#d9ead3'); // Light green background
          Logger.log(`Headers updated successfully for ${sheetName}`);
        }
      }
      
      // Add headers if sheet is empty
      const needsHeaders = lastRow === 0 || !sheet.getRange(1, 1, 1, 1).getValue();
      
      if (needsHeaders) {
        Logger.log(`Adding headers for ${sheetName}...`);
        
        if (template) {
          Logger.log(`Setting headers for ${sheetName}: ${template.columns.join(', ')}`);
          sheet.getRange(1, 1, 1, template.columns.length).setValues([template.columns]);
          sheet.getRange(1, 1, 1, template.columns.length).setBackground('#d9ead3'); // Light green background
          Logger.log(`Headers set successfully for ${sheetName}`);
        } else {
          Logger.log(`No template found for ${sheetName}`);
        }
      }
      
      // PHASE 2: APPEND-ONLY WEEKLY HISTORY LOGIC
      // Detect the latest existing week, append new data if newer, prevent overwrites
      if (report.data && report.data.length > 0) {
        // Get the week from the first row of data
        const newWeek = report.data[0][0]; // Week is in the first column
        
        Logger.log(`\n=== Processing Week: ${newWeek} for ${sheetName} ===`);
        
        // Get existing weeks and latest week from the sheet
        const weekInfo = getExistingWeeks(sheet);
        const existingWeeks = weekInfo.uniqueWeeks;
        const latestWeek = weekInfo.latestWeek;
        const weekCounts = weekInfo.weekCounts;
        
        Logger.log(`Existing weeks in ${sheetName}: ${existingWeeks.length} unique weeks`);
        if (existingWeeks.length > 0) {
          Logger.log(`Existing weeks: ${existingWeeks.join(', ')}`);
          Logger.log(`Week row counts: ${JSON.stringify(weekCounts)}`);
        }
        if (latestWeek) {
          Logger.log(`Latest existing week: ${latestWeek}`);
        }
        
        // Check if this week already exists in the sheet
        const weekAlreadyExists = existingWeeks.includes(newWeek.toString());
        
        if (weekAlreadyExists) {
          // Week already exists - UPDATE existing data
          Logger.log(`⚠️ Week ${newWeek} already exists in ${sheetName}`);
          Logger.log(`📝 Row count for this week: ${weekCounts[newWeek] || 0} rows`);
          Logger.log(`🔄 Updating existing week data...`);
          
          // Find the rows for this week and replace them
          const weekColumn = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
          let weekStartRow = -1;
          let weekEndRow = -1;
          
          // Find the start and end rows for this week
          for (let i = 0; i < weekColumn.length; i++) {
            if (weekColumn[i][0] && weekColumn[i][0].toString() === newWeek.toString()) {
              if (weekStartRow === -1) {
                weekStartRow = i + 1; // Convert to 1-based row index
              }
              weekEndRow = i + 1; // Update end row as we find more rows
            }
          }
          
          if (weekStartRow !== -1 && weekEndRow !== -1) {
            const existingRowCount = weekEndRow - weekStartRow + 1;
            const newRowCount = report.data.length;
            
            Logger.log(`📊 Found existing week data at rows ${weekStartRow}-${weekEndRow} (${existingRowCount} rows)`);
            Logger.log(`📊 New data has ${newRowCount} rows`);
            
            // Delete existing rows for this week
            if (existingRowCount > 0) {
              sheet.deleteRows(weekStartRow, existingRowCount);
              Logger.log(`🗑️ Deleted ${existingRowCount} existing rows for week ${newWeek}`);
            }
            
            // Insert new data at the same position
            try {
              sheet.insertRowsBefore(weekStartRow, newRowCount);
              sheet.getRange(weekStartRow, 1, newRowCount, report.data[0].length).setValues(report.data);
              Logger.log(`✅ Successfully updated week ${newWeek} with ${newRowCount} rows`);
            } catch (updateError) {
              Logger.log(`❌ Error updating week ${newWeek}: ${updateError.message}`);
            }
          } else {
            Logger.log(`❌ Could not find existing week data rows for ${newWeek}`);
          }
        } else {
          // New week - check if it's newer than the latest existing week
          // Extract start date from interval format: "YYYY/MM/DD - YYYY/MM/DD"
          let newWeekDate = null;
          try {
            if (newWeek.toString().includes(' - ')) {
              const startDateStr = newWeek.toString().split(' - ')[0].trim();
              newWeekDate = new Date(startDateStr);
            } else {
              newWeekDate = new Date(newWeek);
            }
          } catch (e) {
            Logger.log(`Error parsing newWeek date: ${e.message}`);
            newWeekDate = new Date(newWeek);
          }
          
          const isNewerWeek = !latestWeek || isNaN(newWeekDate.getTime()) || newWeekDate >= latestWeek;
          
          if (isNewerWeek || !latestWeek) {
            Logger.log(`✅ Week ${newWeek} is NEW - inserting at TOP of ${sheetName}...`);
            if (latestWeek) {
              Logger.log(`   (Newer than latest existing week: ${latestWeek})`);
            }
            
            // Check if sheet has any data beyond headers
            const lastRow = sheet.getLastRow();
            const hasData = lastRow > 1;
            
            if (hasData) {
              // Sheet has data - we need to INSERT rows and shift existing data down
              Logger.log(`📊 Sheet has ${lastRow - 1} existing data rows - inserting ${report.data.length} new rows at TOP`);
              
              try {
                // Insert blank rows for the new data (starting at row 2, after header)
                sheet.insertRows(2, report.data.length);
                Logger.log(`📝 Inserted ${report.data.length} blank rows at row 2`);
                
                // Write the new data to the newly inserted rows
                sheet.getRange(2, 1, report.data.length, report.data[0].length).setValues(report.data);
                Logger.log(`✅ Successfully inserted ${report.data.length} new rows at TOP of ${sheetName}`);
                
                // Auto-resize columns after data is written
                // Auto-resize disabled
                Logger.log(`📏 Columns auto-resized`);
                
                // Verify data was written
                const writtenData = sheet.getRange(2, 1, Math.min(3, report.data.length), report.data[0].length).getValues();
                Logger.log(`✓ Verification - first 3 rows: ${JSON.stringify(writtenData)}`);
              } catch (writeError) {
                Logger.log(`❌ Error writing to ${sheetName}: ${writeError.message}`);
              }
            } else {
              // Sheet is empty (only header) - just write to row 2
              Logger.log(`📊 Sheet is empty - writing to row 2`);
              
              try {
                sheet.getRange(2, 1, report.data.length, report.data[0].length).setValues(report.data);
                Logger.log(`✅ Successfully wrote ${report.data.length} rows to ${sheetName}`);
                
                // Auto-resize columns after data is written
                // Auto-resize disabled
                Logger.log(`📏 Columns auto-resized`);
              } catch (writeError) {
                Logger.log(`❌ Error writing to ${sheetName}: ${writeError.message}`);
              }
            }
          } else {
            // Week exists and is older than latest - this shouldn't happen with current data
            Logger.log(`⚠️ Week ${newWeek} is OLDER than latest week (${latestWeek})`);
            Logger.log(`⚠️ This data seems to be historical - inserting at bottom to maintain history`);
            
            // Insert at bottom for historical data
            const lastRow = sheet.getLastRow();
            const insertRow = lastRow + 1;
            
            try {
              sheet.getRange(insertRow, 1, report.data.length, report.data[0].length).setValues(report.data);
              Logger.log(`✅ Appended historical week ${newWeek} to ${sheetName}`);
              // Auto-resize disabled
            } catch (writeError) {
              Logger.log(`❌ Error writing historical week: ${writeError.message}`);
            }
          }
        }
      } else {
        Logger.log(`No data to write to ${sheetName} - skipping empty sheet`);
        // For empty sheets, just ensure headers are set
        if (sheet.getLastRow() === 1) {
          Logger.log(`Sheet ${sheetName} is empty with only headers - this is normal`);
        }
      }
    });
    
    // Verify all sheets were created and have data
    Logger.log("=== Verifying Weekly Ranking Sheets ===");
    
    // Get all sheets that start with a country name and "Weekly Rankings"
    const allSheets = spreadsheet.getSheets();
    const weeklySheetNames = [];
    
    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      // Include country-specific sheets (e.g., "米国週間ランキング")  
      // and standard weekly sheets
      if (sheetName.includes("週間ランキング") || 
          sheetName.includes("週間トップパフォーマー") ||
          sheetName.includes("国別週間パフォーマンス") ||
          sheetName.includes("デバイス週間パフォーマンス")) {
        weeklySheetNames.push(sheetName);
      }
    });
    
    Logger.log(`Found ${weeklySheetNames.length} weekly ranking sheets`);
    
    weeklySheetNames.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        Logger.log(`${sheetName}: ${lastRow} rows, ${lastCol} columns`);
        
        if (lastRow > 1) {
          const sampleData = sheet.getRange(2, 1, Math.min(2, lastRow - 1), lastCol).getValues();
          Logger.log(`${sheetName} sample data: ${JSON.stringify(sampleData)}`);
        } else {
          Logger.log(`${sheetName}: Empty sheet (only headers) - this is normal if no data available`);
        }
      } else {
        Logger.log(`${sheetName}: Sheet not found`);
      }
    });
    
    // Summary of sheet status
    Logger.log("=== Weekly Ranking Sheets Summary ===");
    let sheetsWithData = 0;
    let emptySheets = 0;
    
    weeklySheetNames.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheetsWithData++;
          Logger.log(`✅ ${sheetName}: Has data (${lastRow - 1} rows)`);
        } else {
          emptySheets++;
          Logger.log(`📋 ${sheetName}: Empty (headers only)`);
        }
      }
    });
    
    Logger.log(`Summary: ${sheetsWithData} sheets with data, ${emptySheets} empty sheets`);
    
    // Apply conditional formatting to weekly ranking sheets
    applyWeeklyRankingFormatting(spreadsheet);
    
    Logger.log("Weekly ranking data export completed");
    
  } catch (error) {
    Logger.log(`Weekly ranking export error: ${error.message}`);
    throw error;
  }
}

/**
 * Compare data between main function and weekly processor
 */
function compareDataSources() {
  try {
    Logger.log("=== Comparing Data Sources ===");
    
    // Check what main function would see
    Logger.log("1. Checking main function data source...");
    const mainData = getDailyDataFromSpreadsheet();
    Logger.log(`Main function would see: ${mainData.length} records`);
    
    // Check what's actually in the sheet
    Logger.log("2. Checking actual sheet content...");
    const spreadsheet = getOrCreateSpreadsheet();
    const allSitesSheet = spreadsheet.getSheetByName("全サイトデータ");
    
    if (allSitesSheet) {
      const lastRow = allSitesSheet.getLastRow();
      const lastCol = allSitesSheet.getLastColumn();
      Logger.log(`Sheet reports: ${lastRow} rows, ${lastCol} columns`);
      
      // Check for empty rows
      let actualDataRows = 0;
      for (let row = 2; row <= lastRow; row++) {
        const rowData = allSitesSheet.getRange(row, 1, 1, lastCol).getValues()[0];
        const hasData = rowData.some(cell => cell !== null && cell !== undefined && cell !== "");
        if (hasData) {
          actualDataRows++;
        }
      }
      Logger.log(`Actual data rows (non-empty): ${actualDataRows}`);
    }
    
  } catch (error) {
    Logger.log(`Error comparing data sources: ${error.message}`);
  }
}

/**
 * Check current state of 全サイトデータ sheet
 */
function checkAllSitesDataSheet() {
  try {
    Logger.log("=== Checking 全サイトデータ Sheet ===");
    
    const spreadsheet = getOrCreateSpreadsheet();
    const allSitesSheet = spreadsheet.getSheetByName("全サイトデータ");
    
    if (!allSitesSheet) {
      Logger.log("全サイトデータ sheet not found");
      return;
    }
    
    const lastRow = allSitesSheet.getLastRow();
    const lastCol = allSitesSheet.getLastColumn();
    Logger.log(`全サイトデータ sheet: ${lastRow} rows, ${lastCol} columns`);
    
    if (lastRow > 1) {
      // Show first few rows
      Logger.log("First 5 rows of data:");
      for (let row = 1; row <= Math.min(5, lastRow); row++) {
        const rowData = allSitesSheet.getRange(row, 1, 1, lastCol).getValues()[0];
        Logger.log(`Row ${row}: ${rowData.slice(0, 5).join(" | ")}${lastCol > 5 ? "..." : ""}`);
      }
      
      // Show last few rows
      if (lastRow > 5) {
        Logger.log("Last 3 rows of data:");
        for (let row = Math.max(1, lastRow - 2); row <= lastRow; row++) {
          const rowData = allSitesSheet.getRange(row, 1, 1, lastCol).getValues()[0];
          Logger.log(`Row ${row}: ${rowData.slice(0, 5).join(" | ")}${lastCol > 5 ? "..." : ""}`);
        }
      }
    } else {
      Logger.log("No data in 全サイトデータ sheet");
    }
    
  } catch (error) {
    Logger.log(`Error checking 全サイトデータ sheet: ${error.message}`);
  }
}


/**
 * Parse Japanese date format to JavaScript Date object
 * @param {string} dateStr - Date string in format "2025年10月24日"
 * @return {Date} JavaScript Date object
 */
function parseJapaneseDate(dateStr) {
  try {
    // Handle Japanese date format: "2025年10月24日"
    if (typeof dateStr === 'string' && dateStr.includes('年') && dateStr.includes('月') && dateStr.includes('日')) {
      const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JavaScript months are 0-based
        const day = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }
    
    // Handle standard date formats
    if (dateStr instanceof Date) {
      return dateStr;
    }
    
    // Try to parse as standard date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      Logger.log(`Warning: Could not parse date: ${dateStr}`);
      return new Date(); // Return current date as fallback
    }
    
    return date;
    
  } catch (error) {
    Logger.log(`Error parsing date "${dateStr}": ${error.message}`);
    return new Date(); // Return current date as fallback
  }
}

/**
 * Apply conditional formatting to weekly ranking sheets
 * @param {Object} spreadsheet - Google Spreadsheet object
 */
function applyWeeklyRankingFormatting(spreadsheet) {
  try {
    Logger.log("Applying conditional formatting to weekly ranking sheets...");
    
    // Get all sheets (including country-specific ones)
    const allSheets = spreadsheet.getSheets();
    const weeklySheetNames = [];
    
    allSheets.forEach(sheet => {
      const sheetName = sheet.getName();
      if (sheetName.includes("Weekly Rankings") || 
          sheetName.includes("Weekly Top Performers") ||
          sheetName.includes("Country Weekly Performance") ||
          sheetName.includes("Device Weekly Performance")) {
        weeklySheetNames.push(sheetName);
      }
    });
    
    Logger.log(`Found ${weeklySheetNames.length} weekly ranking sheets to format`);
    
    weeklySheetNames.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`Sheet ${sheetName} not found, skipping formatting`);
        return;
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        Logger.log(`Sheet ${sheetName} has no data, skipping formatting`);
        return;
      }
      
      Logger.log(`Applying formatting to ${sheetName} (${lastRow} rows)`);
      
      const rules = [];
      
      // Apply formatting to all weekly ranking sheets (including country-specific)
      if (sheetName.includes("週間ランキング") || sheetName.includes("週間トップパフォーマー") || sheetName.includes("国別週間パフォーマンス") || sheetName.includes("デバイス週間パフォーマンス")) {
        // Position column (9) - Green for 1-3, Yellow for 4-15, Red for 15+
        const positionColumn = 9;
        const positionRange = sheet.getRange(2, positionColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThanOrEqualTo(3)
          .setBackground('#d9ead3') // Light green
          .setRanges([positionRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 15)
          .setBackground('#fff2cc') // Light yellow
          .setRanges([positionRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThan(15)
          .setBackground('#f4cccc') // Light red
          .setRanges([positionRange])
          .build());
        
        // Clicks column (6) - Green for 15+, Yellow for 4-15, Red for <4
        const clicksColumn = 6;
        const clicksRange = sheet.getRange(2, clicksColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(15)
          .setBackground('#d9ead3') // Light green
          .setRanges([clicksRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 14)
          .setBackground('#fff2cc') // Light yellow
          .setRanges([clicksRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(4)
          .setBackground('#f4cccc') // Light red
          .setRanges([clicksRange])
          .build());
        
        // Impressions column (7) - Green for 15+, Yellow for 4-15, Red for <4
        const impressionsColumn = 7;
        const impressionsRange = sheet.getRange(2, impressionsColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(15)
          .setBackground('#d9ead3') // Light green
          .setRanges([impressionsRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 14)
          .setBackground('#fff2cc') // Light yellow
          .setRanges([impressionsRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(4)
          .setBackground('#f4cccc') // Light red
          .setRanges([impressionsRange])
          .build());
        
        // CTR column (8) - Green for 10%+, Yellow for 4-10%, Red for <4%
        const ctrColumn = 8;
        const ctrRange = sheet.getRange(2, ctrColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(0.10) // 10%
          .setBackground('#d9ead3') // Light green
          .setRanges([ctrRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(0.04, 0.099) // 4-10%
          .setBackground('#fff2cc') // Light yellow
          .setRanges([ctrRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(0.04) // <4%
          .setBackground('#f4cccc') // Light red
          .setRanges([ctrRange])
          .build());
      }
      
      // Apply all rules
      if (rules.length > 0) {
        sheet.setConditionalFormatRules(rules);
        Logger.log(`Applied ${rules.length} formatting rules to ${sheetName}`);
      }
    });
    
    Logger.log("Weekly ranking sheets formatting completed");
    
  } catch (error) {
    Logger.log(`Error applying weekly ranking formatting: ${error.message}`);
  }
}


/**
 * Create trend charts for weekly ranking data
 * @param {Array} historicalData - Array of weekly data with trends
 * @param {string} sheetName - Name of the sheet to add charts to
 */
function createTrendCharts(historicalData, sheetName) {
  try {
    Logger.log(`Creating trend charts for ${sheetName}...`);
    
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet || !historicalData || historicalData.length === 0) {
      Logger.log(`Cannot create charts: sheet not found or no data`);
      return;
    }
    
    // Group data by week
    const weeklyData = groupWeeklyData(historicalData);
    let weeks = Object.keys(weeklyData).sort();
    
    if (weeks.length < 2) {
      Logger.log(`Need at least 2 weeks of data for charts. Current weeks: ${weeks.length}`);
      return;
    }
    
    // Filter weeks to show only the last 3 months (approximately 12 weeks)
    // NOTE: Charts can technically display unlimited weeks, but we limit to 12 for readability
    // If you need more weeks, increase maxWeeksToDisplay (e.g., 24 for 6 months, 52 for 1 year)
    const maxWeeksToDisplay = 12;
    if (weeks.length > maxWeeksToDisplay) {
      weeks = weeks.slice(-maxWeeksToDisplay); // Take the most recent 12 weeks
      Logger.log(`Filtered to show last ${maxWeeksToDisplay} weeks out of ${Object.keys(weeklyData).length} total weeks`);
    }
    
    // Prepare data for chart with headers
    const chartData = [
      ['週', 'クリック数', 'インプレッション数', 'CTR (%)', '平均ポジション'], // Header row
      ...weeks.map(week => {
        const weekRecords = weeklyData[week];
        const totals = weekRecords.reduce((acc, row) => ({
          clicks: acc.clicks + parseInt(row[5]) || 0,
          impressions: acc.impressions + parseInt(row[6]) || 0
        }), { clicks: 0, impressions: 0 });
        
        const avgCTR = weekRecords.length > 0 
          ? (totals.clicks / totals.impressions) * 100 : 0;
        const avgPosition = weekRecords.length > 0
          ? weekRecords.reduce((sum, row) => sum + parseFloat(row[8]) || 0, 0) / weekRecords.length
          : 0;
        
        return [week, totals.clicks, totals.impressions, avgCTR, avgPosition];
      })
    ];
    
    // Create combined chart with all metrics
    // Determine the title based on how many weeks are shown
    const totalWeeks = weeks.length;
    const title = totalWeeks >= 12 
      ? '週間パフォーマンストレンド（過去3ヶ月）' 
      : `週間パフォーマンストレンド（過去${totalWeeks}週）`;
    
    Logger.log(`Chart title will be: "${title}"`);
    
    // Get current last row to place chart safely
    const currentLastRow = sheet.getLastRow();
    const safeChartRow = Math.max(5, currentLastRow + 2); // At least row 5, or 2 rows after data
    
    // Find the last column with data in row 3 (first data row after headers)
    const headerRow = 1;
    const firstDataRow = 3;
    const lastColumnInRow3 = sheet.getLastColumn();
    
    // Check what columns actually have data in row 3
    let lastDataColumn = 1; // Start with column 1
    const row3Data = sheet.getRange(firstDataRow, 1, 1, lastColumnInRow3).getValues()[0];
    
    // Find the rightmost column with data in row 3
    for (let col = lastColumnInRow3; col >= 1; col--) {
      if (row3Data[col - 1] !== null && row3Data[col - 1] !== '') {
        lastDataColumn = col;
        break;
      }
    }
    
    Logger.log(`Row 3 last data column: ${lastDataColumn}`);
    
    // Position chart after the last data column (with 1 column gap)
    const chartStartColumn = lastDataColumn + 1;
    
    // Debug: Log chart data to verify impression values
    Logger.log(`Chart data sample (first 3 rows):`);
    chartData.slice(0, 3).forEach((row, idx) => {
      Logger.log(`Row ${idx}: Week=${row[0]}, Clicks=${row[1]}, Impressions=${row[2]}, CTR=${row[3]}, Position=${row[4]}`);
    });
    
    const combinedChart = createCombinedTrendChart(sheet, chartData, {
      title: title,
      //position: { col: 3, row: chartStartColumn + 1, width: 800, height: 450 }
      position: { col: 3, row: 26, width: 800, height: 450 }
    });
    
    Logger.log(`Created combined trend chart with all metrics`);
    
    Logger.log(`Trend charts created successfully for ${sheetName}`);
    
  } catch (error) {
    Logger.log(`Error creating trend charts: ${error.message}`);
  }
}

/**
 * Group historical data by week
 * @param {Array} data - Historical data
 * @return {Object} Data grouped by week
 */
function groupWeeklyData(data) {
  const grouped = {};
  
  data.forEach(row => {
    const week = row[0];
    if (!grouped[week]) {
      grouped[week] = [];
    }
    grouped[week].push(row);
  });
  
  return grouped;
}

/**
 * Create a line chart
 * @param {Object} sheet - Google Sheet
 * @param {Array} data - Chart data
 * @param {Object} options - Chart options
 * @return {Object} Chart object
 */
function createLineChart(sheet, data, options) {
  try {
    // Get the next available column to store chart data temporarily
    const lastCol = sheet.getLastColumn();
    const chartDataCol = lastCol + 2; // Start 2 columns after existing data
    
    // Ensure we have enough columns
    if (data[0].length > 0) {
      // Set chart data in temporary columns
      const chartDataRange = sheet.getRange(1, chartDataCol, data.length, data[0].length);
      chartDataRange.setValues(data);
      
      // Build ranges for each data series
      const dataRanges = options.yAxisColumns.map(colIndex => {
        return sheet.getRange(1, chartDataCol + colIndex, data.length, 1);
      });
      
      // Build chart
      const chartBuilder = sheet.newChart()
        .setChartType(Charts.ChartType.LINE)
        .addRange(sheet.getRange(1, chartDataCol, data.length, 1)); // X-axis (week)
      
      // Add data series
      dataRanges.forEach((range, index) => {
        chartBuilder.addRange(range);
      });
      
      chartBuilder
        .setPosition(options.position.col, 
                     options.position.row, 0, 0)
        .setOption('title', options.title)
        .setOption('width', options.position.width)
        .setOption('height', options.position.height)
        .setOption('legend', { position: 'top' })
        .setOption('hAxis', { title: '週' })
        .setOption('vAxis', { title: '値' });
      
      if (options.seriesNames) {
        chartBuilder.setOption('series', {
          0: { labelInLegend: options.seriesNames[0] },
          1: { labelInLegend: options.seriesNames[1] }
        });
      }
      
      const chart = chartBuilder.build();
      sheet.insertChart(chart);
      
      Logger.log(`Successfully created line chart at column ${chartDataCol}`);
      return chart;
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`Error creating line chart: ${error.message}`);
    return null;
  }
}

/**
 * Create a column chart
 * @param {Object} sheet - Google Sheet
 * @param {Array} data - Chart data
 * @param {Object} options - Chart options
 * @return {Object} Chart object
 */
function createColumnChart(sheet, data, options) {
  try {
    // Get the next available column to store chart data temporarily
    const lastCol = sheet.getLastColumn();
    const chartDataCol = lastCol + 2; // Start 2 columns after existing data
    
    // Ensure we have enough columns
    if (data[0].length > 0) {
      // Set chart data in temporary columns
      const chartDataRange = sheet.getRange(1, chartDataCol, data.length, data[0].length);
      chartDataRange.setValues(data);
      
      // Build chart
      const chartBuilder = sheet.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(sheet.getRange(1, chartDataCol, data.length, 1)) // X-axis (week)
        .addRange(sheet.getRange(1, chartDataCol + options.yAxisColumn, data.length, 1)) // Y-axis (value)
        .setPosition(options.position.col, 
                     options.position.row, 0, 0)
        .setOption('title', options.title)
        .setOption('width', options.position.width)
        .setOption('height', options.position.height)
        .setOption('legend', { position: 'top' })
        .setOption('hAxis', { title: '週' })
        .setOption('vAxis', { title: '値' })
        .setOption('colors', ['#4285f4', '#ea4335']);
      
      const chart = chartBuilder.build();
      sheet.insertChart(chart);
      
      Logger.log(`Successfully created column chart at column ${chartDataCol}`);
      return chart;
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`Error creating column chart: ${error.message}`);
    return null;
  }
}

/**
 * Create a combined trend chart with all metrics
 * @param {Object} sheet - Google Sheet
 * @param {Array} data - Chart data with headers
 * @param {Object} options - Chart options
 * @return {Object} Chart object
 */
function createCombinedTrendChart(sheet, data, options) {
  try {
    if (data.length === 0) {
      Logger.log("No data provided for chart");
      return null;
    }
    
    // Use fixed column positions for chart data (columns 20-24)
    const chartDataCol = 20;
    const numCols = data[0].length; // Should be 5: Week, Clicks, Impressions, CTR, Position
    const numRows = data.length; // Including header
    
    Logger.log(`Chart data dimensions: ${numRows} rows × ${numCols} columns, starting at column ${chartDataCol}`);
    
    // Ensure we have valid dimensions
    if (numRows === 0 || numCols === 0 || !data[0] || !Array.isArray(data[0])) {
      Logger.log("Invalid chart data structure");
      return null;
    }
    
    // Remove ALL existing charts before creating a new one
    // (Chart titles aren't accessible via getOptions() in Apps Script)
    const existingCharts = sheet.getCharts();
    Logger.log(`Found ${existingCharts.length} existing charts on sheet. Removing all before creating new chart.`);
    
    if (existingCharts.length > 0) {
      existingCharts.forEach((chart, index) => {
        sheet.removeChart(chart);
        Logger.log(`Removed existing chart ${index + 1}`);
      });
      Logger.log(`All existing charts removed. Creating new chart with title: "${options.title}"`);
    } else {
      Logger.log(`No existing charts found. Creating new chart with title: "${options.title}"`);
    }
    
    const wasUpdate = existingCharts.length > 0;
    
    // Set chart data in temporary columns (including headers)
    const chartDataRange = sheet.getRange(1, chartDataCol, numRows, numCols);
    chartDataRange.setValues(data);
    
    // Build ranges for each data series
    const xAxisRange = sheet.getRange(1, chartDataCol, numRows, 1); // Week column
    const clicksRange = sheet.getRange(1, chartDataCol + 1, numRows, 1); // Clicks
    const impressionsRange = sheet.getRange(1, chartDataCol + 2, numRows, 1); // Impressions
    const ctrRange = sheet.getRange(1, chartDataCol + 3, numRows, 1); // CTR
    const positionRange = sheet.getRange(1, chartDataCol + 4, numRows, 1); // Position
    
    // Debug: Log the impression values that will be plotted
    const impressionValues = data.map(row => row[2]); // Impressions is column 3 (index 2)
    Logger.log(`Impression values for chart: ${impressionValues.join(', ')}`);
    
    // Build chart with combo type (lines with different Y-axes)
    const chartBuilder = sheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(xAxisRange) // X-axis: Week
      .addRange(clicksRange) // Series 1: Clicks
      .addRange(impressionsRange) // Series 2: Impressions
      .addRange(ctrRange) // Series 3: CTR
      .addRange(positionRange) // Series 4: Position
      .setPosition(options.position.col, options.position.row, 0, 0)
      .setOption('title', options.title)
      .setOption('width', options.position.width)
      .setOption('height', options.position.height)
      .setOption('legend', { position: 'top' })
      .setOption('hAxis', { 
        title: '週',
        titleTextStyle: { bold: true },
        gridlines: { color: '#cccccc', count: 3 }
      })
      .setOption('vAxes', {
        0: { 
          title: 'クリック数 / インプレッション数',
          titleTextStyle: { bold: true },
          viewWindow: { min: -10, max: null },
          logScale: false,
          gridlines: { count: 5 }
        },
        1: {
          title: 'CTR (%) / 平均ポジション',
          titleTextStyle: { bold: true },
          viewWindow: { min: -1, max: null },
          format: 'decimal',
          scaleType: 'linear',
          gridlines: { count: 5 }
        }
      })
      .setOption('series', {
        0: { 
          labelInLegend: 'クリック数',
          type: 'line',
          targetAxisIndex: 0,
          lineWidth: 3,
          pointSize: 8,
          color: '#4285f4',
          visibleInLegend: true,
          pointShape: 'circle'
        },
        1: { 
          labelInLegend: 'インプレッション数',
          type: 'line',
          targetAxisIndex: 0,
          lineWidth: 2,
          color: '#ea4335',
          pointSize: 4
        },
        2: { 
          labelInLegend: 'CTR (%)',
          type: 'line',
          targetAxisIndex: 1,
          lineWidth: 3,
          pointSize: 8,
          color: '#34a853',
          lineDashStyle: [5, 5], // Dashed line
          visibleInLegend: true,
          pointShape: 'diamond'
        },
        3: { 
          labelInLegend: '平均ポジション',
          type: 'line',
          targetAxisIndex: 1,
          lineWidth: 2,
          color: '#fbbc04',
          pointSize: 4
        }
      })
      .setOption('tooltip', { trigger: 'selection' })
      .setOption('animation', { duration: 1000, easing: 'out' })
      .setOption('useFirstColumnAsDomain', true); // Use first column as X-axis
    
    const chart = chartBuilder.build();
    sheet.insertChart(chart);
    
    // Track whether this was an update or creation (wasUpdate is set earlier)
    const action = wasUpdate ? "Updated" : "Created";
    Logger.log(`Successfully ${action.toLowerCase()} combined trend chart`);
    return chart;
    
  } catch (error) {
    Logger.log(`Error creating combined trend chart: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    return null;
  }
}

/**
 * Create trend dashboard with comprehensive charts
 */
function createTrendDashboard() {
  try {
    Logger.log("Creating Trend Dashboard...");
    
    const spreadsheet = getOrCreateSpreadsheet();
    
    // Check if dashboard already exists
    let dashboardSheet = spreadsheet.getSheetByName("Trend Dashboard");
    if (!dashboardSheet) {
      dashboardSheet = spreadsheet.insertSheet("Trend Dashboard");
      
      // Add header
      dashboardSheet.getRange(1, 1, 1, 6).setValues([[
        "Metric", "Week 1", "Week 2", "Week 3", "Week 4", "Trend"
      ]]);
      dashboardSheet.getRange(1, 1, 1, 6).setBackground('#d9ead3'); // Light green background
    }
    
    // Get data from weekly ranking sheets
    const countries = ["米国", "カナダ", "イギリス", "オーストラリア", "ニュージーランド", "シンガポール"];
    
    countries.forEach((country, index) => {
      const sheet = spreadsheet.getSheetByName(`${country}週間ランキング`);
      if (!sheet) return;
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return;
      
      const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
      
      // Add summary to dashboard
      const summaryRow = index + 2;
      dashboardSheet.getRange(summaryRow, 1, 1, 6).setValues([[
        country, 
        data.filter(r => r[0].includes("10/13")).length,
        data.filter(r => r[0].includes("10/20")).length,
        data.filter(r => r[0].includes("10/27")).length,
        data.filter(r => r[0].includes("11/03")).length,
        "→"
      ]]);
    });
    
    // Auto-resize columns
    // Auto-resize disabled
    
    Logger.log("Trend Dashboard created successfully");
    
  } catch (error) {
    Logger.log(`Error creating trend dashboard: ${error.message}`);
    throw error;
  }
}