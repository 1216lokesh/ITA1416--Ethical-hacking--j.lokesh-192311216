import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Terminal, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';
import RiskBadge from '../components/RiskBadge';

const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function Recommendations() {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('All');
  const [history, setHistory] = useState(() => storageService.getScanHistory());

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

  const recommendationsList = useMemo(() => {
    const list = [];
    const seen = new Set();
    history.forEach(scan => {
      (scan.findingDetails || []).forEach(f => {
        const key = `${f.port}-${f.service}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `REC-${String(list.length + 1).padStart(3, '0')}`,
            title: f.title || `Remediation for ${f.service} (Port ${f.port})`,
            priority: f.riskLevel || 'Medium',
            relatedPort: f.port,
            relatedService: f.service,
            explanation: f.description || `Service ${f.service} detected on port ${f.port}.`,
            action: f.recommendation || `Audit service ${f.service} and restrict firewall access.`,
            example: `netsh advfirewall firewall add rule name="Block_${f.service}" dir=in action=block protocol=TCP localport=${f.port}`,
            scanId: scan.id,
            target: scan.target,
          });
        }
      });
    });
    return list;
  }, [history]);

  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const filtered = recommendationsList
    .filter(r => filter === 'All' || r.priority === filter)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  recommendationsList.forEach(r => counts[r.priority] = (counts[r.priority] || 0) + 1);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="card" style={{ borderColor: 'rgba(0,255,136,0.2)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
            <Lightbulb size={22} className="text-neon-green" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Security Recommendations</h2>
            <p className="text-sm text-gray-400 mt-1">
              Based on network port scan results and service fingerprinting, the following recommendations address identified security concerns.
              Implementing these measures will reduce your network's attack surface.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Bars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(counts).map(([level, count]) => (
          <div key={level} className="card text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setFilter(level)}>
            <div className="text-xl font-bold" style={{ color: level === 'Critical' ? '#ef4444' : level === 'High' ? '#f97316' : level === 'Medium' ? '#eab308' : '#22c55e' }}>{count}</div>
            <div className="text-xs text-gray-500 mt-1">{level} Priority</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {priorities.map(p => (
          <button key={p} onClick={() => setFilter(p)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${filter === p ? 'border-neon-green text-neon-green bg-neon-green bg-opacity-10' : 'border-charcoal-600 text-gray-400 hover:border-gray-500'}`}>
            {p} {p !== 'All' ? `(${counts[p] || 0})` : ''}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 card">
            <Lightbulb size={36} className="mx-auto mb-2 text-gray-700" />
            <div className="text-gray-400 font-medium">No security recommendations found</div>
            <p className="text-xs text-gray-600 mt-1">
              {recommendationsList.length === 0
                ? 'Run a network port scan to discover active services and generate remediation guidance.'
                : 'No recommendations match the selected priority filter.'}
            </p>
          </div>
        ) : (
          filtered.map((rec) => (
          <div key={rec.id} className={`card border transition-all duration-200 hover:border-opacity-70 ${rec.priority === 'Critical' ? 'border-red-800' : rec.priority === 'High' ? 'border-orange-800' : rec.priority === 'Medium' ? 'border-yellow-900' : 'border-green-900'}`}>
            <button
              className="w-full text-left"
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${rec.priority === 'Critical' ? 'bg-red-900' : rec.priority === 'High' ? 'bg-orange-900' : rec.priority === 'Medium' ? 'bg-yellow-900' : 'bg-green-900'}`}>
                    {rec.priority === 'Critical' ? <AlertTriangle size={18} className="text-red-400" /> :
                      rec.priority === 'High' ? <Shield size={18} className="text-orange-400" /> :
                        rec.priority === 'Medium' ? <Info size={18} className="text-yellow-400" /> :
                          <CheckCircle size={18} className="text-green-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">{rec.id}</span>
                      <RiskBadge level={rec.priority} />
                      {rec.relatedPort && (
                        <span className="text-xs bg-charcoal-700 text-gray-400 px-2 py-0.5 rounded-full border border-charcoal-600">Port {rec.relatedPort}</span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1">{rec.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{rec.relatedService}</p>
                  </div>
                </div>
                {expanded === rec.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </div>
            </button>

            {expanded === rec.id && (
              <div className="mt-4 pt-4 border-t border-charcoal-700 space-y-4 fade-in">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Explanation</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{rec.explanation}</p>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Corrective Action</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{rec.action}</p>
                </div>

                {rec.example && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Example Command / Configuration</div>
                    <div className="flex items-start gap-2 bg-charcoal-900 border border-charcoal-700 rounded-lg p-3">
                      <Terminal size={14} className="text-neon-green flex-shrink-0 mt-0.5" />
                      <pre className="text-xs text-neon-green font-mono whitespace-pre-wrap">{rec.example}</pre>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">⚠ Template command syntax. Adapt to your specific environment before use.</p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1">
                  <div>
                    <div className="text-xs text-gray-500">Related Service</div>
                    <div className="text-sm text-blue-400 font-medium mt-0.5">{rec.relatedService}</div>
                  </div>
                  {rec.relatedPort && (
                    <div>
                      <div className="text-xs text-gray-500">Related Port</div>
                      <div className="text-sm text-neon-green font-mono font-medium mt-0.5">{rec.relatedPort}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Priority</div>
                    <div className="mt-0.5"><RiskBadge level={rec.priority} /></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )))}
      </div>

      {/* General Advice */}
      <div className="card" style={{ borderColor: 'rgba(0,212,255,0.2)' }}>
        <h3 className="text-sm font-semibold text-neon-blue mb-3">General Security Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Conduct regular network audits and port scans on a scheduled basis.',
            'Apply the principle of least privilege to all network services.',
            'Keep all software, OS, and firmware updated with security patches.',
            'Implement network segmentation to isolate sensitive systems.',
            'Enable centralized logging and monitor logs for suspicious activity.',
            'Use multi-factor authentication for all administrative access.',
            'Encrypt all data in transit using TLS 1.2+ or SSH.',
            'Develop and test an Incident Response Plan.',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle size={14} className="text-neon-green flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-400">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
