import React, { useState, useRef, useEffect } from 'react';
import {
  Scan, Play, RotateCcw, Eye, CheckCircle, AlertTriangle, Info,
  Shield, Wifi, WifiOff, Server, ExternalLink, Sliders
} from 'lucide-react';
import { scanService, backendService } from '../services/scanService';
import { PortStateBadge } from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import { useNavigate } from 'react-router-dom';

const QUICK_PORTS_STRING = '21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5432,5900,6379,8080,8443,27017';

export function validatePortSpecification(str) {
  if (!str || !str.trim()) {
    return 'Custom port specification is required (e.g. 8000, 80,443,8000, or 1-100)';
  }
  const trimmed = str.trim();
  if (!/^[\d\s,-]+$/.test(trimmed)) {
    return 'Invalid characters in port specification. Use numbers, commas, and hyphens (e.g., 8000 or 80,443,8000).';
  }
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return 'Please enter at least one port number (1–65535).';
  }
  for (const part of parts) {
    if (part.includes('-')) {
      const tokens = part.split('-');
      if (tokens.length !== 2 || !tokens[0].trim() || !tokens[1].trim()) {
        return `Malformed port range '${part}'. Format must be start-end (e.g. 1-100).`;
      }
      const start = Number(tokens[0].trim());
      const end = Number(tokens[1].trim());
      if (isNaN(start) || isNaN(end)) {
        return `Port range '${part}' must contain valid numbers.`;
      }
      if (start < 1 || start > 65535 || end < 1 || end > 65535) {
        return `Port range '${part}' is out of bounds. Ports must be between 1 and 65535.`;
      }
      if (start > end) {
        return `Invalid port range '${part}': start port (${start}) cannot exceed end port (${end}).`;
      }
    } else {
      const port = Number(part);
      if (isNaN(port) || !Number.isInteger(port)) {
        return `Invalid port '${part}'. Must be an integer between 1 and 65535.`;
      }
      if (port < 1 || port > 65535) {
        return `Port ${port} is out of bounds. Valid ports are between 1 and 65535.`;
      }
    }
  }
  return null;
}

const SCAN_MODES = [
  {
    id: 'quick',
    name: 'Quick Scan',
    scanType: 'Quick Scan',
    portRange: QUICK_PORTS_STRING,
    badge: 'Fast (~5s)',
    badgeColor: 'border-cyan-500 text-cyan-400 bg-cyan-900 bg-opacity-20',
    description: 'Scans 24 high-priority common ports to quickly identify exposed services.',
    portsLabel: '24 Common Ports',
    portCount: '24 ports',
    estTime: '~5s',
    flag: '-sT -sV -p 24 ports',
  },
  {
    id: 'custom',
    name: 'Custom Port Scan',
    scanType: 'Custom Port Scan',
    portRange: '',
    badge: 'User Defined',
    badgeColor: 'border-neon-green text-neon-green bg-green-900 bg-opacity-20',
    description: 'Scan specific ports, lists, or ranges (e.g., 8000, 80,443,8000, or 1-100).',
    portsLabel: 'User-Specified Ports',
    portCount: '1–65,535',
    estTime: 'Variable',
    flag: '-sT -sV -p <custom>',
  },
];

// ─── Backend Status Badge ──────────────────────────────────────────────────────
function BackendStatusBadge({ health }) {
  if (!health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-charcoal-900 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse"></div>
        Checking backend...
      </div>
    );
  }

  if (health.available && health.nmapAvailable) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-700 bg-green-900 bg-opacity-30">
        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
        <div>
          <div className="text-xs font-semibold text-neon-green">🔍 REAL SCAN MODE</div>
          <div className="text-xs text-green-400 mt-0.5">Nmap {health.nmapVersion?.split(' ')[2] || 'detected'} · Backend online</div>
        </div>
      </div>
    );
  }

  if (health.available && !health.nmapAvailable) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-700 bg-orange-900 bg-opacity-20">
        <Server size={14} className="text-orange-400" />
        <div>
          <div className="text-xs font-semibold text-orange-300">⚠ BACKEND ONLINE — NMAP MISSING</div>
          <div className="text-xs text-orange-400 mt-0.5">Install Nmap from nmap.org to enable real scanning</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-800 bg-red-900 bg-opacity-20">
      <WifiOff size={14} className="text-red-400" />
      <div>
        <div className="text-xs font-semibold text-red-300">BACKEND OFFLINE</div>
        <div className="text-xs text-red-400 mt-0.5">Start backend server at 127.0.0.1:8000</div>
      </div>
    </div>
  );
}

