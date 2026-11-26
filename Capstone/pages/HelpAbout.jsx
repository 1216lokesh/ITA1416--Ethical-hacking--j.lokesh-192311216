import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Shield, Scan, Server, ShieldAlert, ArrowDown } from 'lucide-react';

const faqs = [
  {
    q: 'What is Network Port Scanning?',
    a: `Network port scanning is a technique used to discover open network ports on a target host. 
    Ports are logical communication endpoints — numbered 0 to 65535. Services like web servers, SSH, and databases 
    listen on specific ports (HTTP=80, SSH=22, MySQL=3306). 
    
    By probing ports, security professionals can identify which services are running and exposed on a system. 
    Port scanning is a foundational technique in network security assessments and penetration testing.
    
    Common scan types include TCP Connect (completes the 3-way handshake), SYN Scan (half-open scan), and UDP scanning.`,
    icon: Scan,
    color: '#00ff88',
  },
  {
    q: 'What is Service Fingerprinting?',
    a: `Service fingerprinting (also called banner grabbing or version detection) is the process of identifying 
    the specific software and version running behind an open port. 
    
    For example, once a port scanner finds port 80 open, service fingerprinting can determine it is running 
    Apache 2.4.58 or Nginx 1.24.0. This information is obtained by analyzing the service's response banner, 
    HTTP headers, TLS certificate details, or specific protocol behavior patterns.
    
    Version information helps security teams identify potentially outdated or vulnerable software versions.`,
    icon: Server,
    color: '#00d4ff',
  },
  {
    q: 'What is Risk Assessment?',
    a: `Risk assessment is the structured process of identifying, analyzing, and evaluating security findings 
    discovered during a network scan. Not every open port represents a vulnerability — risk assessment 
    provides context and prioritizes findings based on severity.
    
    This system uses a Rule-Based Security Assessment System (0–100):
    • Critical (80–100): Severe risk, immediate action required
    • High (60–79): Significant risk, address urgently  
    • Medium (30–59): Moderate risk, plan remediation
    • Low (0–29): Minor risk, monitor and address when possible
    
    Factors include service exposure, accessibility, version information, and security configuration concerns.`,
    icon: ShieldAlert,
    color: '#ef4444',
  },
  {
    q: 'Why is Network Security Important?',
    a: `Network security protects digital assets, sensitive data, and system availability from unauthorized access 
    and cyberattacks. Without proper network security:
    
    • Attackers can exploit exposed services to gain unauthorized access
    • Sensitive data (customer info, financial records) can be stolen
    • Systems can be compromised for ransomware attacks
    • Business operations can be disrupted by denial-of-service attacks
    • Regulatory compliance (GDPR, HIPAA, PCI-DSS) can be violated
    
    Regular network scanning and security assessments help organizations maintain visibility into their attack 
    surface and proactively address vulnerabilities before attackers can exploit them.`,
    icon: Shield,
    color: '#a855f7',
  },
  {
    q: 'Why is Authorization Required Before Scanning?',
    a: `Performing port scans or network reconnaissance without explicit written authorization is illegal in 
    most jurisdictions, including under the Computer Fraud and Abuse Act (CFAA) in the USA, and similar laws worldwide.
    
    Even scanning your own company's network requires proper authorization documented through a formal 
    "Rules of Engagement" or "Scope of Authorization" document.
    
    Key principles:
    • Always obtain written permission before scanning any network
    • Define the scope clearly — which IPs, ports, and timeframes are authorized
    • Unauthorized scanning can be treated as a cyberattack
    • Ethical hackers and penetration testers operate strictly within authorized scope
    
    NetSecure executes network scanning strictly against authorized targets using the integrated Nmap engine.`,
    icon: HelpCircle,
    color: '#eab308',
  },
];

