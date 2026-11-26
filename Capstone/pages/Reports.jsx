import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, X, AlertTriangle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';
import { reportService } from '../services/reportService';
import RiskBadge from '../components/RiskBadge';
import { PortStateBadge } from '../components/RiskBadge';

export default function Reports() {
  const [history, setHistory] = useState(() => storageService.getScanHistory());
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(false);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const scans = await backendService.getScans(true);
        if (mounted && scans && scans.length > 0) {
          setHistory(scans);
          storageService.syncWithBackend(scans);
        }
      } catch (e) {
        // fallback
      }
    };
    load();
  }, []);

  const handleGeneratePDF = async (scan) => {
    setGenerating('pdf');
    try {
      reportService.generatePDF(scan);
    } catch (e) {
      alert('PDF generation failed: ' + e.message);
    } finally {
      setGenerating(null);
    }
  };

  const handleExportCSV = (scan) => {
    setGenerating('csv');
    try {
      reportService.generateCSV(scan);
    } catch (e) {
      alert('CSV export failed: ' + e.message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Instructions */}
      <div className="card" style={{ borderColor: 'rgba(0,212,255,0.2)' }}>
        <div className="flex items-start gap-4">
          <FileText size={22} className="text-neon-blue flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-white">Reports & Export</h2>
            <p className="text-sm text-gray-400 mt-1">
              Select a scan from the list below to generate a comprehensive security report.
              Reports include scan results, service fingerprinting, risk assessment, and recommendations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan List */}
        <div className="card lg:col-span-1">
          <h3 className="text-sm font-semibold text-white mb-4">Select Scan</h3>
          {history.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FileText size={36} className="mx-auto mb-2 text-gray-700" />
              <p className="text-sm">No scans available</p>
              <p className="text-xs mt-1">Run a scan first to generate reports</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(scan => (
                <button
                  key={scan.id}
                  onClick={() => { setSelected(scan); setPreview(false); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${selected?.id === scan.id ? 'border-neon-green bg-neon-green bg-opacity-5' : 'border-charcoal-700 hover:border-charcoal-500 bg-charcoal-900'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">{scan.id}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{scan.target}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{new Date(scan.date).toLocaleDateString()}</div>
                    </div>
                    <RiskBadge level={scan.riskLevel} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Report Panel */}
        <div className="card lg:col-span-2">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText size={48} className="mb-4 text-gray-700" />
              <p className="font-medium">No scan selected</p>
              <p className="text-sm mt-1">Select a scan from the left panel to view report options</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <h3 className="text-base font-semibold text-white">Report — {selected.id}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-400">{selected.target}</span>
                  <RiskBadge level={selected.riskLevel} />
                  <span className="text-xs text-gray-500">{new Date(selected.date).toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Open Ports', value: selected.openPorts, color: '#00ff88' },
                  { label: 'Services', value: (selected.services || []).length, color: '#00d4ff' },
                  { label: 'Findings', value: (selected.findingDetails || []).length, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-charcoal-900 rounded-lg border border-charcoal-700">
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setPreview(!preview)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Eye size={16} /> {preview ? 'Hide Preview' : 'Preview Report'}
                </button>
                <button
                  onClick={() => handleGeneratePDF(selected)}
                  disabled={generating === 'pdf'}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {generating === 'pdf' ? (
                    <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin"></div> Generating...</>
                  ) : (
                    <><Download size={16} /> Download PDF</>
                  )}
                </button>
                <button
                  onClick={() => handleExportCSV(selected)}
                  disabled={generating === 'csv'}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {generating === 'csv' ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> Exporting...</>
                  ) : (
                    <><Download size={16} /> Export CSV</>
                  )}
                </button>
              </div>

              {selected?.isRealScan ? (
                <div className="flex items-center gap-2 text-xs text-neon-green p-3 bg-green-900 bg-opacity-20 rounded-lg border border-green-800">
                  <span className="font-semibold">🔍 Real Nmap Scan Report:</span> Target {selected.target} ({selected.openPorts} open ports, {selected.riskLevel} Risk).
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400 p-3 bg-charcoal-900 rounded-lg border border-charcoal-700">
                  <span className="font-semibold text-gray-300">📋 Stored Scan Record:</span> Target {selected?.target} ({selected?.openPorts} open ports, {selected?.riskLevel} Risk).
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="border border-charcoal-600 rounded-xl overflow-hidden fade-in">
                  <div className="p-4" style={{ background: '#0d1225' }}>
                    <div className="text-center border-b border-charcoal-700 pb-4 mb-4">
                      <div className="text-lg font-bold" style={{ color: '#00ff88' }}>NetSecure</div>
                      <div className="text-sm text-white mt-0.5">Network Security Assessment Report</div>
                      <div className="text-xs text-gray-500 mt-0.5">Network Port Scanning, Service Fingerprinting, and Risk Prioritization System</div>
                      <div className="text-xs text-gray-500 mt-2">Generated: {new Date().toLocaleString()} · Report ID: {selected.id}</div>
                    </div>

                    {/* Target Info */}
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-neon-green uppercase tracking-wider mb-2">Target Information</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          ['Scan ID', selected.id], ['Target IP', selected.target],
                          ['Hostname', selected.hostname || 'N/A'], ['Scan Type', selected.scanType],
                          ['Scan Date', new Date(selected.date).toLocaleString()], ['Duration', selected.duration],
                          ['Risk Level', selected.riskLevel], ['Status', selected.status],
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-gray-500 w-24 flex-shrink-0">{k}:</span>
                            <span className="text-gray-200 font-medium">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Port Results Preview */}
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-neon-green uppercase tracking-wider mb-2">Port Scanning Results</div>
                      <div className="overflow-x-auto rounded-lg border border-charcoal-700">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              {['Port', 'Protocol', 'State', 'Service'].map(h => <th key={h} className="table-header text-left">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {(selected.ports || []).slice(0, 6).map((p, i) => (
                              <tr key={i} className="table-row">
                                <td className="table-cell font-mono text-neon-green">{p.port}</td>
                                <td className="table-cell text-gray-400">{p.protocol}</td>
                                <td className="table-cell"><PortStateBadge state={p.state} /></td>
                                <td className="table-cell">{p.service}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Findings Preview */}
                    <div>
                      <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Risk Assessment Findings</div>
                      <div className="space-y-2">
                        {(selected.findingDetails || []).slice(0, 4).map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-charcoal-800 rounded-lg border border-charcoal-700">
                            <div className="text-xs text-gray-300">{f.title}</div>
                            <div className="flex items-center gap-2">
                              <RiskBadge level={f.riskLevel} />
                              <span className="text-xs text-gray-500">{f.score}/100</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
