import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#0a0e1a' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Topbar />
      <main
        className="transition-all duration-300 pt-14 min-h-screen"
        style={{ marginLeft: collapsed ? '64px' : '256px' }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
