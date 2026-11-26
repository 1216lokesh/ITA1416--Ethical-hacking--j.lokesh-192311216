import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PortScanner from './pages/PortScanner';
import ServiceFingerprinting from './pages/ServiceFingerprinting';
import RiskAssessment from './pages/RiskAssessment';
import Recommendations from './pages/Recommendations';
import ScanHistory from './pages/ScanHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import HelpAbout from './pages/HelpAbout';

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scanner" element={<PortScanner />} />
          <Route path="/fingerprinting" element={<ServiceFingerprinting />} />
          <Route path="/risk" element={<RiskAssessment />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpAbout />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
