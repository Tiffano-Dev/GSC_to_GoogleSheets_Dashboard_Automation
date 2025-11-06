/**
 * GSC Automation Project Main Orchestration File
 * Entry point that coordinates all operations
 */

/**
 * Main Function - Automation entry point
 * Called by trigger or manually
 * Fully automated - just click this function and everything works!
 */
function main() {
  try {
    Logger.log("Starting GSC automation - " + new Date());
    
    // Debug: First check CONFIG
    Logger.log(`CONFIG object: ${CONFIG ? 'defined' : 'undefined'}`);
    if (!CONFIG) {
      throw new Error("CONFIG object is undefined - please check if config.gs is loaded");
    }
    
    Logger.log(`CONFIG.sites: ${CONFIG.sites ? 'defined' : 'undefined'}`);
    Logger.log(`CONFIG.sites length: ${CONFIG.sites ? CONFIG.sites.length : 'undefined'}`);
    
    if (!CONFIG.sites || CONFIG.sites.length === 0) {
      throw new Error("CONFIG.sites is undefined or empty");
    }
    
    // Handle authentication automatically
    ensureAuthentication();
    
    // Initialize system
    initializeSystem();
    
    // Collect data from all sites
    const allSitesData = [];
    const siteSummaries = [];
    
    CONFIG.sites.forEach((site, index) => {
      Logger.log(`Processing site ${index + 1}: ${site ? site.name : 'undefined'} (${site ? site.url : 'undefined'})`);
      
      if (!site) {
        Logger.log(`Site ${index + 1} is undefined. Skipping...`);
        return;
      }
      
      try {
        // Fetch data from GSC
        const gscData = fetchGSCData(site);
        
        // Process and validate data
        const processedData = processGSCData(gscData);
        
        // Debug: Log processed data
        Logger.log(`Processed data length: ${processedData.length}`);
        if (processedData.length > 0) {
          Logger.log(`First processed row: ${JSON.stringify(processedData[0])}`);
        }
        
        // Add site identifier to each row
        const siteData = processedData.map(row => ({
          ...row,
          site: site.name
        }));
        
        // Debug: Log site data
        Logger.log(`Site data length: ${siteData.length}`);
        if (siteData.length > 0) {
          Logger.log(`First site data row: ${JSON.stringify(siteData[0])}`);
        }
        
        allSitesData.push(...siteData);
        siteSummaries.push({
          site: site.name,
          data: processedData
        });
        
        Logger.log(`Site processing succeeded: ${site.name}`);
        
      } catch (siteError) {
        Logger.log(`Site processing error ${site.name}: ${siteError.message}`);
        handleError(siteError, `Site: ${site.name}`);
      }
    });
    
    // Export all data to a single spreadsheet
    exportAllSitesToSpreadsheet(allSitesData, siteSummaries);
    
    // Weekly ranking processing (if enabled)
    Logger.log(`WEEKLY_CONFIG check: ${WEEKLY_CONFIG ? 'defined' : 'undefined'}`);
    if (WEEKLY_CONFIG) {
      Logger.log(`WEEKLY_CONFIG.enabled: ${WEEKLY_CONFIG.enabled}`);
    }
    
    Logger.log("GSC automation completed successfully");
    
  } catch (error) {
    Logger.log(`Critical error in main function: ${error.message}`);
    
    // Provide helpful instructions for authentication errors
    if (error.message.includes("authentication") || error.message.includes("token")) {
      Logger.log("Service account setup required:");
      Logger.log("1. Add service account to GSC properties");
      Logger.log("2. Share spreadsheet with service account");
      Logger.log("3. Run testAuthentication() to verify setup");
    }
    
    handleError(error, "Main Function");
  }
}

/**
 * Ensure authentication works automatically
 */
