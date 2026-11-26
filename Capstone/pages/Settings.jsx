import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Scan, FileText, Info, Save, CheckCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

export default function Settings() {
  const [settings, setSettings] = useState(() => storageService.getSettings());
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const save = () => {
    storageService.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const update = (section, key, value) => {
    setSettings(s => ({ ...s, [section]: { ...s[section], [key]: value } }));
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'scan', label: 'Scan Preferences', icon: Scan },
    { id: 'report', label: 'Report Preferences', icon: FileText },
    { id: 'about', label: 'App Information', icon: Info },
  ];

  return (
    <div className="space-y-6 fade-in">
      {saved && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-700 bg-green-900 bg-opacity-30 text-green-300">
          <CheckCircle size={18} />
          <span className="text-sm">Settings saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="card md:col-span-1 h-fit">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-neon-green bg-opacity-10 text-neon-green border border-neon-green border-opacity-30' : 'text-gray-400 hover:text-white hover:bg-charcoal-700'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="card md:col-span-3">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-white">User Profile</h3>
              <div className="flex items-center gap-4 p-4 bg-charcoal-900 rounded-xl border border-charcoal-700">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-navy-900"
                  style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)' }}>SA</div>
                <div>
                  <div className="text-white font-semibold">{settings.profile.name}</div>
                  <div className="text-xs text-gray-500">{settings.profile.email}</div>
                  <div className="text-xs text-neon-green mt-0.5">{settings.profile.role}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Your name' },
                  { key: 'email', label: 'Email Address', placeholder: 'your@email.com' },
                  { key: 'role', label: 'Role / Title', placeholder: 'Security Analyst' },
                  { key: 'organization', label: 'Organization', placeholder: 'Organization name' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-400 mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={f.placeholder}
                      value={settings.profile[f.key] || ''}
                      onChange={e => update('profile', f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-white">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'scanComplete', label: 'Scan Complete', desc: 'Notify when a scan finishes' },
                  { key: 'criticalFindings', label: 'Critical Findings', desc: 'Alert for critical risk findings' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Send weekly summary report' },
                  { key: 'emailAlerts', label: 'Email Alerts', desc: 'Send security alerts via email notification' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-charcoal-900 rounded-xl border border-charcoal-700">
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only" checked={settings.notifications[item.key] || false}
                        onChange={e => update('notifications', item.key, e.target.checked)} />
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.notifications[item.key] ? 'bg-neon-green' : 'bg-charcoal-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.notifications[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan Preferences */}
          {activeTab === 'scan' && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-white">Scan Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Default Scan Type</label>
                  <select className="select-field" value={settings.scanPreferences.defaultScanType}
                    onChange={e => update('scanPreferences', 'defaultScanType', e.target.value)}>
                    {['TCP Connect Scan', 'Common Ports Scan', 'Custom Port Scan'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Default Port Range</label>
                  <select className="select-field" value={settings.scanPreferences.defaultPortRange}
                    onChange={e => update('scanPreferences', 'defaultPortRange', e.target.value)}>
                    {['1-1024', '1-65535', '80,443,22,3306'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Scan Timeout (seconds)</label>
                  <input type="number" className="input-field" value={settings.scanPreferences.scanTimeout}
                    onChange={e => update('scanPreferences', 'scanTimeout', Number(e.target.value))} min={5} max={120} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Max Retries</label>
                  <input type="number" className="input-field" value={settings.scanPreferences.maxRetries}
                    onChange={e => update('scanPreferences', 'maxRetries', Number(e.target.value))} min={0} max={10} />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-charcoal-900 rounded-xl border border-charcoal-700">
                <div>
                  <div className="text-sm font-medium text-white">Save Scan History</div>
                  <div className="text-xs text-gray-500 mt-0.5">Automatically save completed scans to history</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={settings.scanPreferences.saveHistory || false}
                    onChange={e => update('scanPreferences', 'saveHistory', e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.scanPreferences.saveHistory ? 'bg-neon-green' : 'bg-charcoal-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.scanPreferences.saveHistory ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Report Preferences */}
          {activeTab === 'report' && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-white">Report Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Company / Organization Name</label>
                  <input type="text" className="input-field" value={settings.reportPreferences.companyName}
                    onChange={e => update('reportPreferences', 'companyName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Default Export Format</label>
                  <select className="select-field" value={settings.reportPreferences.defaultFormat}
                    onChange={e => update('reportPreferences', 'defaultFormat', e.target.value)}>
                    {['PDF', 'CSV'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              {[
                { key: 'includeCharts', label: 'Include Charts', desc: 'Embed charts in PDF reports' },
                { key: 'includeRecommendations', label: 'Include Recommendations', desc: 'Add security recommendations section' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-charcoal-900 rounded-xl border border-charcoal-700">
                  <div>
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={settings.reportPreferences[item.key] || false}
                      onChange={e => update('reportPreferences', item.key, e.target.checked)} />
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.reportPreferences[item.key] ? 'bg-neon-green' : 'bg-charcoal-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.reportPreferences[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* App Info */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-white">Application Information</h3>
              <div className="p-5 bg-charcoal-900 rounded-xl border border-charcoal-700">
                <div className="text-2xl font-bold mb-1" style={{ color: '#00ff88' }}>NetSecure</div>
                <div className="text-sm text-gray-400">Network Security Dashboard</div>
                <div className="mt-4 space-y-2 text-sm">
                  {[
                    ['Version', '1.0.0'],
                    ['Build Mode', 'Academic Capstone Project'],
                    ['Framework', 'React 18 + Vite'],
                    ['Styling', 'Tailwind CSS'],
                    ['Charts', 'Recharts'],
                    ['Storage', 'LocalStorage'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-gray-500 w-32">{k}:</span>
                      <span className="text-gray-200">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-charcoal-900 rounded-xl border border-charcoal-700">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Title</div>
                <div className="text-sm text-white">{settings.appInfo.projectTitle}</div>
                <div className="text-xs text-gray-500 mt-2">{settings.appInfo.author}</div>
              </div>
              <div className="p-4 rounded-xl border border-yellow-800 bg-yellow-900 bg-opacity-20">
                <div className="text-sm font-semibold text-yellow-300 mb-2">⚠ Disclaimer</div>
                <p className="text-xs text-yellow-500 leading-relaxed">
                  NetSecure is an academic network security assessment application developed for authorized network scanning, service fingerprinting, risk assessment, and security recommendations. Scans are executed using the integrated Nmap engine against explicitly authorized targets. Risk scores are generated using a rule-based assessment methodology and do not represent official CVSS scores. Scan findings indicate potential network exposure and do not automatically confirm exploitable vulnerabilities. Use this application only on systems and networks for which you have explicit authorization.
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          {activeTab !== 'about' && (
            <div className="mt-6 pt-4 border-t border-charcoal-700">
              <button onClick={save} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={16} /> Save Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
