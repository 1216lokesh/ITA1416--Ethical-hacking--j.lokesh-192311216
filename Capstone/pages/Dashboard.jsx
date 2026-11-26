import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scan, Server, ShieldAlert, TrendingUp, AlertCircle, CheckCircle,
  Activity, Zap, Eye, ChevronRight, Shield, Globe
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import RiskBadge from '../components/RiskBadge';
import { storageService } from '../services/storageService';
import { backendService } from '../services/scanService';

const COLORS = ['#00ff88', '#ef4444', '#f97316'];
const RISK_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-charcoal-800 border border-charcoal-600 rounded-lg px-3 py-2 text-xs shadow-lg">
        {label && <p className="text-gray-400 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => storageService.getScanHistory());
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchBackendData = async () => {
      const h = await backendService.checkHealth();
      if (!mounted) return;
      setHealth(h);

      if (h.available) {
        try {
          const scans = await backendService.getScans(true);
          if (mounted && scans && scans.length > 0) {
            setHistory(scans);
            storageService.syncWithBackend(scans);
          }
        } catch (e) {
          console.warn('Could not load scans from backend:', e.message);
        }
      }
    };

    fetchBackendData();
    const interval = setInterval(fetchBackendData, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const totalScans = history.length;
    const totalPortsScanned = history.reduce((a, s) => a + (s.totalPorts || 0), 0);
    const totalOpen = history.reduce((a, s) => a + (s.openPorts || 0), 0);
    const services = history.reduce((a, s) => a + ((s.services || []).length), 0);
    const findings = history.reduce((a, s) => a + ((s.findingDetails || []).length), 0);
    const critical = history.reduce((a, s) => a + ((s.findingDetails || []).filter(f => f.riskLevel === 'Critical').length), 0);
    return { totalScans, totalPortsScanned, totalOpen, services, findings, critical };
  }, [history]);

  const portStateData = useMemo(() => {
    const totOpen = history.reduce((a, s) => a + (s.openPorts || 0), 0);
    const totClosed = history.reduce((a, s) => a + (s.closedPorts || 0), 0);
    const totFiltered = history.reduce((a, s) => a + (s.filteredPorts || 0), 0);
    return [
      { name: 'Open', value: totOpen, color: '#00ff88' },
      { name: 'Closed', value: totClosed, color: '#6b7280' },
      { name: 'Filtered', value: totFiltered, color: '#f97316' },
    ];
  }, [history]);

  const riskData = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    history.forEach(s => (s.findingDetails || []).forEach(f => { counts[f.riskLevel] = (counts[f.riskLevel] || 0) + 1; }));
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: RISK_COLORS[name] }));
  }, [history]);

  const serviceData = useMemo(() => {
    const svcMap = {};
    history.forEach(s => (s.services || []).forEach(sv => { svcMap[sv.service] = (svcMap[sv.service] || 0) + 1; }));
    return Object.entries(svcMap).map(([name, count]) => ({ name, count })).slice(0, 6);
  }, [history]);

  const activityData = useMemo(() => {
    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[key] = 0;
    }
    history.forEach(s => {
      const d = new Date(s.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (days[key] !== undefined) days[key]++;
    });
    return Object.entries(days).map(([date, scans]) => ({ date, scans }));
  }, [history]);

  const recentScans = history.slice(0, 4);
  const recentFindings = history.flatMap(s => (s.findingDetails || []).map(f => ({ ...f, scanId: s.id, target: s.target }))).slice(0, 5);

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="rounded-xl p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0d1225 0%, #1a2235 100%)', border: '1px solid rgba(0,255,136,0.2)' }}>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Network Security Dashboard</h2>
          <p className="text-sm text-gray-400">Network Port Scanning, Service Fingerprinting & Risk Prioritization System</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${health?.available && health?.nmapAvailable ? 'bg-neon-green' : 'bg-yellow-400'}`}></div>
            {health?.available && health?.nmapAvailable ? (
              <span className="text-xs text-neon-green font-semibold">
                System Active — 🔍 REAL SCAN MODE (Nmap {health.nmapVersion?.split(' ')[2] || '7.80'})
              </span>
            ) : health?.available ? (
              <span className="text-xs text-orange-400 font-semibold">
                Backend Online — Nmap Missing
              </span>
            ) : (
              <span className="text-xs text-yellow-400 font-semibold">
                Backend Offline — Showing Cached Scan Records
              </span>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/scanner')} className="btn-primary flex items-center gap-2 text-sm">
            <Scan size={16} /> New Scan
          </button>
          <button onClick={() => navigate('/reports')} className="btn-secondary flex items-center gap-2 text-sm">
            <Eye size={16} /> Reports
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Scans" value={stats.totalScans} icon={Scan} color="neon-blue" subtitle="All time" />
        <StatCard title="Ports Scanned" value={stats.totalPortsScanned.toLocaleString()} icon={Globe} color="neon-green" subtitle="Total" />
        <StatCard title="Open Ports" value={stats.totalOpen} icon={Activity} color="green" subtitle="Across scans" />
        <StatCard title="Identified Services" value={stats.services} icon={Server} color="neon-blue" subtitle="Fingerprinted" />
        <StatCard title="Total Findings" value={stats.findings} icon={ShieldAlert} color="orange" subtitle="Risk items" />
        <StatCard title="Critical Risks" value={stats.critical} icon={AlertCircle} color="red" subtitle="High priority" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Port State Distribution" subtitle="Open / Closed / Filtered">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={portStateData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {portStateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Level Distribution" subtitle="Findings by risk category">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Service Distribution" subtitle="Detected service types">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serviceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Scan Activity Line Chart */}
      <ChartCard title="Scan Activity (Last 7 Days)" subtitle="Daily scan count">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={activityData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="scans" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 4 }} name="Scans" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Scans */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Scan Activity</h3>
            <button onClick={() => navigate('/history')} className="text-xs text-neon-green hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentScans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No scans yet. Start your first scan!</p>
            ) : recentScans.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-charcoal-900 rounded-lg border border-charcoal-700 hover:border-charcoal-500 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
                    <Scan size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{s.target}</div>
                    <div className="text-xs text-gray-500">{s.id} · {new Date(s.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <RiskBadge level={s.riskLevel} />
              </div>
            ))}
          </div>
        </div>

        {/* Latest Findings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Latest Security Findings</h3>
            <button onClick={() => navigate('/risk')} className="text-xs text-neon-green hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentFindings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No findings yet.</p>
            ) : recentFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-charcoal-900 rounded-lg border border-charcoal-700">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${f.riskLevel === 'Critical' ? 'bg-red-500' : f.riskLevel === 'High' ? 'bg-orange-500' : f.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{f.title}</div>
                  <div className="text-xs text-gray-500">{f.service} · Port {f.port} · {f.scanId}</div>
                </div>
                <RiskBadge level={f.riskLevel} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Start New Scan', icon: Scan, path: '/scanner', color: '#00ff88' },
            { label: 'View Findings', icon: ShieldAlert, path: '/risk', color: '#ef4444' },
            { label: 'Generate Report', icon: Eye, path: '/reports', color: '#00d4ff' },
            { label: 'Recommendations', icon: CheckCircle, path: '/recommendations', color: '#22c55e' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-charcoal-600 hover:border-opacity-50 transition-all duration-200 bg-charcoal-900 hover:bg-charcoal-800 group"
              style={{ '--hover-color': a.color }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                style={{ background: `${a.color}18`, border: `1px solid ${a.color}40` }}>
                <a.icon size={20} style={{ color: a.color }} />
              </div>
              <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Security Insight', icon: Zap, color: '#eab308', text: 'Database ports (3306) exposed to the network present a high-risk attack vector. Restrict with firewall rules immediately.' },
          { title: 'Best Practice', icon: Shield, color: '#00d4ff', text: 'Use encrypted protocols (HTTPS, SSH, SFTP) instead of plaintext alternatives (HTTP, FTP) to protect data in transit.' },
          { title: 'Compliance Note', icon: CheckCircle, color: '#00ff88', text: 'Regular port scanning helps maintain network visibility and is part of a proactive security monitoring program.' },
        ].map((insight, i) => (
          <div key={i} className="card" style={{ borderColor: `${insight.color}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <insight.icon size={16} style={{ color: insight.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: insight.color }}>{insight.title}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
