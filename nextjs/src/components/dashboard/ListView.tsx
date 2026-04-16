'use client'

import { ListViewProps } from './types'
import FilterBar from './FilterBar'

export default function ListView<T>({
  data,
  keyExtractor,
  renderCard,
  filters,
  filterValues,
  onFilterChange,
  emptyMessage = 'No data found.',
  emptyIcon,
}: ListViewProps<T>) {
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
        <div className="space-y-3">
          {data.map((item) => (
            <div key={keyExtractor(item)}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
