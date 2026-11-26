import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scan, Server, ShieldAlert, Lightbulb,
  History, FileText, Settings, HelpCircle, ChevronLeft, ChevronRight,
  Shield, Wifi
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
  { path: '/scanner', label: 'Network Port Scanner', icon: Scan },
  { path: '/fingerprinting', label: 'Service Fingerprinting', icon: Server },
  { path: '/risk', label: 'Risk Assessment', icon: ShieldAlert },
  { path: '/recommendations', label: 'Security Recommendations', icon: Lightbulb },
  { path: '/history', label: 'Scan History', icon: History },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/help', label: 'Help & About', icon: HelpCircle },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #0d1225 0%, #0a0e1a 100%)', borderRight: '1px solid #1f2937' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-charcoal-700">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', boxShadow: '0 0 15px rgba(0,255,136,0.4)' }}>
          <Shield size={16} className="text-navy-900" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-lg" style={{ color: '#00ff88', textShadow: '0 0 10px rgba(0,255,136,0.5)' }}>NetSecure</span>
            <div className="text-xs text-gray-500">Security Dashboard</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <NavLink
              key={path}
              to={path}
              className={active ? 'sidebar-link-active' : 'sidebar-link'}
              title={collapsed ? label : ''}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green"></div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-charcoal-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
            <span>System Active</span>
          </div>
          <div className="mt-1 text-xs text-gray-500 font-mono">v1.0.0 | NetSecure Engine</div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-charcoal-500 flex items-center justify-center hover:border-neon-green transition-colors z-50"
        style={{ background: '#141924' }}
      >
        {collapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronLeft size={12} className="text-gray-400" />}
      </button>
    </aside>
  );
}
