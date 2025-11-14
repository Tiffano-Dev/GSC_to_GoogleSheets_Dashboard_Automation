# Google Search Console (GSC) Automation Project

An automated Google Search Console data collection and analysis system. Collects search performance data from multiple sites, exports it to Google Spreadsheets, and generates weekly rankings and trend analysis.
https://docs.google.com/spreadsheets/d/1oIyrC36E2WCLA9Sys4X3EB8SKKIPnVccxRbgkKpuv7o/edit?gid=223113399#gid=223113399

## Table of Contents

- [Overview](#Overview)
- [Architecture](#Architecture)
- [Setup](#Setup)
- [Settings](#Settings)
- [Usage](#Usage)
- [Troubleshooting](#Troubleshooting)

## Overview

This project uses Google Apps Script to automatically retrieve and analyze search performance data from the Google Search Console API. It supports multiple websites, countries, and device types, and is fully automated, from daily data collection to weekly ranking generation.

### Main Features

- ✅ **Multi-Site Support**: Monitor multiple websites simultaneously.
- ✅ **Multi-Language and Multi-Device Support**: 6 countries (US, Canada, UK, Australia, New Zealand, Singapore) and 3 device types (PC, smartphone, tablet).
- ✅ **Automatic Data Collection**: Automatically obtain data daily or weekly.
- ✅ **Weekly Ranking**: Aggregate weekly data and calculate rankings.
- ✅ **Trend Analysis**: Track weekly performance changes.
- ✅ **Automatic Chart Generation**: Automatically generate weekly trend charts.
- ✅ **Japanese Support**: All logs, error messages, and sheet names are in Japanese.

## Main Features

### 1. Daily Data Collection
- Obtain search performance data from the Google Search Console API.
- Collect clicks, impressions, CTR, and average position.
- Categorize data by search query, page URL, country, and device.

### 2. Weekly Ranking Generation
- Aggregate daily data into weekly data.
- Calculate weekly rankings by country and device
- Calculate comparisons with the previous week (rate of change, trend direction)

### 3. Trend Analysis
- Track weekly performance changes
- Display trend indicators (↑, ↓, →, NEW)
- Visualize changes in clicks, impressions, CTR, and position

### 4. Automatic Chart Generation
- Automatically generate weekly performance trend charts
- Display multiple metrics on a single chart
- Automatically arrange them on a dashboard sheet

## Architecture

```
┌─────────────────┐
│ main.gs │ ← Entry point
└────────┬────────┘
│
┌────┴────┐
│ │
┌───▼───┐ ┌──▼────────┐
│ auth │ │ gsc-client│ ← Authentication and API Calls
└───────┘ └───────────┘
│ │
└────┬────┘
│
┌────────▼──────────┐
│ data-processor │ ← Data Processing
└────────┬──────────┘
│
┌────┴────┐
│ │
┌───▼───┐ ┌──▼──────────────┐
│ sheet │ │ weekly-processor │ ← Spreadsheet Management and Weekly Processing
└─────────┘ └──────────────────┘
```

### Main Components

- **main.gs**: Main Orchestration File
- **auth.gs**: Service Account Authentication Processing
- **gsc-client.gs**: Google Search Console API client
- **data-processor.gs**: Data processing and validation
- **sheet-manager.gs**: Spreadsheet operations
- **weekly-processor.gs**: Weekly data aggregation and ranking calculation
- **config.gs**: Project settings
- **utils.gs**: Utility functions

## Setup

### Prerequisites

1. Google Account
2. Google Apps Script Project
3. Google Cloud Platform (GCP) Project
4. Creating and Configuring a Service Account
5. Permissions for Google Search Console Properties

### Setup Instructions

#### 1. Create a Service Account on Google Cloud Platform

1. Access the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing project)
3. Navigate to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Enter a service account name (e.g., `gsc-automation-service`)
6. Click "Create and Continue"
7. Assign roles (not necessary at this point)
8. Click "Done"

#### 2. Generate a service account key

1. Click the service account you created
2. Go to the "Keys" tab
3. Select "Add Key" → "Create new key"
4. Select "JSON" as the key type
5. Click "Create" (a JSON file will be downloaded)

#### 3. Configure the service account information

1. Open the downloaded JSON file
2. Copy the information into the `SERVICE_ACCOUNT_CONFIG` field in the `auth.gs` file:

```javascript
const SERVICE_ACCOUNT_CONFIG = {
type: "service_account",
project_id: "your-project-id",
private_key_id: "your-private-key-id",
private_key: "-----BEGIN PRIVATE KEY-----\n...",
client_email: "your-service-account@project.iam.gserviceaccount.com",
// ... Other Settings
};
```

#### 4. Enable the Google Search Console API

1. In the GCP console, go to "APIs & Services" → "Library"
2. Search for "Google Search Console API"
3. Click "Enable"

#### 5. Grant the service account access to your GSC properties

1. Access [Google Search Console](https://search.google.com/search-console)
2. Select each property (site)
3. Go to "Settings" → "Users and Permissions"
4. Click "Add User"
5. Enter the service account's email address (`client_email`)
6. Grant "Owner" or "Full" permissions

#### 6. Share the service account to a spreadsheet

1. Open the Google spreadsheet you want to use
2. Click the "Share" button
3. Add the service account's email address
4. Grant "Editor" permissions

#### 7. Set the Spreadsheet ID

Set the spreadsheet ID in the `sheet-manager.gs` file:

```javascript
const SPREADSHEET_ID = "your-spreadsheet-id";
```

You can get the spreadsheet ID from the spreadsheet's URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

#### 8. Update Site Settings

Configure the sites to monitor in the `config.gs` file:

```javascript
const CONFIG = {
sites: [
{
name: "Your Site Name",
url: "https://your-site.com",
property: "https://your-site.com/", // or "sc-domain:your-site.com"
owner: "Client",
description: "Site Description"
}
],
// ... Other settings
};
```

#### 9. First Run and Test

1. Run the `main()` function in the Google Apps Script Editor
2. Check the execution log for errors
3. Verify that the data was exported correctly to the spreadsheet

## 🔧 Settings

### Main Settings in config.gs

#### Data Settings

```javascript
data: {
dateRange: 20, // Number of days to retrieve data
updateFrequency: "daily", // "daily" or "weekly"
countries: ["usa", "can", "gbr", "aus", "nzl", "sgp"],
devices: ["desktop", "mobile", "tablet"],
rowLimit: 1500 // Maximum number of rows per API call
}
```

#### Weekly Ranking Settings

```javascript
const WEEKLY_CONFIG = {
enabled: true, // Enable weekly ranking
aggregationMethod: "sum", // "sum", "average", "max"
rankingMetrics: ["clicks", "impressions", "ctr", "position"],
topRankings: 50, // Number of top rankings to display
weekStartDay: 1, // 1 = Monday, 0 = Sunday
enableTrends: true, // Enable trend analysis