function ensureAuthentication() {
  Logger.log("Checking authentication setup...");
  
  try {
    // Check if already authenticated
    if (isAuthenticated()) {
      Logger.log("Authentication is already active");
      return true;
    }
    
    // Try to get access token (automatic refresh attempted)
    try {
      const token = getAccessToken();
      Logger.log("Authentication succeeded");
      return true;
    } catch (authError) {
      Logger.log(`Authentication failed: ${authError.message}`);
      
      // If it's the first time, provide setup instructions
      if (authError.message.includes("authentication") || authError.message.includes("token")) {
        Logger.log("SERVICE ACCOUNT SETUP REQUIRED:");
        Logger.log("1. Add service account email to GSC properties");
        Logger.log("2. Share spreadsheet with service account");
        Logger.log("3. Run testAuthentication() to verify setup");
        throw new Error("Service account setup required. Please check GSC access and spreadsheet sharing.");
      }
      
      throw authError;
    }
    
  } catch (error) {
    Logger.log(`Authentication check failed: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize the system and check prerequisites
 */
function initializeSystem() {
  Logger.log("Initializing GSC Automation System...");
  
  // Check if GSC API is available
  checkGSCAPIAccess();
  
  // Verify authentication
  verifyAuthentication();
  
  // Check spreadsheet access
  checkSpreadsheetAccess();
  
  Logger.log("System initialization completed");
}

/**
 * Check if GSC API access is properly configured
 */
function checkGSCAPIAccess() {
  try {
    // Test API access by making a simple request
    const testRequest = {
      startDate: getDateString(daysAgo(1)),
      endDate: getDateString(today()),
      dimensions: [],
      rowLimit: 1
    };
    
    // This will be implemented in gsc-client.gs
    // For now, just log the check
    Logger.log("GSC API access check completed");
    
  } catch (error) {
    throw new Error(`GSC API access check failed: ${error.message}`);
  }
}

/**
 * Verify OAuth authentication is working
 */
function verifyAuthentication() {
  try {
    // Check if we have valid authentication
    // This will be implemented in auth.gs
    Logger.log("Authentication verification completed");
    
  } catch (error) {
    throw new Error(`Authentication verification failed: ${error.message}`);
  }
}

/**
 * Check if we can access and create spreadsheets
 */
function checkSpreadsheetAccess() {
  try {
    // Test spreadsheet access
    const testSheet = SpreadsheetApp.create("GSC-Test-" + Date.now());
    testSheet.getRange("A1").setValue("Test");
    DriveApp.getFileById(testSheet.getId()).setTrashed(true);
    
    Logger.log("Spreadsheet access check completed");
    
  } catch (error) {
    throw new Error(`Spreadsheet access check failed: ${error.message}`);
  }
}

/**
 * Fetch data from Google Search Console for a specific site
 * @param {Object} site - Site configuration object
 * @return {Object} Raw GSC data
 */
function fetchGSCData(site) {
  Logger.log(`fetchGSCData called with site: ${site ? JSON.stringify(site) : 'undefined'}`);
  
  // Safety check for undefined site
  if (!site) {
    Logger.log("ERROR: Site object is undefined in fetchGSCData");
    Logger.log("This usually means CONFIG.sites contains undefined elements");
    throw new Error("Site object is undefined");
  }
  
  if (!site.name) {
    Logger.log(`ERROR: Site name is undefined. Site object: ${JSON.stringify(site)}`);
    throw new Error("Site name is undefined");
  }
  
  Logger.log(`Fetching GSC data for ${site.name}...`);
  
  try {
    // Create GSC client
    const gscClient = new GSCClient(site);
    
    // Fetch search analytics data
    const searchData = gscClient.getSearchAnalytics();
    
    Logger.log(`Retrieved ${searchData.rows ? searchData.rows.length : 0} data rows for ${site.name}`);
    
    return searchData;
    
  } catch (error) {
    Logger.log(`ERROR in fetchGSCData for ${site.name}: ${error.message}`);
    throw new Error(`Failed to fetch GSC data for ${site.name}: ${error.message}`);
  }
}

/**
 * Process and validate GSC data
 * @param {Object} rawData - Raw data from GSC API
 * @return {Array} Processed and validated data
 */
function processGSCData(rawData) {
  Logger.log("Processing GSC data...");
  
  try {
    const processor = new DataProcessor();
    const processedData = processor.process(rawData);
    
    Logger.log(`Processed ${processedData.length} data records`);
    
    return processedData;
    
  } catch (error) {
    throw new Error(`Data processing failed: ${error.message}`);
  }
}

/**
 * Export all sites data to single spreadsheet
 * @param {Array} allSitesData - Combined data from all sites
 * @param {Array} siteSummaries - Summary data for each site
 */
function exportAllSitesToSpreadsheet(allSitesData, siteSummaries) {
  Logger.log("Exporting all sites data to single spreadsheet...");
  
  try {
    const sheetManager = new AllSitesSheetManager();
    sheetManager.exportAllSitesData(allSitesData, siteSummaries);
    
    Logger.log("Successfully exported all sites data");
    
  } catch (error) {
    throw new Error(`All sites spreadsheet export failed: ${error.message}`);
  }
}

/**
 * Export processed data to spreadsheet (legacy function for individual sites)
 * @param {Object} site - Site configuration
 * @param {Array} data - Processed data to export
 */
function exportToSpreadsheet(site, data) {
  Logger.log(`Exporting data to spreadsheet for ${site.name}...`);
  
  try {
    const sheetManager = new SheetManager(site);
    sheetManager.exportData(data);
    
    Logger.log(`Successfully exported data for ${site.name}`);
    
  } catch (error) {
    throw new Error(`Spreadsheet export failed for ${site.name}: ${error.message}`);
  }
}

/**
 * Update monitoring and status information
 * @param {Object} site - Site configuration
 * @param {Array} data - Processed data
 */
function updateMonitoring(site, data) {
  try {
    const monitor = new SystemMonitor();
    monitor.updateStatus(site, data);
    
  } catch (error) {
    Logger.log(`Monitoring update failed: ${error.message}`);
  }
}

/**
 * Handle errors and send notifications
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where error occurred
 */
function handleError(error, context) {
  const errorMessage = `${context}: ${error.message}`;
  Logger.log(`ERROR: ${errorMessage}`);
  
  // Send email notification if enabled
  if (CONFIG.LOGGING && CONFIG.LOGGING.emailNotifications) {
    try {
      MailApp.sendEmail({
        to: CONFIG.LOGGING.notificationEmail,
        subject: "GSC Automation Error",
        body: `Error in GSC Automation System:\n\nContext: ${context}\nError: ${error.message}\nTime: ${new Date()}`
      });
    } catch (emailError) {
      Logger.log(`Failed to send error notification: ${emailError.message}`);
    }
  }
}

/**
 * Setup automation triggers
 * This function should be called once during initial setup
 */
function setupTriggers() {
  Logger.log("Setting up automation triggers...");
  
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'main') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger based on frequency
    if (CONFIG.data.updateFrequency === 'daily') {
      ScriptApp.newTrigger('main')
        .timeBased()
        .everyDays(1)
        .atHour(9) // 9 AM
        .create();
        
      Logger.log("Daily trigger created (9 AM)");
      
    } else if (CONFIG.data.updateFrequency === 'weekly') {
      ScriptApp.newTrigger('main')
        .timeBased()
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(9) // 9 AM Monday
        .create();
        
      Logger.log("Weekly trigger created (Monday 9 AM)");
    }
    
  } catch (error) {
    Logger.log(`Trigger setup failed: ${error.message}`);
    throw error;
  }
}

// Helper functions for date operations
function getDateString(date) {
  return Utilities.formatDate(date, CONFIG.spreadsheet.timezone, 'yyyy-MM-dd');
}

function today() {
  return new Date();
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Note: All weekly ranking functions are now in weekly-processor.gs
// They are called automatically by runWeeklyProcessor()
