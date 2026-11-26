import React, { useState, useEffect } from 'react';
import { Bell, Search, User, Wifi, ChevronDown, Shield } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { backendService } from '../services/scanService';

const pageNames = {
  '/': 'Overview Dashboard',
  '/scanner': 'Network Port Scanner',
  '/fingerprinting': 'Service Fingerprinting',
  '/risk': 'Risk Assessment',
  '/recommendations': 'Security Recommendations',
  '/history': 'Scan History',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help & About',
};

export default function Topbar() {
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [health, setHealth] = useState(null);
  const pageName = pageNames[location.pathname] || 'NetSecure';

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const h = await backendService.checkHealth();
      if (mounted) setHealth(h);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const notifications = [
    { id: 1, msg: 'Scan SCAN-001 completed', time: '2m ago', type: 'success' },
    { id: 2, msg: 'Critical finding: MySQL exposed', time: '5m ago', type: 'critical' },
    { id: 3, msg: 'New recommendation available', time: '10m ago', type: 'info' },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 h-14 z-30 flex items-center justify-between px-6 border-b border-charcoal-700"
      style={{ background: 'rgba(10, 14, 26, 0.95)', backdropFilter: 'blur(12px)' }}>
      
      {/* Page Title */}
      <div className="flex items-center gap-3 ml-64">
        <h1 className="text-base font-semibold text-white">{pageName}</h1>
        {health?.available && health?.nmapAvailable ? (
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-600 text-neon-green bg-green-900 bg-opacity-20 font-medium">
            REAL SCAN
          </span>
        ) : health?.available ? (
          <span className="text-xs px-2 py-0.5 rounded-full border border-orange-600 text-orange-400 bg-orange-900 bg-opacity-20 font-medium">
            NMAP MISSING
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-700 text-yellow-400 bg-yellow-900 bg-opacity-20 font-medium">
            OFFLINE
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={14} className="absolute left-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-charcoal-800 border border-charcoal-600 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-300 w-48 focus:outline-none focus:border-neon-green transition-colors"
          />
        </div>

        {/* System Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-charcoal-800 border border-charcoal-600">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
          <span className="text-xs text-gray-300">System Online</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
            className="relative p-2 rounded-lg hover:bg-charcoal-700 transition-colors"
          >
            <Bell size={18} className="text-gray-400 hover:text-neon-green transition-colors" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          </button>

          {showNotif && (
            <div className="absolute right-0 top-10 w-72 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-card z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-charcoal-700 text-sm font-semibold text-white">Notifications</div>
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3 border-b border-charcoal-700 hover:bg-charcoal-700 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'critical' ? 'bg-red-500' : n.type === 'success' ? 'bg-neon-green' : 'bg-blue-400'}`}></div>
                    <div>
                      <p className="text-sm text-gray-200">{n.msg}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowUser(!showUser); setShowNotif(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-charcoal-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)' }}>
              <span className="text-navy-900">SA</span>
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-gray-200">Security Analyst</div>
            </div>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-10 w-48 bg-charcoal-800 border border-charcoal-600 rounded-xl shadow-card z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-charcoal-700">
                <div className="text-sm font-semibold text-white">Security Analyst</div>
                <div className="text-xs text-gray-500">analyst@netsecure.local</div>
              </div>
              <div className="p-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-charcoal-700 rounded-lg">Profile Settings</button>
                <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-charcoal-700 rounded-lg">Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
