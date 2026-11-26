import React from 'react';

export default function RiskBadge({ level, size = 'sm' }) {
  const classes = {
    Critical: 'badge-critical',
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  };

  const dots = {
    Critical: 'bg-red-400',
    High: 'bg-orange-400',
    Medium: 'bg-yellow-400',
    Low: 'bg-green-400',
  };

  return (
    <span className={classes[level] || 'badge-low'}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${dots[level] || 'bg-gray-400'}`}></span>
      {level}
    </span>
  );
}

export function PortStateBadge({ state }) {
  const classes = {
    Open: 'badge-open',
    Closed: 'badge-closed',
    Filtered: 'badge-filtered',
  };
  const dots = { Open: 'bg-green-400', Closed: 'bg-gray-500', Filtered: 'bg-orange-400' };
  return (
    <span className={classes[state] || 'badge-closed'}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${dots[state] || 'bg-gray-400'}`}></span>
      {state}
    </span>
  );
}