export default function PortScanner() {
  const navigate = useNavigate();
  const [selectedModeId, setSelectedModeId] = useState('quick');
  const [isCustom, setIsCustom] = useState(false);
  const [form, setForm] = useState({
    target: '',
    hostname: '',
    scanType: 'Quick Scan',
    portRange: QUICK_PORTS_STRING,
    customPorts: '',
    authorized: false,
  });
  const [errors, setErrors] = useState({});
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [health, setHealth] = useState(null);
  const resultRef = useRef(null);

  // Check backend health on mount and every 15s
  useEffect(() => {
    const check = async () => {
      const h = await backendService.checkHealth();
      setHealth(h);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMode = (mode) => {
    setSelectedModeId(mode.id);
    const isCustomMode = mode.id === 'custom';
    setIsCustom(isCustomMode);
    setForm(f => ({
      ...f,
      scanType: mode.scanType,
      portRange: isCustomMode ? (f.customPorts || '') : mode.portRange,
      customPorts: isCustomMode ? f.customPorts : '',
    }));
    setErrors(e => {
      const copy = { ...e };
      delete copy.customPorts;
      return copy;
    });
  };

  const validate = () => {
    const errs = {};
    const t = form.target.trim();
    if (!t) {
      errs.target = 'Target IP address is required';
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(t) && !/^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/.test(t)) {
      errs.target = 'Enter a valid IP address (e.g., 127.0.0.1, 127.0.0.3, or 192.168.56.1) or hostname';
    } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(t)) {
      const octets = t.split('.');
      if (octets.some(o => Number(o) > 255 || Number(o) < 0)) {
        errs.target = 'Invalid IP octet: octets must be between 0 and 255';
      }
    }
    if (!form.authorized) {
      errs.authorized = 'You must confirm you have authorization to scan this target';
    }
    if (selectedModeId === 'custom' || form.scanType === 'Custom Port Scan') {
      const portErr = validatePortSpecification(form.customPorts);
      if (portErr) {
        errs.customPorts = portErr;
      }
    }
    return errs;
  };

  const handleScan = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setScanning(true);
    setResult(null);
    setProgress(0);
    setStage('Preparing scan...');
    setNotification(null);

    try {
      const scan = await scanService.runScan(form, setProgress, setStage);
      setResult(scan);
      const mode = scan.isRealScan ? '🔍 Real Nmap Scan' : '📋 Scan Record';
      setNotification({
        type: 'success',
        msg: `${mode} ${scan.id} complete! Scanned ${scan.totalPorts} ports, found ${scan.openPorts} open port(s) on ${scan.target}.`,
      });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (e) {
      let msg = e.message;
      if (msg.startsWith('BACKEND_NO_NMAP')) {
        msg = '⚠ Backend is running but Nmap is not installed. Download Nmap from nmap.org/download.html and restart the backend.';
      }
      setNotification({ type: 'error', msg });
    } finally {
      setScanning(false);
    }
    setTimeout(() => setNotification(null), 8000);
  };

  const handleReset = () => {
    setSelectedModeId('quick');
    setIsCustom(false);
    setForm({
      target: '',
      hostname: '',
      scanType: 'Quick Scan',
      portRange: QUICK_PORTS_STRING,
      customPorts: '',
      authorized: false,
    });
    setErrors({});
    setResult(null);
    setProgress(0);
    setStage('');
    setNotification(null);
  };

  const portColumns = [
    { key: 'port', label: 'Port', sortable: true, render: (v) => <span className="font-mono font-semibold text-neon-green">{v}</span> },
    { key: 'protocol', label: 'Protocol', sortable: true },
    { key: 'state', label: 'State', sortable: true, render: (v) => <PortStateBadge state={v} /> },
    {
      key: 'service',
      label: 'Service',
      sortable: true,
      render: (v, r) => {
        if (r.state !== 'Open') {
          return <span className="text-gray-500 italic">—</span>;
        }
        if (!v || v === 'unknown' || v === 'Unknown' || v === '—') {
          return <span className="text-yellow-400/80 italic text-xs">Unknown</span>;
        }
        if (r.method === 'table') {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-white font-medium">{v}</span>
              <span
                className="text-[10px] text-yellow-400/90 bg-yellow-950/60 border border-yellow-700/50 px-1 py-0.5 rounded font-mono"
                title="Service inferred from standard port mapping (unverified by banner probe)"
              >
                inferred
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium">{v}</span>
            <span
              className="text-[10px] text-neon-green bg-green-950/60 border border-green-700/60 px-1 py-0.5 rounded font-mono"
              title="Service confirmed by active Nmap version probe (-sV)"
            >
              probed
            </span>
          </div>
        );
      }
    },
    {
      key: 'version',
      label: 'Version / Product',
      render: (v, r) => {
        if (r.state !== 'Open') return <span className="text-gray-600">—</span>;
        return <span className="font-mono text-xs text-blue-300">{v || 'Unknown'}</span>;
      }
    },
    {
      key: 'description',
      label: 'Description',
      render: (v, r) => {
        if (r.state !== 'Open') return <span className="text-gray-500 text-xs">{v}</span>;
        return <span className="text-gray-300 text-xs">{v}</span>;
      }
    },
  ];

  const activeMode = SCAN_MODES.find(m => m.id === selectedModeId);

  return (
    <div className="space-y-6 fade-in">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${notification.type === 'success' ? 'bg-green-900 border-green-700 text-green-200' : 'bg-red-900 border-red-700 text-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm">{notification.msg}</span>
        </div>
      )}

      {/* Backend Status + Authorization Warning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Backend Status</h4>
            <button onClick={async () => setHealth(await backendService.checkHealth())}
              className="text-xs text-neon-green hover:underline">Refresh</button>
          </div>
          <BackendStatusBadge health={health} />

          {health?.available && !health?.nmapAvailable && (
            <div className="mt-3 p-3 rounded-lg bg-orange-900 bg-opacity-20 border border-orange-800">
              <p className="text-xs text-orange-400 font-semibold mb-1">Install Nmap to enable real scanning:</p>
              <ol className="text-xs text-orange-400 space-y-1 list-decimal list-inside">
                <li>Download from <a href="https://nmap.org/download.html" className="underline text-orange-300" target="_blank" rel="noreferrer">nmap.org/download.html</a></li>
                <li>Run the installer (adds nmap to PATH automatically)</li>
                <li>Restart the NetSecure backend server</li>
              </ol>
            </div>
          )}

          {!health?.available && (
            <div className="mt-3 p-3 rounded-lg bg-yellow-900 bg-opacity-20 border border-yellow-800">
              <p className="text-xs text-yellow-400 font-semibold mb-1">Start the backend to enable real scanning:</p>
              <div className="font-mono text-xs text-neon-green bg-charcoal-900 px-3 py-2 rounded-lg border border-charcoal-700 mt-1">
                cd NetSecure\backend<br />
                uvicorn main:app --reload
              </div>
            </div>
          )}
        </div>

        {/* Authorization Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-800 bg-yellow-900 bg-opacity-10">
          <Shield size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-yellow-300">Authorization Required</div>
            <div className="text-xs text-yellow-500 mt-1 leading-relaxed">
              Only scan targets you have <strong>explicit written authorization</strong> to test.
              Real scanning is authorized for loopback <code className="bg-charcoal-800 px-1 rounded">127.0.0.0/8</code> (e.g. 127.0.0.1, 127.0.0.3), private subnets (<code className="bg-charcoal-800 px-1 rounded">192.168.0.0/16</code>, <code className="bg-charcoal-800 px-1 rounded">10.0.0.0/8</code>, <code className="bg-charcoal-800 px-1 rounded">172.16.0.0/12</code>), and configured targets.
              Unauthorized port scanning is prohibited.
            </div>
          </div>
        </div>
      </div>

      {/* Scan Configuration Form */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
          <Scan size={18} className="text-neon-green" /> Network Port Scanner
        </h3>

        {/* Target Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Target IP */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target IP Address *</label>
            <input
              type="text"
              className={`input-field ${errors.target ? 'border-red-500' : ''}`}
              placeholder="e.g., 127.0.0.1, 127.0.0.3, or 192.168.56.1"
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            />
            {errors.target && <p className="text-xs text-red-400 mt-1">{errors.target}</p>}
            <p className="text-xs text-gray-600 mt-1">
              Authorized targets: loopback <code className="text-gray-400">127.0.0.0/8</code> (e.g., <code className="text-gray-400">127.0.0.3</code>), private networks (<code className="text-gray-400">192.168.x.x</code>, <code className="text-gray-400">10.x.x.x</code>), or configured CIDRs.
            </p>
          </div>

          {/* Hostname */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Hostname (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., localhost or server.local"
              value={form.hostname}
              onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))}
            />
          </div>
        </div>

        {/* Scan Mode Selector Card Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Select Scanning Mode *
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCAN_MODES.map((mode) => {
              const active = selectedModeId === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => handleSelectMode(mode)}
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all ${active
                      ? 'border-neon-green bg-charcoal-800 bg-opacity-80 shadow-lg shadow-green-950/20 ring-1 ring-neon-green'
                      : 'border-charcoal-700 bg-charcoal-900 hover:border-gray-600 hover:bg-charcoal-800/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-neon-green ring-2 ring-green-950' : 'bg-gray-600'
                          }`}
                      />
                      {mode.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-neon-green mb-1.5">
                    {mode.portsLabel}
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    {mode.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-charcoal-700/60 font-mono">
                    <span>{mode.portCount}</span>
                    <span className="text-gray-400">{mode.estTime}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Range Drawer if active */}
          {selectedModeId === 'custom' && (
            <div className="mt-4 p-4 rounded-xl border border-neon-green/40 bg-charcoal-900">
              <div className="flex items-center gap-2 mb-2">
                <Sliders size={14} className="text-neon-green" />
                <span className="text-xs font-semibold text-white">Custom Port Specification *</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Specify individual ports, comma-separated ports, or port ranges between 1 and 65535 (e.g., <code className="bg-charcoal-800 px-1 py-0.5 rounded text-neon-green">8000</code>, <code className="bg-charcoal-800 px-1 py-0.5 rounded text-neon-green">80,443,8000</code>, or <code className="bg-charcoal-800 px-1 py-0.5 rounded text-neon-green">1-100</code>).
              </p>
              <div>
                <input
                  type="text"
                  className={`input-field ${errors.customPorts ? 'border-red-500' : ''}`}
                  placeholder="e.g., 8000, 80,443,8000, or 1-100"
                  value={form.customPorts}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, customPorts: val, portRange: val }));
                    if (errors.customPorts) {
                      setErrors(errs => {
                        const copy = { ...errs };
                        delete copy.customPorts;
                        return copy;
                      });
                    }
                  }}
                />
                {errors.customPorts && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={13} /> {errors.customPorts}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Scan Info Strip */}
          {selectedModeId === 'quick' && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-charcoal-900/70 border border-charcoal-700/60 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Info size={13} className="text-neon-green" />
                <span>
                  Active: <strong className="text-white">Quick Scan</strong>
                  {' — '}
                  <span className="font-mono text-neon-green">24 Common Ports</span>
                </span>
              </div>
              <span className="text-gray-500 font-mono hidden sm:inline">
                Flags: -sT -sV -p 24 ports
              </span>
            </div>
          )}
        </div>

        {/* Authorization Checkbox */}
        <div className="mb-6">
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${errors.authorized ? 'border-red-600 bg-red-900 bg-opacity-20' : 'border-charcoal-600 hover:border-neon-green bg-charcoal-900'}`}>
            <input
              type="checkbox"
              checked={form.authorized}
              onChange={e => setForm(f => ({ ...f, authorized: e.target.checked }))}
              className="mt-0.5 accent-green-400"
            />
            <div>
              <div className="text-sm font-medium text-gray-200">
                I confirm I have explicit written authorization to scan this target
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Required before starting any scan. The backend enforces allowed-target restrictions for each IP.
              </div>
            </div>
          </label>
          {errors.authorized && <p className="text-xs text-red-400 mt-1">{errors.authorized}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin"></div> Scanning Target...</>
            ) : (
              <><Play size={16} /> Start Scan</>
            )}
          </button>
          <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
            <RotateCcw size={16} /> Reset
          </button>
          {result && (
            <button onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary flex items-center gap-2">
              <Eye size={16} /> View Results
            </button>
          )}
          {health?.available && (
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} /> API Docs
            </a>
          )}
        </div>
      </div>

      {/* Scanning Progress */}
      {scanning && (
        <div className="card border-neon-green border-opacity-30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse"></div>
            <span className="text-sm font-semibold text-neon-green">
              {health?.available && health?.nmapAvailable
                ? `🔍 Real Nmap Scan In Progress: ${form.target} (${form.scanType})`
                : '⚡ Network Scan Running'}
            </span>
          </div>
          <div className="relative h-2 bg-charcoal-900 rounded-full overflow-hidden mb-3">
            <div
              className="absolute top-0 left-0 h-full progress-bar rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span className="scanning-pulse">{stage}</span>
            <span className="text-neon-green font-semibold">{progress}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Host Discovery', done: progress > 20 },
              { label: 'Port Probing', done: progress > 55 },
              { label: 'Service Detection', done: progress > 80 },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${s.done ? 'bg-green-900 bg-opacity-30 text-green-400' : 'bg-charcoal-900 text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${s.done ? 'bg-neon-green' : 'bg-gray-600'}`}></div>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Scan Results ─── */}
      {result && (
        <div ref={resultRef} className="space-y-4 fade-in">
          {form.target.trim() && result.target.toLowerCase() !== form.target.trim().toLowerCase() && (
            <div className="p-3 rounded-lg border border-yellow-700 bg-yellow-900 bg-opacity-30 text-yellow-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0 text-yellow-400" />
              <span>
                Target input has changed to <strong>{form.target.trim()}</strong>. Displayed results below belong to previous scan on <strong>{result.target}</strong>. Click <strong>Start Scan</strong> to scan {form.target.trim()}.
              </span>
            </div>
          )}

          {/* Summary Card */}
          <div className="card" style={{ borderColor: result.isRealScan ? 'rgba(0,255,136,0.3)' : 'rgba(234,179,8,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-neon-green" />
                Scan Results: <span className="text-neon-green font-mono">{result.target}</span> ({result.id})
              </h3>
              <div className="flex items-center gap-2">
                {result.isRealScan ? (
                  <span className="text-xs px-2 py-1 rounded-full border border-green-600 text-neon-green bg-green-900 bg-opacity-20 font-semibold">
                    🔍 REAL SCAN
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full border border-charcoal-600 text-gray-400 bg-charcoal-800 font-semibold">
                    📋 SCAN RECORD
                  </span>
                )}
                <span className="text-xs text-gray-500">{new Date(result.date).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Total Scanned', value: result.totalPorts, color: '#00d4ff' },
                { label: 'Open Ports', value: result.openPorts, color: '#00ff88' },
                { label: 'Closed Ports', value: result.closedPorts, color: '#6b7280' },
                { label: 'Filtered Ports', value: result.filteredPorts, color: '#f97316' },
                { label: 'Duration', value: result.duration, color: '#a855f7' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-charcoal-900 rounded-lg">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
              <span>Target: <span className="text-white font-medium">{result.target}</span></span>
              {result.hostname && <span>· Host: <span className="text-white font-medium">{result.hostname}</span></span>}
              <span>· Mode: <span className="text-white font-medium">{result.scanType}</span></span>
              <span>· Range: <span className="text-white font-mono text-xs">{result.portRange && result.portRange.length > 30 ? `${result.portRange.slice(0, 30)}...` : result.portRange}</span></span>
              <span>· Risk: <span className={`font-medium ${result.riskLevel === 'Critical' ? 'text-red-400' : result.riskLevel === 'High' ? 'text-orange-400' : result.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>{result.riskLevel}</span></span>
            </div>

            {/* Scanned vs Returned ports clarity note */}
            {result.totalPorts > (result.ports?.length || 0) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-cyan-300 p-2.5 bg-cyan-950 bg-opacity-30 rounded-lg border border-cyan-800">
                <Info size={14} className="flex-shrink-0" />
                <span>
                  Nmap scanned <strong>{result.totalPorts} ports</strong>.
                  {' '}Found <strong>{result.openPorts} open port(s)</strong> explicitly reported;
                  {' '}{result.filteredPorts} filtered/closed ports were grouped by Nmap extraports.
                </span>
              </div>
            )}
          </div>

          {/* Detected Services Preview Card */}
          {result.services && result.services.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server size={16} className="text-neon-green" />
                  Detected Services & Fingerprints ({result.services.length})
                </h3>
                <span className="text-xs text-gray-400">Nmap -sV service probe</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.services.map((s, idx) => (
                  <div key={idx} className="p-3 bg-charcoal-900 rounded-lg border border-charcoal-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-semibold text-neon-green text-sm">
                          Port {s.port}/{s.protocol}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.confidence >= 70
                            ? 'bg-green-900 bg-opacity-30 text-green-400 border border-green-800'
                            : 'bg-yellow-900 bg-opacity-30 text-yellow-400 border border-yellow-800'
                          }`}>
                          {s.confidence}% conf
                        </span>
                      </div>
                      <div className="text-sm font-medium text-white mb-1">
                        {s.service || 'unknown'}
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <div>
                          <span className="text-gray-500">Product: </span>
                          <span className={s.product ? 'text-gray-200' : 'text-gray-500 italic'}>
                            {s.product || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Version: </span>
                          <span className={s.version && s.version !== 'Unknown' ? 'text-blue-300 font-mono' : 'text-gray-500 italic'}>
                            {s.version || 'Unknown'}
                          </span>
                        </div>
                        {s.extraInfo && (
                          <div>
                            <span className="text-gray-500">Extra: </span>
                            <span className="text-gray-300">{s.extraInfo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {s.method && (
                      <div className="mt-2 pt-2 border-t border-charcoal-800 flex items-center justify-between text-xs text-gray-500">
                        <span>Method: {s.method}</span>
                        {s.ostype && <span>OS: {s.ostype}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Port Results Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Port Scan Results for</span>
                  <span className="font-mono text-neon-green">{result.target}</span>
                  <span className="text-xs text-gray-400 font-mono">({result.id})</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Target-specific Nmap execution results · {result.openPorts} open, {result.closedPorts} closed, {result.filteredPorts} filtered
                </p>
              </div>
              {result.isRealScan && (
                <span className="text-xs text-neon-green flex items-center gap-1 bg-green-950/40 border border-green-800/60 px-2.5 py-1 rounded-full font-mono">
                  <Wifi size={12} /> Live Nmap ({result.id})
                </span>
              )}
            </div>

            {(!result.ports || result.ports.length === 0) ? (
              <div className="text-center py-8 px-4 bg-charcoal-900 rounded-lg border border-charcoal-700">
                <CheckCircle size={32} className="mx-auto text-cyan-400 mb-2 opacity-80" />
                <h4 className="text-sm font-medium text-white mb-1">No Explicit Open Ports Detected</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Nmap scanned {result.totalPorts} ports on <span className="text-neon-green font-mono">{result.target}</span>.
                  {result.filteredPorts > 0 && ` All ${result.filteredPorts} ports were reported as filtered (packet dropped / firewall blocked).`}
                  {result.closedPorts > 0 && ` All ${result.closedPorts} ports were reported as closed (connection refused).`}
                  {' '}No active services or listening ports are exposed on the tested range.
                </p>
              </div>
            ) : (
              <DataTable
                columns={portColumns}
                data={result.ports}
                searchable
                searchKeys={['port', 'service', 'state', 'version']}
              />
            )}

            {result.nmapOutput && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                  Show raw Nmap execution summary
                </summary>
                <pre className="mt-2 text-xs text-neon-green font-mono bg-charcoal-900 p-3 rounded-lg border border-charcoal-700 overflow-x-auto max-h-48">
                  {result.nmapOutput}
                </pre>
              </details>
            )}
          </div>

          {/* Navigate Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/fingerprinting')} className="btn-primary flex items-center gap-2 text-sm">
              View Service Fingerprinting
            </button>
            <button onClick={() => navigate('/risk')} className="btn-secondary flex items-center gap-2 text-sm">
              View Risk Assessment
            </button>
            <button onClick={() => navigate('/history')} className="btn-secondary flex items-center gap-2 text-sm">
              View Scan History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
