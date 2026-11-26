import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'neon-green', trend, trendValue }) {
  const colorMap = {
    'neon-green': { text: '#00ff88', border: 'rgba(0,255,136,0.3)', glow: '0 0 20px rgba(0,255,136,0.15)' },
    'neon-blue': { text: '#00d4ff', border: 'rgba(0,212,255,0.3)', glow: '0 0 20px rgba(0,212,255,0.15)' },
    'red': { text: '#ef4444', border: 'rgba(239,68,68,0.3)', glow: '0 0 20px rgba(239,68,68,0.15)' },
    'orange': { text: '#f97316', border: 'rgba(249,115,22,0.3)', glow: '0 0 20px rgba(249,115,22,0.15)' },
    'yellow': { text: '#eab308', border: 'rgba(234,179,8,0.3)', glow: '0 0 20px rgba(234,179,8,0.15)' },
    'green': { text: '#22c55e', border: 'rgba(34,197,94,0.3)', glow: '0 0 20px rgba(34,197,94,0.15)' },
    'purple': { text: '#a855f7', border: 'rgba(168,85,247,0.3)', glow: '0 0 20px rgba(168,85,247,0.15)' },
  };

  const c = colorMap[color] || colorMap['neon-green'];

  return (
    <div
      className="bg-charcoal-800 rounded-xl p-4 flex flex-col gap-3 hover:scale-[1.02] transition-all duration-300 cursor-default"
      style={{ border: `1px solid ${c.border}`, boxShadow: c.glow }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.text}18` }}>
            <Icon size={16} style={{ color: c.text }} />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: c.text }}>{value}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          {trend === 'up' ? <TrendingUp size={12} className="text-green-400" /> :
            trend === 'down' ? <TrendingDown size={12} className="text-red-400" /> :
              <Minus size={12} className="text-gray-500" />}
          <span className={`text-xs ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
