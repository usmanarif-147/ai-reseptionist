import { ReactNode } from 'react'

export interface ColumnDef<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  className?: string
}

export interface ActionDef<T> {
  label: string
  icon: ReactNode
  onClick: (item: T) => void
  disabled?: (item: T) => boolean
  className?: string
}

export interface FilterDef {
  key: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export interface DataDisplayProps<T> {
  data: T[]
  keyExtractor: (item: T) => string
  actions?: ActionDef<T>[]
  filters?: FilterDef[]
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  pagination?: PaginationInfo
  emptyMessage?: string
  emptyIcon?: ReactNode
}

export interface TableViewProps<T> extends DataDisplayProps<T> {
  columns: ColumnDef<T>[]
}

export interface ListViewProps<T> extends DataDisplayProps<T> {
  renderCard: (item: T) => ReactNode
}

export interface ViewToggleProps {
  view: 'table' | 'list'
  onToggle: (view: 'table' | 'list') => void
}
