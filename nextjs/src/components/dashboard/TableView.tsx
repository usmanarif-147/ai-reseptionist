'use client'

import { ReactNode } from 'react'
import { TableViewProps } from './types'
import FilterBar from './FilterBar'

export default function TableView<T>({
  columns,
  data,
  keyExtractor,
  actions,
  filters,
  filterValues,
  onFilterChange,
  emptyMessage = 'No data found.',
  emptyIcon,
}: TableViewProps<T>) {
  return (
    <div>
      {filters && filters.length > 0 && filterValues && onFilterChange && (
        <div className="mb-4">
          <FilterBar filters={filters} values={filterValues} onChange={onFilterChange} />
        </div>
      )}

      {data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          {emptyIcon && <div className="flex justify-center mb-4">{emptyIcon}</div>}
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                  {actions && actions.length > 0 && (
                    <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={keyExtractor(item)} className="border-b border-gray-50 hover:bg-gray-50">
                    {columns.map((col, i) => (
                      <td key={i} className={`px-5 py-3 text-gray-700 ${col.className || ''}`}>
                        {renderCell(item, col.accessor)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => action.onClick(item)}
                              disabled={action.disabled?.(item)}
                              className={action.className || 'text-gray-400 hover:text-blue-600 p-1 disabled:opacity-50'}
                              title={action.label}
                            >
                              {action.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function renderCell<T>(item: T, accessor: keyof T | ((item: T) => ReactNode)): ReactNode {
  if (typeof accessor === 'function') {
    return accessor(item)
  }
  const value = item[accessor]
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>
  }
  return String(value)
}
