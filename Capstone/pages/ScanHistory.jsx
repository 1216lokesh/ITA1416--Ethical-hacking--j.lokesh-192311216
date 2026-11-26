import React, { useState, useEffect, useMemo } from 'react';
import { History, Trash2, Eye, X, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';
import RiskBadge, { PortStateBadge } from '../components/RiskBadge';
import { useNavigate } from 'react-router-dom';

export default function ScanHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => storageService.getScanHistory());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const refresh = async () => {
    try {
      const scans = await backendService.getScans(true);
      if (scans && scans.length > 0) {
        setHistory(scans);
        storageService.syncWithBackend(scans);
        return;
      }
    } catch (e) {
      // fallback
    }
    setHistory(storageService.getScanHistory());
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...history];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(s =>
        s.target.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.hostname || '').toLowerCase().includes(q) ||
        (s.batchId || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'All') arr = arr.filter(s => s.status === filterStatus);
    if (filterRisk !== 'All') arr = arr.filter(s => s.riskLevel === filterRisk);
    arr.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'date') { va = new Date(va); vb = new Date(vb); }
      else if (sortBy === 'openPorts' || sortBy === 'totalPorts') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [history, search, filterStatus, filterRisk, sortBy, sortDir]);

  const handleDelete = (id) => {
    const updated = storageService.deleteScan(id);
    setHistory(updated);
    setDeleteConfirm(null);
    if (modal?.id === id) setModal(null);
  };

  const handleClearAll = () => {
    storageService.clearScanHistory();
    setHistory([]);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search scans..." value={search} onChange={e => setSearch(e.target.value)}
                className="input-field pl-8 w-44 text-xs" />
            </div>
            {/* Filter Risk */}
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(r => (
              <button key={r} onClick={() => setFilterRisk(r)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterRisk === r ? 'border-neon-green text-neon-green bg-neon-green bg-opacity-10' : 'border-charcoal-600 text-gray-400 hover:border-gray-500'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setDeleteConfirm('all')} className="btn-danger flex items-center gap-1.5 text-xs py-1.5">
              <Trash2 size={13} /> Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: history.length, color: '#00d4ff' },
          { label: 'Completed', value: history.filter(s => s.status === 'Completed').length, color: '#00ff88' },
          { label: 'Showing', value: filtered.length, color: '#a855f7' },
          { label: 'Critical Risk', value: history.filter(s => s.riskLevel === 'Critical').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Scan History ({filtered.length})</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            Sort by:
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select-field text-xs py-1 w-28">
              <option value="date">Date</option>
              <option value="target">Target</option>
              <option value="openPorts">Open Ports</option>
              <option value="riskLevel">Risk</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="text-gray-400 hover:text-white px-2 py-1 rounded border border-charcoal-600 hover:border-gray-500">
              {sortDir === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <History size={40} className="text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400 font-medium">No scan records found</div>
            <p className="text-gray-600 text-sm mt-1">Run a scan from the Network Port Scanner to populate history</p>
            <button onClick={() => navigate('/scanner')} className="btn-primary mt-4 text-sm">Start First Scan</button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-charcoal-700">
            <table className="w-full">
              <thead>
                <tr>
                  {['Scan ID', 'Target IP', 'Date', 'Scan Type', 'Total Ports', 'Open', 'Risk', 'Status', 'Actions'].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(scan => (
                  <tr key={scan.id} className="table-row">
                    <td className="table-cell font-mono text-xs text-neon-green">
                      <div>{scan.id}</div>
                      {scan.batchId && (
                        <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{scan.batchId}</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-white">{scan.target}</div>
                      {scan.hostname && <div className="text-xs text-gray-500">{scan.hostname}</div>}
                    </td>
                    <td className="table-cell text-xs text-gray-400">{new Date(scan.date).toLocaleString()}</td>
                    <td className="table-cell text-xs text-gray-300">{scan.scanType}</td>
                    <td className="table-cell text-center">{scan.totalPorts.toLocaleString()}</td>
                    <td className="table-cell text-center text-neon-green font-semibold">{scan.openPorts}</td>
                    <td className="table-cell"><RiskBadge level={scan.riskLevel} /></td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${scan.status === 'Completed' ? 'bg-green-900 text-green-300 border-green-700' : 'bg-gray-900 text-gray-400 border-gray-700'}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal(scan)} className="text-xs text-neon-green hover:underline flex items-center gap-1">
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => setDeleteConfirm(scan.id)} className="text-xs text-red-400 hover:underline flex items-center gap-1">
                          <Trash2 size={12} /> Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-charcoal-800 border border-charcoal-500 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto fade-in">
            <div className="flex items-center justify-between p-5 border-b border-charcoal-700 sticky top-0 bg-charcoal-800 z-10">
              <div>
                <h3 className="text-base font-semibold text-white">{modal.id} — Scan Details</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{modal.target}</span>
                  <RiskBadge level={modal.riskLevel} />
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-charcoal-700 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Summary Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Ports', value: modal.totalPorts, color: '#00d4ff' },
                  { label: 'Open', value: modal.openPorts, color: '#00ff88' },
                  { label: 'Closed', value: modal.closedPorts, color: '#6b7280' },
                  { label: 'Filtered', value: modal.filteredPorts, color: '#f97316' },
                  { label: 'Duration', value: modal.duration, color: '#a855f7' },
                  { label: 'Findings', value: modal.findings || (modal.findingDetails || []).length, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-charcoal-900 rounded-lg">
                    <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Ports */}
              {modal.ports && modal.ports.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Port Results</h4>
                  <div className="overflow-x-auto rounded-lg border border-charcoal-700">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {['Port', 'Protocol', 'State', 'Service'].map(h => <th key={h} className="table-header text-left">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {modal.ports.map((p, i) => (
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
              )}

              {/* Findings */}
              {modal.findingDetails && modal.findingDetails.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Risk Findings</h4>
                  <div className="space-y-2">
                    {modal.findingDetails.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-charcoal-900 rounded-lg border border-charcoal-700">
                        <div>
                          <div className="text-sm text-white">{f.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Port {f.port} · {f.service}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RiskBadge level={f.riskLevel} />
                          <span className="text-xs text-gray-500">{f.score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { setDeleteConfirm(modal.id); }} className="btn-danger flex items-center gap-2 text-sm w-full justify-center">
                <Trash2 size={14} /> Delete This Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-charcoal-800 border border-red-800 rounded-2xl max-w-sm w-full p-6 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400" />
              <h3 className="text-base font-semibold text-white">Confirm Delete</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              {deleteConfirm === 'all'
                ? 'Are you sure you want to delete ALL scan history? This action cannot be undone.'
                : `Are you sure you want to delete scan ${deleteConfirm}? This cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteConfirm === 'all' ? handleClearAll() : handleDelete(deleteConfirm)}
                className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
