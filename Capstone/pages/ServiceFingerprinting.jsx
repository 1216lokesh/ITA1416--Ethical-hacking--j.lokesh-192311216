import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Eye, X, Info, CheckCircle, AlertTriangle, Shield,
  Search, RefreshCw, Cpu, Layers, HelpCircle
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';
import ChartCard from '../components/ChartCard';
import RiskBadge from '../components/RiskBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

export default function ServiceFingerprinting() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [history, setHistory] = useState(() => storageService.getScanHistory());
  const [selectedScanId, setSelectedScanId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfidenceHelp, setShowConfidenceHelp] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const scans = await backendService.getScans(true);
      if (scans && scans.length > 0) {
        setHistory(scans);
        storageService.syncWithBackend(scans);
      }
    } catch (e) {
      // fallback to cached history
      setHistory(storageService.getScanHistory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Collect services from SQLite-backed scans
  const allServices = useMemo(() => {
    const list = [];
    const seen = new Map();

    const targetScans = selectedScanId === 'ALL'
      ? history
      : history.filter(s => s.id === selectedScanId);

    targetScans.forEach(scan => {
      (scan.services || []).forEach(svc => {
        const key = `${scan.target}:${svc.port}/${svc.protocol}`;
        if (!seen.has(key)) {
          seen.set(key, {
            ...svc,
            scanId: scan.id,
            target: scan.target,
            hostname: scan.hostname,
            scanDate: scan.date,
            scanType: scan.scanType,
          });
        }
      });
    });

    return Array.from(seen.values()).sort((a, b) => a.port - b.port);
  }, [history, selectedScanId]);

  // Filtered services for display
  const filteredServices = useMemo(() => {
    let arr = [...allServices];
    if (filterStatus !== 'ALL') {
      arr = arr.filter(s => (s.status || 'Unknown') === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(s =>
        s.service.toLowerCase().includes(q) ||
        String(s.port).includes(q) ||
        (s.product || '').toLowerCase().includes(q) ||
        (s.version || '').toLowerCase().includes(q) ||
        (s.target || '').toLowerCase().includes(q) ||
        (s.cpe || '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [allServices, filterStatus, search]);

  const chartData = useMemo(() => {
    const counts = {};
    allServices.forEach(s => {
      counts[s.service] = (counts[s.service] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allServices]);

  const confidenceColor = (c) => {
    if (c >= 90) return '#00ff88';
    if (c >= 70) return '#00d4ff';
    if (c >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-800 bg-blue-900 bg-opacity-20">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-300">Service Fingerprinting Engine</h2>
            <button
              onClick={() => setShowConfidenceHelp(!showConfidenceHelp)}
              className="text-xs text-neon-blue hover:underline flex items-center gap-1"
            >
              <HelpCircle size={13} /> Methodology & Confidence
            </button>
          </div>
          <p className="text-xs text-blue-400 mt-1 leading-relaxed">
            Analyzes network probe responses from the live Nmap engine to identify active listening services,
            software products, versions, and CPE strings. Detection information is parsed directly from Nmap XML.
            <strong className="text-yellow-400"> Identified services represent exposure surfaces, not confirmed vulnerabilities.</strong>
          </p>
        </div>
      </div>

      {/* Confidence Methodology Accordion / Note */}
      {showConfidenceHelp && (
        <div className="card border-blue-700 bg-charcoal-900 bg-opacity-95 text-xs text-gray-300 space-y-2 fade-in">
          <div className="flex items-center justify-between border-b border-charcoal-700 pb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Shield size={14} className="text-neon-blue" />
              Service Detection & Confidence Rating Methodology
            </span>
            <button onClick={() => setShowConfidenceHelp(false)} className="text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <p className="text-gray-400 leading-relaxed">
            Confidence scores in NetSecure are rule-based heuristic certainty indicators derived from Nmap detection attributes.
            They are intended for diagnostic triage and <strong>do not represent scientifically validated statistical probabilities</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded bg-charcoal-800 border border-green-800">
              <span className="font-bold text-neon-green">95% (Identified)</span>
              <p className="text-gray-400 mt-0.5">Software product AND exact version confirmed via active Nmap probe (-sV).</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-blue-800">
              <span className="font-bold text-neon-blue">75% (Partially Identified)</span>
              <p className="text-gray-400 mt-0.5">Product recognized from banner; exact release version undisclosed.</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-yellow-800">
              <span className="font-bold text-yellow-400">65% (Partially Identified)</span>
              <p className="text-gray-400 mt-0.5">Service protocol recognized; vendor and version unknown.</p>
            </div>
            <div className="p-2 rounded bg-charcoal-800 border border-gray-700">
              <span className="font-bold text-gray-400">40% (Unknown)</span>
              <p className="text-gray-400 mt-0.5">Port is listening, but service fingerprint is unassigned or generic.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search services, products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-8 w-52 text-xs"
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

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              {['ALL', 'Identified', 'Partially Identified', 'Unknown'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterStatus === st
                      ? 'border-neon-green text-neon-green bg-neon-green bg-opacity-10'
                      : 'border-charcoal-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {st}
                </button>
              ))}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Identified (Version Known)',
            value: allServices.filter(s => s.status === 'Identified').length,
            color: '#00ff88',
          },
          {
            label: 'Partially Identified',
            value: allServices.filter(s => s.status === 'Partially Identified').length,
            color: '#00d4ff',
          },
          {
            label: 'Unknown Product / Version',
            value: allServices.filter(s => !s.status || s.status === 'Unknown').length,
            color: '#6b7280',
          },
          {
            label: 'Total Discovered Services',
            value: allServices.length,
            color: '#a855f7',
          },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Service Distribution" subtitle="Detected service categories" className="lg:col-span-1">
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-xs">No service data to visualize</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Count">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={['#00ff88', '#00d4ff', '#a855f7', '#f97316', '#eab308'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Service Table */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Service Inventory ({filteredServices.length})
            </h3>
            {allServices.length > 0 && (
              <span className="text-xs text-gray-500">
                Source: SQLite Scan Database
              </span>
            )}
          </div>

          {filteredServices.length === 0 ? (
            <div className="text-center py-14 text-gray-500">
              <Server size={36} className="mx-auto mb-2 text-gray-700" />
              <div className="text-gray-400 font-medium">No service records found</div>
              <p className="text-xs text-gray-600 mt-1">
                {allServices.length === 0
                  ? 'Run a network port scan to discover active services on authorized targets.'
                  : 'No services match the active search or filter criteria.'}
              </p>
              {allServices.length === 0 && (
                <button
                  onClick={() => navigate('/scanner')}
                  className="btn-primary mt-4 text-xs"
                >
                  Start New Scan
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-charcoal-700">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Port', 'Proto', 'Service', 'Product', 'Version', 'Extra Info', 'Confidence', 'Status', 'Risk', 'Actions'].map(h => (
                      <th key={h} className="table-header text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((svc, i) => {
                    const hasProduct = Boolean(svc.product && svc.product.trim());
                    const hasVersion = Boolean(svc.version && svc.version !== 'Unknown' && svc.version.trim());
                    return (
                      <tr key={i} className="table-row">
                        <td className="table-cell font-mono font-semibold text-neon-green">{svc.port}</td>
                        <td className="table-cell text-xs text-gray-400">{svc.protocol}</td>
                        <td className="table-cell text-white font-medium text-xs">{svc.service}</td>
                        <td className="table-cell text-xs">
                          {hasProduct ? (
                            <span className="text-gray-200">{svc.product}</span>
                          ) : (
                            <span className="text-gray-500 italic">Unknown</span>
                          )}
                        </td>
                        <td className="table-cell font-mono text-xs">
                          {hasVersion ? (
                            <span className="text-blue-300 font-medium">{svc.version}</span>
                          ) : (
                            <span className="text-gray-500 italic">Unknown</span>
                          )}
                        </td>
                        <td className="table-cell text-xs text-gray-400">
                          {svc.extraInfo ? (
                            <span className="truncate max-w-[120px] block" title={svc.extraInfo}>{svc.extraInfo}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-charcoal-900 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${svc.confidence || 0}%`,
                                  background: confidenceColor(svc.confidence || 0),
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono" style={{ color: confidenceColor(svc.confidence || 0) }}>
                              {svc.confidence || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              svc.status === 'Identified'
                                ? 'bg-green-900 text-green-300 border-green-700'
                                : svc.status === 'Partially Identified'
                                ? 'bg-yellow-900 text-yellow-300 border-yellow-700'
                                : 'bg-gray-900 text-gray-400 border-gray-700'
                            }`}
                          >
                            {svc.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <RiskBadge level={svc.riskLevel || 'Low'} />
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => setModal(svc)}
                            className="text-xs text-neon-green hover:underline flex items-center gap-1"
                          >
                            <Eye size={12} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Service Details Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-charcoal-800 border border-charcoal-500 rounded-2xl max-w-xl w-full shadow-2xl fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700 sticky top-0 bg-charcoal-800 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center">
                  <Server size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    {modal.service}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-charcoal-900 border border-charcoal-700 text-neon-green">
                      {modal.port}/{modal.protocol}
                    </span>
                  </h3>
                  <div className="text-xs text-gray-400">
                    Target: {modal.target} · Scan: {modal.scanId}
                  </div>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-charcoal-700 rounded-lg transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Product & Version Highlights */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-charcoal-900 border border-charcoal-700">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">Detected Product</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {modal.product || <span className="text-gray-500 italic">Unknown</span>}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">Software Version</span>
                  <div className="text-sm font-mono text-blue-300 font-semibold mt-0.5">
                    {modal.version && modal.version !== 'Unknown'
                      ? modal.version
                      : <span className="text-gray-500 italic font-sans font-normal">Unknown</span>}
                  </div>
                </div>
              </div>

              {/* Grid of Key Fingerprint Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Port', value: modal.port },
                  { label: 'Protocol', value: modal.protocol },
                  { label: 'Service Name', value: modal.service },
                  { label: 'Identification Status', value: modal.status || 'Unknown' },
                  { label: 'Heuristic Confidence', value: `${modal.confidence || 0}%` },
                  { label: 'Detection Method', value: modal.method === 'probed' ? 'Active Probe (-sV)' : 'Table Mapping' },
                  { label: 'Operating System', value: modal.ostype || 'None disclosed' },
                  { label: 'Extra Info', value: modal.extraInfo || 'None' },
                  { label: 'Risk Rating', value: modal.riskLevel || 'Low' },
                ].map(item => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-charcoal-900 border border-charcoal-700">
                    <div className="text-[10px] text-gray-500 uppercase">{item.label}</div>
                    <div className="text-xs text-white font-medium mt-0.5 truncate">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* CPE String */}
              {modal.cpe && (
                <div>
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Layers size={13} className="text-neon-blue" />
                    Common Platform Enumeration (CPE):
                  </div>
                  <div className="font-mono text-xs text-neon-blue bg-charcoal-900 rounded-lg px-3 py-2 border border-charcoal-700 select-all">
                    {modal.cpe}
                  </div>
                </div>
              )}

              {/* Detection Evidence */}
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Cpu size={13} className="text-neon-green" />
                  Detection Evidence & Probe Information:
                </div>
                <div className="text-xs text-gray-300 bg-charcoal-900 rounded-lg p-3 border border-charcoal-700 font-mono leading-relaxed">
                  {modal.evidence || `Method: ${modal.method || 'table'} | State: Open`}
                </div>
              </div>

              {/* Confidence Explanation */}
              {modal.confidenceExplanation && (
                <div className="p-3 rounded-lg bg-charcoal-900 border border-charcoal-700 text-xs">
                  <span className="font-semibold text-gray-300">Confidence Calculation:</span>
                  <p className="text-gray-400 mt-1 leading-relaxed">{modal.confidenceExplanation}</p>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Service Description:</div>
                <div className="text-xs text-gray-300 bg-charcoal-900 rounded-lg p-3 border border-charcoal-700 leading-relaxed">
                  {modal.description || 'Standard network service. Audit port exposure to verify necessity.'}
                </div>
              </div>

              {/* Security Advisory Notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-900 bg-opacity-20 border border-yellow-800">
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400 leading-relaxed">
                  An identified service is not automatically vulnerable. Service version fingerprinting identifies
                  exposure surface. Review the Risk Assessment module for remediation recommendations.
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
                    navigate('/risk');
                  }}
                  className="btn-secondary text-xs py-1.5"
                >
                  View Risks
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
