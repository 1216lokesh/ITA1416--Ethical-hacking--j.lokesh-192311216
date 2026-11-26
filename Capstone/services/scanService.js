// Scan Service - connects to real FastAPI backend, no automatic fallback
import { storageService } from './storageService';

const CANDIDATE_BACKEND_URLS = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
];
let activeBackendUrl = 'http://127.0.0.1:8000';

let scanCounter = 100;

// ─── Backend Service ─────────────────────────────────────────────────────────
export const backendService = {
  getBaseUrl() {
    return activeBackendUrl;
  },

  async checkHealth() {
    for (const url of CANDIDATE_BACKEND_URLS) {
      try {
        const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const data = await res.json();
          activeBackendUrl = url;
          return { available: true, ...data, baseUrl: url };
        }
      } catch (e) {
        // try next candidate URL
      }
    }
    return {
      available: false,
      nmapAvailable: false,
      error: 'Cannot connect to NetSecure backend at 127.0.0.1:8000 or localhost:8000',
    };
  },

  async startScan(config) {
    let portRange = config.portRange;
    if (config.scanType === 'Custom Port Scan') {
      portRange = config.customPorts || config.portRange;
    } else {
      portRange = config.portRange || '21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5432,5900,6379,8080,8443,27017';
    }

    const res = await fetch(`${this.getBaseUrl()}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: (config.target || '').trim(),
        hostname: config.hostname?.trim() || null,
        scan_type: config.scanType,
        port_range: portRange,
        custom_ports: config.customPorts || null,
        authorized: Boolean(config.authorized),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || `Backend returned HTTP ${res.status}`);
    }
    return res.json();
  },

  async pollScan(scanId, onStatus, timeoutMs = 360000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/scans/${scanId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const st = (data.status || '').toLowerCase();
        if (st === 'running' || st === 'pending') {
          onStatus('Scan in progress — executing Nmap TCP connect & service probe...');
          continue;
        }
        if (st === 'failed') {
          throw new Error(data.errorMessage || data.error_message || `Scan ${scanId} failed on backend.`);
        }
        return data;
      } catch (e) {
        if (e.message && e.message.includes('failed on backend')) {
          throw e;
        }
        // transient network poll error — continue polling
      }
    }
    throw new Error('Scan timed out waiting for Nmap results');
  },

  async getScans(detailed = true) {
    const url = detailed ? `${this.getBaseUrl()}/api/scans?full=true` : `${this.getBaseUrl()}/api/scans`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch scans from backend');
    const data = await res.json();
    return data.map(normalizeBackendScan);
  },

  async getScanById(scanId) {
    const res = await fetch(`${this.getBaseUrl()}/api/scans/${scanId}`);
    if (!res.ok) throw new Error(`Failed to fetch scan ${scanId}`);
    const data = await res.json();
    return normalizeBackendScan(data);
  },

  async deleteScan(scanId) {
    const res = await fetch(`${this.getBaseUrl()}/api/scans/${scanId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete scan on backend');
    return res.json();
  },

  async startBatchScan(config) {
    let portRange = config.portRange || '1-1024';
    if (config.scanType === 'Quick Scan' || config.scanType === 'Common Ports Scan') {
      portRange = config.portRange || '21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5432,5900,6379,8080,8443,27017';
    } else if (config.scanType === 'Full Scan' || config.scanType === 'Full TCP Connect Scan') {
      portRange = config.portRange || '1-65535';
    } else if (config.scanType === 'Standard Scan' || config.scanType === 'TCP Connect Scan') {
      portRange = config.portRange || '1-1024';
    } else if (config.scanType === 'Custom Port Scan') {
      portRange = config.customPorts || config.portRange || '1-1024';
    }

    const res = await fetch(`${this.getBaseUrl()}/api/scan/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targets: config.targets || [],
        scan_type: config.scanType,
        port_range: portRange,
        custom_ports: config.customPorts || null,
        authorized: Boolean(config.authorized),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || `Backend returned HTTP ${res.status}`);
    }
    return res.json();
  },

  async pollBatchScan(batchId, onProgress, timeoutMs = 600000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/scans/batch/${batchId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const normalizedScans = (data.scans || []).map(normalizeBackendScan);
        const batchData = {
          ...data,
          scans: normalizedScans,
        };
        if (onProgress) onProgress(batchData);
        if (data.status === 'completed' || data.status === 'Completed' || data.status === 'failed') {
          return batchData;
        }
      } catch (e) {
        // continue polling
      }
    }
    throw new Error('Batch scan timed out waiting for results');
  },

  async getBatches() {
    const res = await fetch(`${this.getBaseUrl()}/api/batches`);
    if (!res.ok) throw new Error('Failed to fetch batches from backend');
    return res.json();
  },
};

// ─── Translate backend scan to local format ───────────────────────────────────
export function normalizeBackendScan(raw) {
  const total = raw.totalPorts ?? raw.total_ports ?? 0;
  const rawPorts = raw.ports || [];
  return {
    id: raw.id,
    target: raw.target,
    hostname: raw.hostname,
    date: raw.date,
    scanType: raw.scanType || raw.scan_type,
    portRange: raw.portRange || raw.port_range || '',
    totalPorts: total,
    scannedPorts: raw.scannedPorts ?? raw.scanned_ports ?? total,
    returnedPorts: raw.returnedPorts ?? raw.returned_ports ?? rawPorts.length,
    openPorts: raw.openPorts ?? raw.open_ports ?? 0,
    closedPorts: raw.closedPorts ?? raw.closed_ports ?? 0,
    filteredPorts: raw.filteredPorts ?? raw.filtered_ports ?? 0,
    riskLevel: raw.riskLevel ?? raw.risk_level ?? 'Low',
    status: raw.status ?? 'Completed',
    duration: raw.duration ?? '0s',
    findings: raw.findings ?? (raw.findingDetails || raw.finding_details || []).length,
    isRealScan: raw.isRealScan ?? raw.is_real_scan ?? true,
    batchId: raw.batchId ?? raw.batch_id ?? null,
    errorMessage: raw.errorMessage ?? raw.error_message,
    ports: rawPorts.map(p => ({
      port: p.port,
      protocol: p.protocol || 'TCP',
      state: p.state || 'Unknown',
      service: p.service || (p.state === 'Open' ? 'Unknown' : '—'),
      product: p.product || null,
      version: p.state === 'Open' ? (p.version || p.product || p.extraInfo || 'Unknown') : null,
      description: p.description,
      method: p.method || null,
    })),
    services: (raw.services || []).map(s => ({
      port: s.port,
      protocol: s.protocol || 'TCP',
      service: s.service || 'unknown',
      product: s.product || null,
      version: s.version || 'Unknown',
      extraInfo: s.extraInfo || s.extra_info || null,
      confidence: s.confidence ?? 75,
      confidenceExplanation: s.confidenceExplanation || s.confidence_explanation || null,
      status: s.status || 'Unknown',
      cpe: s.cpe || null,
      method: s.method || 'table',
      evidence: s.evidence || null,
      ostype: s.ostype || null,
      riskLevel: s.riskLevel ?? s.risk_level ?? 'Low',
      description: s.description,
    })),
    findingDetails: (raw.findingDetails || raw.finding_details || []).map(f => ({
      id: f.id,
      service: f.service || '',
      port: f.port || 0,
      protocol: f.protocol || 'TCP',
      riskLevel: f.riskLevel ?? f.risk_level ?? 'Low',
      score: f.score ?? 0,
      scoreBreakdown: f.scoreBreakdown || f.score_breakdown || null,
      title: f.title || '',
      description: f.description || '',
      recommendation: f.recommendation || '',
      factors: f.factors || [],
      evidence: f.evidence || null,
      cve: f.cve && f.cve !== 'N/A' ? f.cve : 'N/A — Exposure finding (No verified CVE)',
    })),
    nmapOutput: raw.nmapOutput || raw.nmap_output,
  };
}

// ─── Scan Service ─────────────────────────────────────────────────────────────
export const scanService = {
  generateScanId() {
    const history = storageService.getScanHistory();
    scanCounter = Math.max(scanCounter, history.length + 100);
    scanCounter++;
    return `SCAN-${String(scanCounter).padStart(3, '0')}`;
  },

  async runScan(config, onProgress, onStage) {
    // 1. Check if user explicitly chose simulation scan
    const isExplicitDemo = config.scanType === 'SYN Scan (Demo Only)' || config.demoMode === true;
    if (isExplicitDemo) {
      throw new Error('Simulation scan is disabled. NetSecure performs real Nmap network scans only against authorized targets.');
    }

    // 2. REAL SCAN PATH — verify backend health first
    onStage('Checking NetSecure backend connection...');
    onProgress(5);
    const health = await backendService.checkHealth();

    if (!health.available) {
      throw new Error(
        `Backend Connection Failed: Cannot reach FastAPI server at ${backendService.getBaseUrl()}.\n` +
        `Start the backend server: cd NetSecure\\backend && uvicorn main:app --reload`
      );
    }

    if (!health.nmapAvailable) {
      throw new Error(
        `Nmap Not Available: Backend is online but Nmap was not detected.\n` +
        `Install Nmap from https://nmap.org/download.html and restart backend.`
      );
    }

    // 3. Initiate real scan on FastAPI backend
    onStage(`Connecting to backend (${health.baseUrl})...`);
    onProgress(10);

    const startResp = await backendService.startScan(config);
    const scanId = startResp.scanId;

    onStage(`Scan ${scanId} queued on backend — running Nmap against ${config.target}...`);
    onProgress(20);

    // Stage progression during real scan
    const stages = [
      { pct: 30, label: 'Host reachability verification...' },
      { pct: 50, label: 'TCP port probe execution (-sT)...' },
      { pct: 70, label: 'Service & version fingerprinting (-sV)...' },
      { pct: 85, label: 'XML output parsing & risk evaluation...' },
    ];
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        const s = stages[stageIdx++];
        onStage(s.label);
        onProgress(s.pct);
      }
    }, 5000);

    let raw;
    try {
      raw = await backendService.pollScan(scanId, onStage);
    } finally {
      clearInterval(stageInterval);
    }

    onStage('Processing scan results...');
    onProgress(95);

    const scan = normalizeBackendScan(raw);

    onProgress(100);
    onStage('Scan complete!');

    // Persist real scan in local cache
    storageService.saveScan(scan);
    return scan;
  },

  async runBatchScan(config, onProgress, onStage, onBatchUpdate) {
    onStage('Checking NetSecure backend connection...');
    onProgress(5);
    const health = await backendService.checkHealth();

    if (!health.available) {
      throw new Error(
        `Backend Connection Failed: Cannot reach FastAPI server at ${backendService.getBaseUrl()}.\n` +
        `Start the backend server: cd NetSecure\\backend && uvicorn main:app --reload`
      );
    }

    if (!health.nmapAvailable) {
      throw new Error(
        `Nmap Not Available: Backend is online but Nmap was not detected.\n` +
        `Install Nmap from https://nmap.org/download.html and restart backend.`
      );
    }

    onStage(`Starting batch scan across ${config.targets.length} target(s)...`);
    onProgress(10);

    const init = await backendService.startBatchScan(config);
    const batchId = init.batchId;

    onStage(`Batch ${batchId} running — executing Nmap with max 3 concurrency...`);
    onProgress(20);

    const finalBatch = await backendService.pollBatchScan(batchId, (update) => {
      if (onBatchUpdate) onBatchUpdate(update);
      const total = update.totalTargets || config.targets.length;
      const completed = (update.completedTargets || 0) + (update.failedTargets || 0);
      const pct = Math.min(95, 20 + Math.round((completed / Math.max(1, total)) * 75));
      onProgress(pct);
      onStage(`Scanning targets... (${completed}/${total} finished)`);
    });

    onProgress(100);
    onStage('Batch scan complete!');

    // Persist all scans into local cache
    if (finalBatch.scans && Array.isArray(finalBatch.scans)) {
      for (const s of finalBatch.scans) {
        storageService.saveScan(s);
      }
    }

    return finalBatch;
  },
};
