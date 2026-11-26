import React from 'react';

export default function ChartCard({ title, subtitle, children, className = '', action }) {
  return (
    <div className={`bg-charcoal-800 border border-charcoal-600 rounded-xl overflow-hidden hover:border-charcoal-500 transition-colors duration-300 ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-700">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
