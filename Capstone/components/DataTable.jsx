import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export default function DataTable({ columns, data, searchable = false, searchKeys = [] }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  let filtered = [...data];
  if (searchable && search && searchKeys.length) {
    const q = search.toLowerCase();
    filtered = filtered.filter(row =>
      searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }

  if (sortKey) {
    filtered.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  return (
    <div>
      {searchable && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-charcoal-700">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`table-header text-left ${col.sortable ? 'cursor-pointer hover:text-neon-green select-none' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col ml-1">
                        <ChevronUp size={10} className={sortKey === col.key && sortDir === 'asc' ? 'text-neon-green' : 'text-gray-600'} />
                        <ChevronDown size={10} className={sortKey === col.key && sortDir === 'desc' ? 'text-neon-green' : 'text-gray-600'} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-cell text-center text-gray-500 py-8">No records found</td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="table-row">
                  {columns.map(col => (
                    <td key={col.key} className="table-cell">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-right">
          {filtered.length} of {data.length} records
        </div>
      )}
    </div>
  );
}
