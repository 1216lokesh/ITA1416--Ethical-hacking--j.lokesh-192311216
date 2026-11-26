// Storage Service - handles all LocalStorage operations

const STORAGE_KEYS = {
  SCAN_HISTORY: 'netsecure_scan_history',
  SETTINGS: 'netsecure_settings',
  NOTIFICATIONS: 'netsecure_notifications',
};

export const storageService = {
  // Initialize storage
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
  },

  // Synchronize local cache with real backend scans
  syncWithBackend(backendScans) {
    if (!Array.isArray(backendScans)) return;
    // Prefer real scans; if real scans exist, purge unconfirmed placeholders
    const hasReal = backendScans.some(s => s.isRealScan);
    const cleaned = hasReal ? backendScans.filter(s => s.isRealScan) : backendScans;
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(cleaned));
    return cleaned;
  },

  // Scan History
  getScanHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      const list = data ? JSON.parse(data) : [];
      // If real scans exist in the list, filter out unconfirmed placeholder records
      if (list.some(s => s.isRealScan)) {
        return list.filter(s => s.isRealScan);
      }
      return list;
    } catch {
      return [];
    }
  },

  saveScan(scan) {
    const history = this.getScanHistory();
    const newHistory = [scan, ...history.filter(s => s.id !== scan.id)];
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(newHistory));
    return newHistory;
  },

  deleteScan(scanId) {
    const history = this.getScanHistory();
    const filtered = history.filter(s => s.id !== scanId);
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(filtered));
    return filtered;
  },

  clearScanHistory() {
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify([]));
  },

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
};

const defaultSettings = {
  profile: {
    name: 'Security Analyst',
    email: 'analyst@netsecure.local',
    role: 'Network Security Engineer',
    organization: 'NetSecure Lab',
  },
  notifications: {
    scanComplete: true,
    criticalFindings: true,
    weeklyReport: false,
    emailAlerts: false,
  },
  scanPreferences: {
    defaultScanType: 'Common Ports Scan',
    defaultPortRange: '1-1024',
    scanTimeout: 30,
    maxRetries: 3,
    saveHistory: true,
  },
  reportPreferences: {
    includeCharts: true,
    includeRecommendations: true,
    defaultFormat: 'PDF',
    companyName: 'NetSecure Security Lab',
  },
  appInfo: {
    version: '1.0.0',
    projectTitle: 'Network Port Scanning, Service Fingerprinting, and Risk Prioritization System',
    author: 'College Capstone Project',
  },
};

// Initialize on import
storageService.init();