const workflowSteps = [
  { label: 'Target Input', desc: 'Provide IP address / hostname and confirm authorization', icon: '🎯', color: '#00d4ff' },
  { label: 'Network Port Scanning', desc: 'Probe network ports to discover open, closed, and filtered ports', icon: '🔍', color: '#00ff88' },
  { label: 'Service Fingerprinting', desc: 'Identify service names, vendors, and software versions', icon: '🖥️', color: '#a855f7' },
  { label: 'Risk Assessment', desc: 'Evaluate findings and assign risk scores based on exposure factors', icon: '⚠️', color: '#f97316' },
  { label: 'Dashboard & Reports', desc: 'Visualize results, generate PDF/CSV reports, and act on recommendations', icon: '📊', color: '#ef4444' },
];

export default function HelpAbout() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="space-y-8 fade-in">
      {/* Hero */}
      <div className="card text-center py-8" style={{ background: 'linear-gradient(135deg, #0d1225 0%, #1a2235 100%)', borderColor: 'rgba(0,255,136,0.2)' }}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', boxShadow: '0 0 25px rgba(0,255,136,0.4)' }}>
          <Shield size={28} className="text-navy-900" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">NetSecure</h2>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          Network Port Scanning, Service Fingerprinting, and Risk Prioritization System
        </p>
        <p className="text-xs text-gray-600 mt-2">Ethical Hacking Capstone Project · Production-Style Academic Project</p>
      </div>

      {/* Workflow */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-6 text-center">System Workflow</h3>
        <div className="flex flex-col items-center space-y-2 max-w-sm mx-auto">
          {workflowSteps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="w-full p-4 rounded-xl border flex items-center gap-4 hover:scale-105 transition-transform"
                style={{ background: `${step.color}10`, borderColor: `${step.color}30` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${step.color}20` }}>
                  {step.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: step.color }}>{step.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{step.desc}</div>
                </div>
              </div>
              {i < workflowSteps.length - 1 && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-3 bg-charcoal-600"></div>
                  <ArrowDown size={14} className="text-gray-600" />
                  <div className="w-px h-3 bg-charcoal-600"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Frequently Asked Questions</h3>
        {faqs.map((faq, i) => (
          <div key={i} className="card border transition-all duration-200" style={{ borderColor: openFaq === i ? `${faq.color}40` : '' }}>
            <button className="w-full text-left flex items-center justify-between gap-4" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${faq.color}18` }}>
                  <faq.icon size={16} style={{ color: faq.color }} />
                </div>
                <span className="text-sm font-semibold text-white">{faq.q}</span>
              </div>
              {openFaq === i ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </button>
            {openFaq === i && (
              <div className="mt-4 pl-11 fade-in">
                <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{faq.a}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Key Features */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: 'Network Port Scanner', desc: 'Performs authorized TCP port scanning with real-time progress and multiple scan modes using Nmap', color: '#00ff88' },
            { title: 'Service Fingerprinting', desc: 'Identifies services, versions, and vendors from discovered open ports', color: '#00d4ff' },
            { title: 'Risk Assessment', desc: 'Scores findings using a Rule-Based Security Assessment System based on exposure factors (not official CVSS)', color: '#ef4444' },
            { title: 'Security Recommendations', desc: 'Actionable remediation steps for each identified security concern', color: '#a855f7' },
            { title: 'Scan History', desc: 'Persistent scan records stored in LocalStorage for session continuity', color: '#f97316' },
            { title: 'Report Generation', desc: 'Professional PDF and CSV exports with complete scan data', color: '#eab308' },
          ].map((f, i) => (
            <div key={i} className="p-3 bg-charcoal-900 rounded-lg border border-charcoal-700">
              <div className="text-xs font-semibold mb-1" style={{ color: f.color }}>{f.title}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-5 rounded-xl border border-yellow-800 bg-yellow-900 bg-opacity-10">
        <div className="text-sm font-semibold text-yellow-300 mb-2">⚠ Important Disclaimer</div>
        <p className="text-xs text-yellow-500 leading-relaxed">
          NetSecure is an academic network security assessment application developed for authorized network scanning, service fingerprinting, risk assessment, and security recommendations. Scans are executed using the integrated Nmap engine against explicitly authorized targets. Risk scores are generated using a rule-based assessment methodology and do not represent official CVSS scores. Scan findings indicate potential network exposure and do not automatically confirm exploitable vulnerabilities. Use this application only on systems and networks for which you have explicit authorization.
        </p>
      </div>
    </div>
  );
}
