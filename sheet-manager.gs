/**
 * Spreadsheet Management Module
 * Handles all spreadsheet operations and data export
 */

/**
 * Sheet Manager Class
 * Manages spreadsheet creation, formatting, and data export
 */
class SheetManager {
  constructor(site) {
    this.site = site;
    this.spreadsheet = null;
    this.dataSheet = null;
    this.summarySheet = null;
    this.statusSheet = null;
  }
  
  /**
   * Export processed data to spreadsheet
   * @param {Array} data - Processed data to export
   */
  exportData(data) {
    Logger.log(`Exporting data to spreadsheet for ${this.site.name}...`);
    
    try {
      // Get or create spreadsheet
      this.spreadsheet = this.getOrCreateSpreadsheet();
      
      // Get or create sheets
      this.setupSheets();
      
      // Export main data
      this.exportMainData(data);
      
      // Update summary dashboard
      this.updateSummaryDashboard(data);
      
      // Update API status
      this.updateAPIStatus(data);
      
      // Apply formatting
      this.applyFormatting();
      
      Logger.log(`Data export succeeded for ${this.site.name}`);
      
    } catch (error) {
      Logger.log(`Spreadsheet export failed for ${this.site.name}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get existing spreadsheet or create new one
   * @return {Object} Google Spreadsheet object
   */
  getOrCreateSpreadsheet() {
    try {
      // Use the user's specific spreadsheet ID for all operations
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
   * Setup required sheets in the spreadsheet
   */
  setupSheets() {
    try {
      // Get or create main data sheet
      this.dataSheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[0].name,
        SPREADSHEET_TEMPLATE.sheets[0].columns
      );
      
      // Get or create summary sheet
      this.summarySheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[1].name,
        SPREADSHEET_TEMPLATE.sheets[1].columns
      );
      
      // Get or create status sheet
      this.statusSheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[2].name,
        SPREADSHEET_TEMPLATE.sheets[2].columns
      );
      
    } catch (error) {
      Logger.log(`Sheet setup failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get existing sheet or create new one
   * @param {string} sheetName - Name of the sheet
   * @param {Array} headers - Column headers
   * @return {Object} Google Sheet object
   */
  getOrCreateSheet(sheetName, headers) {
    try {
      let sheet = this.spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`Creating new sheet: ${sheetName}`);
        sheet = this.spreadsheet.insertSheet(sheetName);
        
        // Add headers
        if (headers && headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          
          // Format headers
          const headerRange = sheet.getRange(1, 1, 1, headers.length);
          headerRange.setBackground('#d9ead3'); // Light green background
          // No bold formatting for headers
        }
      }
      
      return sheet;
      
    } catch (error) {
      Logger.log(`Sheet creation/retrieval failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Export main data to the data sheet
   * @param {Array} data - Processed data
   */
  exportMainData(data) {
    try {
      if (!data || data.length === 0) {
        Logger.log("No data to export");
        return;
      }
      
      // Clear existing data (except headers)
      const lastRow = this.dataSheet.getLastRow();
      if (lastRow > 1) {
        this.dataSheet.getRange(2, 1, lastRow - 1, this.dataSheet.getLastColumn()).clear();
      }
      
      // Prepare data for export
      const exportData = data.map(row => [
        row.date,
        row.searchQuery,
        row.pageUrl,
        row.country,
        row.device,
        row.clicks,
        row.impressions,
        row.ctr,
        row.averagePosition
      ]);
      
      // Export data
      if (exportData.length > 0) {
        this.dataSheet.getRange(2, 1, exportData.length, exportData[0].length)
          .setValues(exportData);
        
        // Auto-resize columns after data is written
        // Auto-resize disabled
      }
      
      Logger.log(`Exported ${exportData.length} rows to main data sheet`);
      
    } catch (error) {
      Logger.log(`Main data export failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update summary dashboard
   * @param {Array} data - Processed data for summary calculations
   */
  updateSummaryDashboard(data) {
    try {
      // Clear existing data (except headers)
      const lastRow = this.summarySheet.getLastRow();
      if (lastRow > 1) {
        this.summarySheet.getRange(2, 1, lastRow - 1, this.summarySheet.getLastColumn()).clear();
      }
      
      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(data);
      
      // Prepare summary data
      const summaryData = [
        ["Total Clicks", summary.totalClicks, summary.previousClicks, summary.clicksChange, summary.clicksTrend, new Date()],
        ["Total Impressions", summary.totalImpressions, summary.previousImpressions, summary.impressionsChange, summary.impressionsTrend, new Date()],
        ["Average CTR", `${summary.averageCTR}%`, `${summary.previousCTR}%`, summary.ctrChange, summary.ctrTrend, new Date()],
        ["Average Position", summary.averagePosition, summary.previousPosition, summary.positionChange, summary.positionTrend, new Date()],
        ["Total Queries", summary.totalQueries, summary.previousQueries, summary.queriesChange, summary.queriesTrend, new Date()]
      ];
      
      // Export summary data
      this.summarySheet.getRange(2, 1, summaryData.length, summaryData[0].length)
        .setValues(summaryData);
      
      Logger.log("Summary dashboard updated");
      
    } catch (error) {
      Logger.log(`Summary dashboard update failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate summary metrics from data
   * @param {Array} data - Processed data
   * @return {Object} Summary metrics
   */
  calculateSummaryMetrics(data) {
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCTR = 0;
    let totalPosition = 0;
    let totalQueries = 0;
    
    // Filter out summary rows
    const validData = data.filter(row => row.searchQuery !== '--- SUMMARY ---');
    
    validData.forEach(row => {
      totalClicks += row.clicks;
      totalImpressions += row.impressions;
      totalCTR += row.ctr;
      totalPosition += row.averagePosition;
      totalQueries++;
    });
    
    const averageCTR = totalQueries > 0 ? totalCTR / totalQueries : 0;
    const averagePosition = totalQueries > 0 ? totalPosition / totalQueries : 0;
    
    return {
      totalClicks: totalClicks,
      totalImpressions: totalImpressions,
      averageCTR: Math.round(averageCTR * 100) / 100,
      averagePosition: Math.round(averagePosition * 100) / 100,
      totalQueries: totalQueries,
      // Placeholder for previous values (would need historical data)
      previousClicks: 0,
      previousImpressions: 0,
      previousCTR: 0,
      previousPosition: 0,
      previousQueries: 0,
      clicksChange: "0%",
      impressionsChange: "0%",
      ctrChange: "0%",
      positionChange: "0%",
      queriesChange: "0%",
      clicksTrend: "→",
      impressionsTrend: "→",
      ctrTrend: "→",
      positionTrend: "→",
      queriesTrend: "→"
    };
  }
  
  /**
   * Update API status sheet
   * @param {Array} data - Processed data
   */
  updateAPIStatus(data) {
    try {
      // Clear existing data (except headers)
      const lastRow = this.statusSheet.getLastRow();
      if (lastRow > 1) {
        this.statusSheet.getRange(2, 1, lastRow - 1, this.statusSheet.getLastColumn()).clear();
      }
      
      // Prepare status data
      const statusData = [[
        new Date(),
        "Success",
        data ? data.length : 0,
        0, // Errors
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Next run (24 hours from now)
        "100/10000" // API quota usage (placeholder)
      ]];
      
      // Export status data
      this.statusSheet.getRange(2, 1, statusData.length, statusData[0].length)
        .setValues(statusData);
      
      Logger.log("API status updated");
      
    } catch (error) {
      Logger.log(`API status update failed: ${error.message}`);
    }
  }
  
  /**
   * Apply formatting to all sheets
   */
  applyFormatting() {
    try {
      // Format main data sheet
      this.formatDataSheet();
      
      // Format summary sheet
      this.formatSummarySheet();
      
      // Format status sheet
      this.formatStatusSheet();
      
      Logger.log("Formatting applied to all sheets");
      
    } catch (error) {
      Logger.log(`Formatting application failed: ${error.message}`);
    }
  }
  
  /**
   * Format the main data sheet
   */
  formatDataSheet() {
    try {
      const sheet = this.dataSheet;
      
      // Auto-resize columns
      // Auto-resize disabled
      
      // Format CTR column as percentage
      const ctrColumn = 8; // CTR is column 8
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, ctrColumn, lastRow - 1, 1)
          .setNumberFormat("0.00%");
      }
      
      // Add conditional formatting for position
      const positionColumn = 9; // Position is column 9
      if (lastRow > 1) {
        const positionRange = sheet.getRange(2, positionColumn, lastRow - 1, 1);
        
        // Green for positions 1-3
        const greenRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(4)
          .setBackground('#d9ead3')
          .setRanges([positionRange])
          .build();
        
        // Yellow for positions 4-10
        const yellowRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 10)
          .setBackground('#fff2cc')
          .setRanges([positionRange])
          .build();
        
        // Red for positions 11+
        const redRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThan(10)
          .setBackground('#f4cccc')
          .setRanges([positionRange])
          .build();
        
        sheet.setConditionalFormatRules([greenRule, yellowRule, redRule]);
      }
      
    } catch (error) {
      Logger.log(`Data sheet formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Format the summary sheet
   */
  formatSummarySheet() {
    try {
      const sheet = this.summarySheet;
      
      // Auto-resize columns
      // Auto-resize disabled
      
      // Format percentage columns
      const ctrRow = 3; // CTR is row 3
      sheet.getRange(ctrRow, 2, 1, 2).setNumberFormat("0.00%");
      
    } catch (error) {
      Logger.log(`Summary sheet formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Format the status sheet
   */
  formatStatusSheet() {
    try {
      const sheet = this.statusSheet;
      
      // Auto-resize columns
      // Auto-resize disabled
      
      // Format date columns
      sheet.getRange(2, 1, 1, 1).setNumberFormat("yyyy/mm/dd hh:mm");
      sheet.getRange(2, 5, 1, 1).setNumberFormat("yyyy/mm/dd hh:mm");
      
    } catch (error) {
      Logger.log(`Status sheet formatting failed: ${error.message}`);
    }
  }
}

/**
 * All Sites Sheet Manager Class
 * Manages single spreadsheet with all sites data
 */
class AllSitesSheetManager {
  constructor() {
    this.spreadsheet = null;
    this.allSitesSheet = null;
    this.bespokeMainSheet = null;
    this.bespokeBlogSheet = null;
    // this.shirofuneSheet = null; // Removed - client hasn't added access yet
    this.summarySheet = null;
    this.statusSheet = null;
  }
  
  /**
   * Export all sites data to single spreadsheet
   * @param {Array} allSitesData - Combined data from all sites
   * @param {Array} siteSummaries - Summary data for each site
   */
  exportAllSitesData(allSitesData, siteSummaries) {
    Logger.log("Exporting all sites data to single spreadsheet...");
    
    try {
      // Get or create main spreadsheet
      this.spreadsheet = this.getOrCreateAllSitesSpreadsheet();
      
      // Setup all required sheets
      this.setupAllSitesSheets();
      
      // Export combined data
      this.exportCombinedData(allSitesData);
      
      // Export individual site data
      this.exportIndividualSiteData(siteSummaries);
      
      // Update summary dashboard
      this.updateAllSitesSummary(siteSummaries);
      
      // Update API status
      this.updateAllSitesStatus(siteSummaries);
      
      // Apply formatting
      this.applyAllSitesFormatting();
      
      Logger.log("Successfully exported all sites data");
      
    } catch (error) {
      Logger.log(`All sites data export failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get or create the main all-sites spreadsheet
   * @return {Object} Google Spreadsheet object
   */
  getOrCreateAllSitesSpreadsheet() {
    try {
      // Use your specific spreadsheet ID
      const spreadsheetId = "1oIyrC36E2WCLA9Sys4X3EB8SKKIPnVccxRbgkKpuv7o";
      
      try {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        Logger.log(`Found your existing spreadsheet: ${spreadsheet.getName()}`);
        Logger.log(`Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        return spreadsheet;
      } catch (error) {
        Logger.log(`Could not access your spreadsheet: ${error.message}`);
        throw error;
      }
      
    } catch (error) {
      Logger.log(`All-sites spreadsheet creation/retrieval failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Setup all required sheets in the spreadsheet
   */
  setupAllSitesSheets() {
    try {
      Logger.log("Setting up all required sheets...");
      
      // Check for existing country-specific weekly ranking sheets and preserve them
      const weeklySheetNames = [
        "米国週間ランキング", 
        "カナダ週間ランキング", 
        "イギリス週間ランキング", 
        "オーストラリア週間ランキング", 
        "ニュージーランド週間ランキング", 
        "シンガポール週間ランキング"
      ];
      const existingWeeklySheets = [];
      
      weeklySheetNames.forEach(sheetName => {
        const sheet = this.spreadsheet.getSheetByName(sheetName);
        if (sheet) {
          existingWeeklySheets.push(sheetName);
          Logger.log(`Preserving existing weekly sheet: ${sheetName}`);
        }
      });
      
      // Get or create all sites combined sheet
      this.allSitesSheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[0].name,
        SPREADSHEET_TEMPLATE.sheets[0].columns
      );
      Logger.log("全サイトデータ sheet ready");
      
      // Get or create Bespoke Discovery Blog sheet
      this.bespokeBlogSheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[2].name,
        SPREADSHEET_TEMPLATE.sheets[2].columns
      );
      Logger.log("Bespoke Discovery Blog sheet ready");
      
      // Main site temporarily disabled for testing
      // this.bespokeMainSheet = this.getOrCreateSheet(
      //   "Bespoke Discovery Main",
      //   SPREADSHEET_TEMPLATE.sheets[1].columns
      // );
      // Logger.log("Bespoke Discovery Main sheet ready");
      
      // Shirofune removed - client hasn't added access yet
      // this.shirofuneSheet = this.getOrCreateSheet(
      //   "Shirofune Main Site",
      //   SPREADSHEET_TEMPLATE.sheets[3].columns
      // );
      // Logger.log("Shirofune Main Site sheet ready");
      
      // Get or create summary sheet
      this.summarySheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[4].name,
        SPREADSHEET_TEMPLATE.sheets[4].columns
      );
      Logger.log("サマリーダッシュボード sheet ready");
      
      // Get or create status sheet
      this.statusSheet = this.getOrCreateSheet(
        SPREADSHEET_TEMPLATE.sheets[5].name,
        SPREADSHEET_TEMPLATE.sheets[5].columns
      );
      Logger.log("APIステータス sheet ready");
      
      // Verify all sheets exist
      this.verifyAllSheetsExist();
      
      // Log preserved weekly sheets
      if (existingWeeklySheets.length > 0) {
        Logger.log(`Preserved ${existingWeeklySheets.length} weekly ranking sheets: ${existingWeeklySheets.join(', ')}`);
      }
      
      Logger.log("All sheets setup completed successfully");
      
    } catch (error) {
      Logger.log(`All sites sheet setup failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verify all required sheets exist
   */
  verifyAllSheetsExist() {
    try {
      const requiredSheets = [
        "全サイトデータ",
        "Bespoke Discovery Blog",
                  "サマリーダッシュボード",
          "APIステータス"
        // "Bespoke Discovery Main", // Temporarily disabled for testing
        // "Shirofune Main Site", // Removed - client hasn't added access yet
      ];
      
      const existingSheets = this.spreadsheet.getSheets().map(sheet => sheet.getName());
      Logger.log(`Existing sheets: ${existingSheets.join(", ")}`);
      
      const missingSheets = requiredSheets.filter(sheetName => !existingSheets.includes(sheetName));
      
      if (missingSheets.length > 0) {
        Logger.log(`Missing sheets: ${missingSheets.join(", ")}`);
        Logger.log("Creating missing sheets...");
        
        missingSheets.forEach(sheetName => {
          let sheetIndex;
          if (sheetName === "全サイトデータ") sheetIndex = 0;
          else if (sheetName === "Bespoke Discovery Blog") sheetIndex = 2;
          else if (sheetName === "サマリーダッシュボード") sheetIndex = 4;
          else if (sheetName === "APIステータス") sheetIndex = 5;
          
          const columns = SPREADSHEET_TEMPLATE.sheets[sheetIndex].columns;
          this.getOrCreateSheet(sheetName, columns);
          Logger.log(`Created missing sheet: ${sheetName}`);
        });
      } else {
        Logger.log("All required sheets exist");
      }
      
    } catch (error) {
      Logger.log(`Sheet verification failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Export combined data from all sites
   * @param {Array} allSitesData - Combined data from all sites
   */
  exportCombinedData(allSitesData) {
    try {
      if (!allSitesData || allSitesData.length === 0) {
        Logger.log("No combined data to export");
        return;
      }
      
      Logger.log(`Preparing to export ${allSitesData.length} combined data rows`);
      
      // Clear existing data (except headers)
      const lastRow = this.allSitesSheet.getLastRow();
      if (lastRow > 1) {
        Logger.log(`Clearing existing data: ${lastRow - 1} rows`);
        this.allSitesSheet.getRange(2, 1, lastRow - 1, this.allSitesSheet.getLastColumn()).clear();
      }
      
      // Debug: Log the data being exported
      Logger.log(`All sites data length: ${allSitesData.length}`);
      if (allSitesData.length > 0) {
        Logger.log(`First all sites data row: ${JSON.stringify(allSitesData[0])}`);
      }
      
      // Prepare combined data for export
      const exportData = allSitesData.map(row => [
        row.site,
        row.date,
        row.searchQuery,
        row.pageUrl,
        row.country,
        row.device,
        row.clicks,
        row.impressions,
        row.ctr,
        row.averagePosition
      ]);
      
      Logger.log(`Prepared ${exportData.length} rows for export`);
      if (exportData.length > 0) {
        Logger.log(`First export row: ${JSON.stringify(exportData[0])}`);
      }
      
      // Export combined data
      if (exportData.length > 0) {
        Logger.log(`Writing data to range: 2,1,${exportData.length},${exportData[0].length}`);
        this.allSitesSheet.getRange(2, 1, exportData.length, exportData[0].length)
          .setValues(exportData);
        Logger.log(`Successfully wrote ${exportData.length} rows to 全サイトデータ sheet`);
        
        // Auto-resize columns after data is written
        // Auto-resize disabled
      }
      
      Logger.log(`Exported ${exportData.length} combined data rows`);
      
      // Process all sheets after all data is written
      this.processAllSheets();
      
    } catch (error) {
      Logger.log(`Combined data export failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Export individual site data to separate sheets
   * @param {Array} siteSummaries - Summary data for each site
   */
  exportIndividualSiteData(siteSummaries) {
    try {
      Logger.log(`Exporting individual site data for ${siteSummaries.length} sites`);
      
      siteSummaries.forEach(siteSummary => {
        const siteName = siteSummary.site;
        const data = siteSummary.data;
        
        Logger.log(`Processing ${siteName} with ${data.length} data rows`);
        
        let targetSheet;
        if (siteName.includes("Bespoke Discovery Blog")) {
          targetSheet = this.bespokeBlogSheet;
          Logger.log(`Target sheet: Bespoke Discovery Blog`);
        } else if (siteName.includes("Bespoke Discovery Main")) {
          // Main site temporarily disabled for testing
          Logger.log(`Main site skipped - temporarily disabled for testing`);
          return;
        } else if (siteName.includes("Shirofune")) {
          // Shirofune removed - client hasn't added access yet
          Logger.log(`Shirofune site skipped - no access yet`);
          return;
        } else {
          Logger.log(`Unknown site: ${siteName}`);
          return;
        }
        
        if (!targetSheet) {
          Logger.log(`Target sheet not found for ${siteName}`);
          return;
        }
        
        // Clear existing data (except headers)
        const lastRow = targetSheet.getLastRow();
        if (lastRow > 1) {
          Logger.log(`Clearing existing data: ${lastRow - 1} rows`);
          targetSheet.getRange(2, 1, lastRow - 1, targetSheet.getLastColumn()).clear();
        }
        
        // Prepare data for export (without site column for individual sheets)
        const exportData = data.map(row => [
          row.date,
          row.searchQuery,
          row.pageUrl,
          row.country,
          row.device,
          row.clicks,
          row.impressions,
          row.ctr,
          row.averagePosition
        ]);
        
        Logger.log(`Prepared ${exportData.length} rows for ${siteName}`);
        
        // Export data
        if (exportData.length > 0) {
          Logger.log(`Writing data to ${targetSheet.getName()}: ${exportData.length} rows`);
          targetSheet.getRange(2, 1, exportData.length, exportData[0].length)
            .setValues(exportData);
          Logger.log(`Successfully wrote data to ${targetSheet.getName()}`);
          
          // Auto-resize columns after data is written
          // Auto-resize disabled
        }
        
        Logger.log(`Exported ${exportData.length} rows for ${siteName}`);
      });
      
    } catch (error) {
      Logger.log(`Individual site data export failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update summary dashboard for all sites
   * @param {Array} siteSummaries - Summary data for each site
   */
  updateAllSitesSummary(siteSummaries) {
    try {
      // Clear existing data (except headers)
      const lastRow = this.summarySheet.getLastRow();
      if (lastRow > 1) {
        this.summarySheet.getRange(2, 1, lastRow - 1, this.summarySheet.getLastColumn()).clear();
      }
      
      // Prepare summary data for all sites
      const summaryData = [];
      
      siteSummaries.forEach(siteSummary => {
        const siteName = siteSummary.site;
        const data = siteSummary.data;
        
        // Calculate summary metrics
        const summary = this.calculateSiteSummary(data);
        
        // Add site-specific summary rows
        summaryData.push([
          siteName,
          "Total Clicks",
          summary.totalClicks,
          0, // Previous value placeholder
          "0%", // Change placeholder
          "→", // Trend placeholder
          new Date()
        ]);
        
        summaryData.push([
          siteName,
          "Total Impressions",
          summary.totalImpressions,
          0,
          "0%",
          "→",
          new Date()
        ]);
        
        summaryData.push([
          siteName,
          "Average CTR",
          `${summary.averageCTR}%`,
          "0%",
          "0%",
          "→",
          new Date()
        ]);
        
        summaryData.push([
          siteName,
          "Average Position",
          summary.averagePosition,
          0,
          "0%",
          "→",
          new Date()
        ]);
      });
      
      // Export summary data
      if (summaryData.length > 0) {
        this.summarySheet.getRange(2, 1, summaryData.length, summaryData[0].length)
          .setValues(summaryData);
      }
      
      Logger.log("All sites summary dashboard updated");
      
    } catch (error) {
      Logger.log(`All sites summary update failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate summary metrics for a site
   * @param {Array} data - Site data
   * @return {Object} Summary metrics
   */
  calculateSiteSummary(data) {
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCTR = 0;
    let totalPosition = 0;
    let validRows = 0;
    
    data.forEach(row => {
      if (row.searchQuery !== '--- SUMMARY ---') {
        totalClicks += row.clicks;
        totalImpressions += row.impressions;
        totalCTR += row.ctr;
        totalPosition += row.averagePosition;
        validRows++;
      }
    });
    
    return {
      totalClicks: totalClicks,
      totalImpressions: totalImpressions,
      averageCTR: validRows > 0 ? Math.round((totalCTR / validRows) * 100) / 100 : 0,
      averagePosition: validRows > 0 ? Math.round((totalPosition / validRows) * 100) / 100 : 0
    };
  }
  
  /**
   * Update API status for all sites
   * @param {Array} siteSummaries - Summary data for each site
   */
  updateAllSitesStatus(siteSummaries) {
    try {
      // Clear existing data (except headers)
      const lastRow = this.statusSheet.getLastRow();
      if (lastRow > 1) {
        this.statusSheet.getRange(2, 1, lastRow - 1, this.statusSheet.getLastColumn()).clear();
      }
      
      // Prepare status data for all sites
      const statusData = siteSummaries.map(siteSummary => [
        siteSummary.site,
        new Date(),
        "Success",
        siteSummary.data ? siteSummary.data.length : 0,
        0, // Errors
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Next run
        "100/10000" // API quota usage placeholder
      ]);
      
      // Export status data
      if (statusData.length > 0) {
        this.statusSheet.getRange(2, 1, statusData.length, statusData[0].length)
          .setValues(statusData);
      }
      
      Logger.log("All sites API status updated");
      
    } catch (error) {
      Logger.log(`All sites status update failed: ${error.message}`);
    }
  }
  
  /**
   * Apply formatting to all sheets
   */
  applyAllSitesFormatting() {
    try {
      // Format all sites sheet
      this.formatAllSitesSheet();
      
      // Format individual site sheets
      this.formatIndividualSiteSheets();
      
      // Format summary and status sheets
      this.formatSummaryAndStatusSheets();
      
      Logger.log("All sites formatting applied");
      
    } catch (error) {
      Logger.log(`All sites formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Format the all sites combined sheet
   */
  formatAllSitesSheet() {
    try {
      const sheet = this.allSitesSheet;
      
      // Auto-resize columns
      // Auto-resize disabled
      
      // Format CTR column as percentage
      const ctrColumn = 9; // CTR is column 9
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, ctrColumn, lastRow - 1, 1)
          .setNumberFormat("0.00%");
      }
      
      // Add conditional formatting for multiple columns
      if (lastRow > 1) {
        const rules = [];
        
        // Position column (10) - Green for 1-3, Yellow for 4-15, Red for 15+
        const positionColumn = 10;
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
        
        // Clicks column (7) - Green for 15+, Yellow for 4-15, Red for <4
        const clicksColumn = 7;
        const clicksRange = sheet.getRange(2, clicksColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(15)
          .setBackground('#d9ead3') // Light green for high clicks
          .setRanges([clicksRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 14)
          .setBackground('#fff2cc') // Light yellow for medium clicks
          .setRanges([clicksRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(4)
          .setBackground('#f4cccc') // Light red for low clicks
          .setRanges([clicksRange])
          .build());
        
        // Impressions column (8) - Green for 15+, Yellow for 4-15, Red for <4
        const impressionsColumn = 8;
        const impressionsRange = sheet.getRange(2, impressionsColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(15)
          .setBackground('#d9ead3') // Light green for high impressions
          .setRanges([impressionsRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(4, 14)
          .setBackground('#fff2cc') // Light yellow for medium impressions
          .setRanges([impressionsRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(4)
          .setBackground('#f4cccc') // Light red for low impressions
          .setRanges([impressionsRange])
          .build());
        
        // CTR column (9) - Green for 10%+, Yellow for 4-10%, Red for <4%
        const ctrColumn = 9;
        const ctrRange = sheet.getRange(2, ctrColumn, lastRow - 1, 1);
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberGreaterThanOrEqualTo(0.10) // 10% CTR
          .setBackground('#d9ead3') // Light green for high CTR
          .setRanges([ctrRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(0.04, 0.099) // 4-10% CTR
          .setBackground('#fff2cc') // Light yellow for medium CTR
          .setRanges([ctrRange])
          .build());
        
        rules.push(SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(0.04) // Less than 4% CTR
          .setBackground('#f4cccc') // Light red for low CTR
          .setRanges([ctrRange])
          .build());
        
        // Apply all rules
        sheet.setConditionalFormatRules(rules);
      }
      
    } catch (error) {
      Logger.log(`All sites sheet formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Format individual site sheets
   */
  formatIndividualSiteSheets() {
    try {
      [this.bespokeMainSheet, this.bespokeBlogSheet].forEach(sheet => {
        if (sheet) {
          // Auto-resize columns
          // Auto-resize disabled
          
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            // Format CTR column as percentage
            const ctrColumn = 8; // CTR is column 8
            sheet.getRange(2, ctrColumn, lastRow - 1, 1)
              .setNumberFormat("0.00%");
            
            // Add conditional formatting for individual site sheets
            const rules = [];
            
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
              .setBackground('#d9ead3') // Light green for high clicks
              .setRanges([clicksRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberBetween(4, 14)
              .setBackground('#fff2cc') // Light yellow for medium clicks
              .setRanges([clicksRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberLessThan(4)
              .setBackground('#f4cccc') // Light red for low clicks
              .setRanges([clicksRange])
              .build());
            
            // Impressions column (7) - Green for 15+, Yellow for 4-15, Red for <4
            const impressionsColumn = 7;
            const impressionsRange = sheet.getRange(2, impressionsColumn, lastRow - 1, 1);
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberGreaterThanOrEqualTo(15)
              .setBackground('#d9ead3') // Light green for high impressions
              .setRanges([impressionsRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberBetween(4, 14)
              .setBackground('#fff2cc') // Light yellow for medium impressions
              .setRanges([impressionsRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberLessThan(4)
              .setBackground('#f4cccc') // Light red for low impressions
              .setRanges([impressionsRange])
              .build());
            
            // CTR column (8) - Green for 10%+, Yellow for 4-10%, Red for <4%
            const ctrRange = sheet.getRange(2, ctrColumn, lastRow - 1, 1);
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberGreaterThanOrEqualTo(0.10) // 10% CTR
              .setBackground('#d9ead3') // Light green for high CTR
              .setRanges([ctrRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberBetween(0.04, 0.099) // 4-10% CTR
              .setBackground('#fff2cc') // Light yellow for medium CTR
              .setRanges([ctrRange])
              .build());
            
            rules.push(SpreadsheetApp.newConditionalFormatRule()
              .whenNumberLessThan(0.04) // Less than 4% CTR
              .setBackground('#f4cccc') // Light red for low CTR
              .setRanges([ctrRange])
              .build());
            
            // Apply all rules
            sheet.setConditionalFormatRules(rules);
          }
        }
      });
      
    } catch (error) {
      Logger.log(`Individual site sheets formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Format summary and status sheets
   */
  formatSummaryAndStatusSheets() {
    try {
      [this.summarySheet, this.statusSheet].forEach(sheet => {
        if (sheet) {
          // Auto-resize columns
          // Auto-resize disabled
          
          // Format date columns
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            // Format date columns (adjust column numbers as needed)
            sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat("yyyy/mm/dd hh:mm");
          }
        }
      });
      
    } catch (error) {
      Logger.log(`Summary and status sheets formatting failed: ${error.message}`);
    }
  }
  
  /**
   * Process all sheets in the spreadsheet (auto-resize disabled)
   * Call this after all data has been written
   */
  processAllSheets() {
    try {
      Logger.log("Processing all sheets (auto-resize disabled)...");
      
      const sheets = this.spreadsheet.getSheets();
      sheets.forEach(sheet => {
        try {
          const lastColumn = sheet.getLastColumn();
          if (lastColumn > 0) {
            // Auto-resize disabled
            Logger.log(`Skipped auto-resize for ${sheet.getName()}: ${lastColumn} columns`);
          }
        } catch (sheetError) {
          Logger.log(`Error processing ${sheet.getName()}: ${sheetError.message}`);
        }
      });
      
      Logger.log("All sheets processed successfully (auto-resize disabled)");
      
    } catch (error) {
      Logger.log(`Process all sheets failed: ${error.message}`);
    }
  }
  
  /**
   * Get or create sheet helper function
   * @param {string} sheetName - Name of the sheet
   * @param {Array} headers - Column headers
   * @return {Object} Google Sheet object
   */
  getOrCreateSheet(sheetName, headers) {
    try {
      let sheet = this.spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        Logger.log(`Creating new sheet: ${sheetName}`);
        sheet = this.spreadsheet.insertSheet(sheetName);
        
        // Add headers
        if (headers && headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          
          // Format headers
          const headerRange = sheet.getRange(1, 1, 1, headers.length);
          headerRange.setBackground('#d9ead3'); // Light green background
          // No bold formatting for headers
        }
      }
      
      return sheet;
      
    } catch (error) {
      Logger.log(`Sheet creation/retrieval failed: ${error.message}`);
      throw error;
    }
  }
}


/**
 * Check current spreadsheet and sheets
 */
function checkCurrentSpreadsheet() {
  Logger.log("Checking current spreadsheet...");
  
  try {
    // Find the all-sites spreadsheet
    const fileName = "GSC Search Performance Report - All Sites";
    const files = DriveApp.getFilesByName(fileName);
    
    if (files.hasNext()) {
      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());
      
      Logger.log(`Found spreadsheet: ${spreadsheet.getName()}`);
      Logger.log(`Spreadsheet ID: ${spreadsheet.getId()}`);
      
      // List all sheets
      const sheets = spreadsheet.getSheets();
      Logger.log(`Total sheets: ${sheets.length}`);
      
      sheets.forEach((sheet, index) => {
        Logger.log(`Sheet ${index + 1}: ${sheet.getName()} (${sheet.getLastRow()} rows, ${sheet.getLastColumn()} columns)`);
      });
      
      return spreadsheet;
    } else {
      Logger.log("No all-sites spreadsheet found");
      return null;
    }
    
  } catch (error) {
    Logger.log(`Spreadsheet check failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check your specific spreadsheet by ID
 */
function checkYourSpreadsheet() {
  Logger.log("Checking your specific spreadsheet...");
  
  try {
    const spreadsheetId = "1oIyrC36E2WCLA9Sys4X3EB8SKKIPnVccxRbgkKpuv7o";
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    Logger.log(`Found your spreadsheet: ${spreadsheet.getName()}`);
    Logger.log(`Spreadsheet ID: ${spreadsheet.getId()}`);
    Logger.log(`Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    
    // List all sheets
    const sheets = spreadsheet.getSheets();
    Logger.log(`Total sheets: ${sheets.length}`);
    
    sheets.forEach((sheet, index) => {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      Logger.log(`Sheet ${index + 1}: "${sheet.getName()}" (${lastRow} rows, ${lastCol} columns)`);
      
      // Show first few rows of data if any
      if (lastRow > 1) {
        Logger.log(`  Data preview (first 3 rows):`);
        for (let row = 1; row <= Math.min(3, lastRow); row++) {
          const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
          Logger.log(`    Row ${row}: ${rowData.slice(0, 5).join(" | ")}${lastCol > 5 ? "..." : ""}`);
        }
      } else {
        Logger.log(`  No data in this sheet`);
      }
    });
    
    return spreadsheet;
    
  } catch (error) {
    Logger.log(`Your spreadsheet check failed: ${error.message}`);
    throw error;
  }
}
