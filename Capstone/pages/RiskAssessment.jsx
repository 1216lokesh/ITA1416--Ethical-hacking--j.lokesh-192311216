import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, X, Info, Filter, Search, ChevronDown, HelpCircle,
  Shield, Server, RefreshCw, Cpu, Layers, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';
import ChartCard from '../components/ChartCard';
import RiskBadge from '../components/RiskBadge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RISK_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };
const RISK_LEVELS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const SCORE_RANGES = {
  Critical: '80–100',
  High: '60–79',
  Medium: '30–59',
  Low: '0–29',
};

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-charcoal-800 border border-charcoal-600 rounded-lg px-3 py-2 text-xs shadow-lg">
        {label && <p className="text-gray-400 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

export default function RiskAssessment() {
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState('All');
  const [selectedScanId, setSelectedScanId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [history, setHistory] = useState(() => storageService.getScanHistory());

  const loadData = async () => {
    setLoading(true);
    try {
      const scans = await backendService.getScans(true);
      if (scans && scans.length > 0) {
        setHistory(scans);
        storageService.syncWithBackend(scans);
      }
    } catch (e) {
      setHistory(storageService.getScanHistory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Collect findings from real SQLite-backed scans
  const allFindings = useMemo(() => {
    const list = [];
    const seen = new Map();

    const targetScans = selectedScanId === 'ALL'
      ? history
      : history.filter(s => s.id === selectedScanId);

    targetScans.forEach(scan => {
      (scan.findingDetails || []).forEach(f => {
        const key = `${scan.id}:${f.id}:${f.port}`;
        if (!seen.has(key)) {
          seen.set(key, {
            ...f,
            scanId: scan.id,
            target: scan.target,
            hostname: scan.hostname,
            scanDate: scan.date,
            scanType: scan.scanType,
          });
        }
      });
    });

    return Array.from(seen.values());
  }, [history, selectedScanId]);

  const filtered = useMemo(() => {
    let arr = [...allFindings];
    if (filterLevel !== 'All') {
      arr = arr.filter(f => f.riskLevel === filterLevel);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.service.toLowerCase().includes(q) ||
        String(f.port).includes(q) ||
        (f.protocol || '').toLowerCase().includes(q) ||
        (f.scanId || '').toLowerCase().includes(q) ||
        (f.target || '').toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'risk') {
        const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (order[b.riskLevel] || 0) - (order[a.riskLevel] || 0);
      }
      if (sortBy === 'service') return a.service.localeCompare(b.service);
      if (sortBy === 'port') return a.port - b.port;
      return 0;
    });
    return arr;
  }, [allFindings, filterLevel, search, sortBy]);

  const counts = useMemo(() => {
    const c = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    allFindings.forEach(f => {
      if (c[f.riskLevel] !== undefined) {
        c[f.riskLevel]++;
      }
    });
    return c;
  }, [allFindings]);

  const riskDistData = useMemo(() => {
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: RISK_COLORS[name],
    }));
  }, [counts]);

  const riskByServiceData = useMemo(() => {
    const svcMap = {};
    allFindings.forEach(f => {
      if (!svcMap[f.service]) {
        svcMap[f.service] = { name: f.service, Critical: 0, High: 0, Medium: 0, Low: 0 };
      }
      if (svcMap[f.service][f.riskLevel] !== undefined) {
        svcMap[f.service][f.riskLevel]++;
      }
    });
    return Object.values(svcMap);
  }, [allFindings]);

  return (
    <div className="space-y-6 fade-in">
      {/* Engine Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-800 bg-blue-900 bg-opacity-20">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-300">Rule-Based Risk Assessment Engine</h2>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-xs text-neon-blue hover:underline flex items-center gap-1"
            >
              <HelpCircle size={13} /> Methodology & Scoring Guide
            </button>
          </div>
          <p className="text-xs text-blue-400 mt-1 leading-relaxed">
            Evaluates network exposure surfaces based on direct Nmap scan records. Scores use transparent rule-based thresholds:
            {' '}<span className="text-red-400 font-semibold">Critical 80–100</span> ·{' '}
            <span className="text-orange-400 font-semibold">High 60–79</span> ·{' '}
            <span className="text-yellow-400 font-semibold">Medium 30–59</span> ·{' '}
            <span className="text-green-400 font-semibold">Low 0–29</span>.
            <strong className="text-yellow-400"> Identified findings represent network exposure surfaces, not confirmed or exploited vulnerabilities. No finding is labeled as a CVE unless independently verified.</strong>
          </p>
        </div>
      </div>

      {/* Methodology & Calculation Guide Accordion */}
      {showMethodology && (
        <div className="card border-blue-700 bg-charcoal-900 bg-opacity-95 text-xs text-gray-300 space-y-3 fade-in">
          <div className="flex items-center justify-between border-b border-charcoal-700 pb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Shield size={14} className="text-neon-blue" />
              Risk Scoring Methodology & Calculation Rationale
            </span>
            <button onClick={() => setShowMethodology(false)} className="text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <p className="text-gray-400 leading-relaxed">
            NetSecure scores each finding using a transparent, deterministic rule-based formula based on network accessibility, protocol risk factors, and potential blast radius:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-charcoal-800 border border-charcoal-700 space-y-1.5">
              <div className="font-semibold text-yellow-400 flex items-center gap-1">
                <span>Port 445 (microsoft-ds / SMB)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800">Score: 50/100 · Medium</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                <strong>Calculation:</strong> Base open port (+10 pts) + SMB/NetBIOS lateral movement factor (+40 pts) = <strong>50 pts (Medium: 30–59 range)</strong>.
              </p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                <strong>Rationale:</strong> Port 445 hosts SMB file sharing and RPC over named pipes. Exposing it allows unauthenticated callers to attempt NTLM relay attacks, user enumeration, and lateral movement. It is a configuration exposure concern, not a confirmed vulnerability.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-charcoal-800 border border-charcoal-700 space-y-1.5">
              <div className="font-semibold text-yellow-400 flex items-center gap-1">
                <span>Port 135 (msrpc / Windows RPC)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800">Score: 30/100 · Medium</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                <strong>Calculation:</strong> Base open port (+10 pts) + RPC endpoint mapper exposure (+20 pts) = <strong>30 pts (Medium: 30–59 range)</strong>.
              </p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                <strong>Rationale:</strong> Port 135 is the RPC Endpoint Mapper (epmap). Exposing it allows remote callers to enumerate RPC interface identifiers (UUIDs) and endpoints. Unless required for Windows domain management, access should be firewalled.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded bg-charcoal-800 border border-red-800">
              <span className="font-bold text-red-400">Critical (80–100)</span>
              <p className="text-gray-400 mt-0.5">Exposed databases, unauthenticated administrative services, plaintext Telnet.</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-orange-800">
              <span className="font-bold text-orange-400">High (60–79)</span>
              <p className="text-gray-400 mt-0.5">Exposed Remote Desktop (RDP/VNC), unencrypted HTTP services, plaintext FTP.</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-yellow-800">
              <span className="font-bold text-yellow-400">Medium (30–59)</span>
              <p className="text-gray-400 mt-0.5">Exposed SMB (445), RPC (135), default SSH (22), DNS/NTP services.</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-green-800">
              <span className="font-bold text-green-400">Low (0–29)</span>
              <p className="text-gray-400 mt-0.5">Encrypted HTTPS endpoints (443), closed/filtered ports with minimal attack surface.</p>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Filters, Search, Sort, Scan Selector */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search findings, ports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-8 w-48 text-xs"
              />
            </div>

            {/* Scan Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Scan:</span>
              <select
                value={selectedScanId}
                onChange={e => setSelectedScanId(e.target.value)}
                className="select-field text-xs py-1 w-44"
              >
                <option value="ALL">All Scans ({history.length})</option>
                {history.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({s.target})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter Buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {RISK_LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLevel(l)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterLevel === l
                      ? 'border-neon-green text-neon-green bg-neon-green bg-opacity-10'
                      : 'border-charcoal-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="select-field text-xs pr-7 py-1 w-32"
              >
                <option value="score">Sort: Score</option>
                <option value="risk">Sort: Severity</option>
                <option value="service">Sort: Service</option>
                <option value="port">Sort: Port</option>
              </select>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Findings', value: allFindings.length, color: '#00d4ff' },
          { label: 'Critical', value: counts.Critical, color: '#ef4444' },
          { label: 'High', value: counts.High, color: '#f97316' },
          { label: 'Medium', value: counts.Medium, color: '#eab308' },
          { label: 'Low', value: counts.Low, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="card text-center border" style={{ borderColor: `${s.color}30` }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Risk Distribution" subtitle="Findings categorized by rule severity">
          {allFindings.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs">No risk findings to visualize</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {riskDistData.filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Risk by Service" subtitle="Findings breakdown per exposed service">
          {riskByServiceData.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs">No risk findings to visualize</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskByServiceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} formatter={v => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="Critical" stackId="a" fill="#ef4444" />
                <Bar dataKey="High" stackId="a" fill="#f97316" />
                <Bar dataKey="Medium" stackId="a" fill="#eab308" />
                <Bar dataKey="Low" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Findings List */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Security Findings Inventory ({filtered.length})
            </h3>
            {allFindings.length > 0 && (
              <span className="text-xs text-gray-500">
                Source: SQLite Scan Records · Rule-Based Risk Engine
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-gray-500">
              <ShieldAlert size={36} className="mx-auto mb-2 text-gray-700" />
              <div className="text-gray-400 font-medium">No security findings found</div>
              <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                {allFindings.length === 0
                  ? 'Run a network port scan to discover active services and evaluate network exposure surfaces on authorized targets.'
                  : 'No findings match the active search or filter criteria.'}
              </p>
              {allFindings.length === 0 && (
                <button
                  onClick={() => navigate('/scanner')}
                  className="btn-primary mt-4 text-xs"
                >
                  Start New Scan
                </button>
              )}
            </div>
          ) : (
            filtered.map((f, i) => (
              <div
                key={`${f.scanId || ''}-${f.id}-${i}`}
                className="p-4 bg-charcoal-900 rounded-xl border border-charcoal-700 hover:border-charcoal-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-1 h-full min-h-12 rounded-full flex-shrink-0 ${
                        f.riskLevel === 'Critical' ? 'bg-red-500' :
                        f.riskLevel === 'High' ? 'bg-orange-500' :
                        f.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white font-mono">{f.id}</span>
                        <RiskBadge level={f.riskLevel} />
                        <span className="text-xs text-gray-400 font-mono">Score: {f.score}/100</span>
                        <span className="text-xs text-gray-500">({SCORE_RANGES[f.riskLevel]} range)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-charcoal-800 border border-charcoal-700 text-blue-300">
                          Exposure Surface
                        </span>
                      </div>
                      <h4 className="text-sm text-gray-200 font-medium mt-1">{f.title}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                        <span>Service: <span className="text-blue-400 font-mono">{f.service}</span></span>
                        <span>Port: <span className="text-neon-green font-mono">{f.port}/{f.protocol || 'TCP'}</span></span>
                        {f.scanId && <span>Scan: <span className="text-gray-300 font-mono">{f.scanId}</span></span>}
                        {f.target && <span>Target: <span className="text-gray-300 font-mono">{f.target}</span></span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setModal(f)}
                    className="btn-secondary text-xs py-1 px-3 flex-shrink-0"
                  >
                    Details
                  </button>
                </div>

                {/* Score bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, f.score)}%`,
                        background: RISK_COLORS[f.riskLevel] || '#22c55e',
                      }}
                    ></div>
                  </div>
                  <span className="text-xs font-mono font-semibold" style={{ color: RISK_COLORS[f.riskLevel] }}>
                    {f.score}/100
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Finding Detail Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-charcoal-800 border border-charcoal-500 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700 sticky top-0 bg-charcoal-800 z-10">
              <div className="flex items-center gap-3">
                <ShieldAlert size={22} style={{ color: RISK_COLORS[modal.riskLevel] }} />
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    {modal.id}
                    <span className="text-xs font-normal text-gray-400">· {modal.service} on port {modal.port}/{modal.protocol || 'TCP'}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RiskBadge level={modal.riskLevel} />
                    <span className="text-xs text-gray-400 font-mono">Score: {modal.score}/100 ({SCORE_RANGES[modal.riskLevel]} {modal.riskLevel})</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-charcoal-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">{modal.title}</h4>
                <div className="mt-1 text-xs text-gray-400 flex items-center gap-3 flex-wrap">
                  <span>Target: <strong className="text-gray-200 font-mono">{modal.target}</strong></span>
                  <span>Port: <strong className="text-neon-green font-mono">{modal.port}/{modal.protocol || 'TCP'}</strong></span>
                  <span>Service: <strong className="text-blue-300 font-mono">{modal.service}</strong></span>
                  {modal.scanId && <span>Scan: <strong className="text-gray-200 font-mono">{modal.scanId}</strong></span>}
                </div>
              </div>

              {/* Exposure vs Vulnerability Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-900 bg-opacity-20 border border-blue-800">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300 leading-relaxed">
                  <strong>Exposure Assessment Notice:</strong> This finding indicates that service <code className="font-mono text-white">{modal.service}</code> is actively listening and reachable over the network. It represents an exposed attack surface, <strong>not a confirmed exploitable vulnerability or active breach</strong>.
                </div>
              </div>

              {/* Score Breakdown & Calculation Rationale */}
              <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-700 space-y-2">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-neon-green" />
                  Score Calculation & Exposure Breakdown
                </div>
                <div className="p-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 font-mono text-xs text-blue-300 leading-relaxed select-all">
                  {modal.scoreBreakdown || (
                    modal.port === 445
                      ? 'Baseline open port (+10 pts) + SMB/NetBIOS lateral movement & relay exposure (+40 pts) = 50/100 (Medium Severity: threshold 30–59)'
                      : modal.port === 135
                      ? 'Baseline open port (+10 pts) + RPC endpoint mapper exposed (+20 pts) = 30/100 (Medium Severity: threshold 30–59)'
                      : `Baseline open port (+10 pts) + Service '${modal.service}' risk factor (+${Math.max(0, modal.score - 10)} pts) = ${modal.score}/100 (${modal.riskLevel} Severity)`
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {modal.port === 445
                    ? 'Port 445 receives a score of 50 (Medium) because SMB (Server Message Block) allows remote file access, RPC over named pipes, and credential relaying. In enterprise networks, exposed SMB is a primary vector for ransomware and lateral movement.'
                    : modal.port === 135
                    ? 'Port 135 receives a score of 30 (Medium) because the Microsoft RPC Endpoint Mapper exposes active RPC interface identifiers (UUIDs) and endpoints to remote querying, expanding network reconnaissance exposure.'
                    : `Score reflects baseline open port accessibility plus protocol-specific exposure factor (${modal.score}/100 falls into the ${SCORE_RANGES[modal.riskLevel]} ${modal.riskLevel} threshold).`}
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</div>
                <p className="text-sm text-gray-300 leading-relaxed bg-charcoal-900 p-3 rounded-lg border border-charcoal-700">
                  {modal.description}
                </p>
              </div>

              {/* Detection Evidence */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers size={13} className="text-neon-blue" />
                  Detection Evidence & Probe Information
                </div>
                <div className="text-xs text-gray-300 font-mono bg-charcoal-900 p-3 rounded-lg border border-charcoal-700 leading-relaxed">
                  {modal.evidence || `Service '${modal.service}' confirmed listening on port ${modal.port}/${modal.protocol || 'TCP'} (syn-ack)`}
                </div>
              </div>

              {/* Assessment Factors */}
              {modal.factors && modal.factors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assessment Factors</div>
                  <div className="space-y-1.5">
                    {modal.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-300 bg-charcoal-900 p-2 rounded-lg border border-charcoal-700">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: RISK_COLORS[modal.riskLevel] }}></div>
                        <span className="leading-relaxed">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div className="p-3.5 rounded-xl bg-green-950 bg-opacity-30 border border-green-800">
                <div className="text-xs font-semibold text-green-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-400" />
                  Remediation & Hardening Guidance
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{modal.recommendation}</p>
              </div>

              {/* CVE & Verified Status */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">CVE / Vulnerability Classification</div>
                <div className="text-xs text-gray-400 font-mono bg-charcoal-900 px-3 py-2 rounded-lg border border-charcoal-700 flex items-center justify-between">
                  <span>{modal.cve || 'N/A — Exposure finding (No verified CVE)'}</span>
                  <span className="text-[10px] text-gray-500 font-sans">No verified CVE assigned</span>
                </div>
              </div>

              {/* Security Advisory Notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-900 bg-opacity-20 border border-yellow-800">
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400 leading-relaxed">
                  This score is computed by the Rule-Based Risk Assessment Engine (not an official CVSS score or confirmed vulnerability). It reflects network exposure and architectural attack surface.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-charcoal-700 bg-charcoal-850">
              <span className="text-xs text-gray-500 font-mono">
                {modal.scanDate ? new Date(modal.scanDate).toLocaleString() : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModal(null);
                    navigate('/fingerprinting');
                  }}
                  className="btn-secondary text-xs py-1.5"
                >
                  View Services
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="btn-primary text-xs py-1.5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}