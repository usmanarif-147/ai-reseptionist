'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { TableView, ListView, ViewToggle } from '@/components/dashboard'
import type { ColumnDef, FilterDef } from '@/components/dashboard'

interface Customer {
  id: string
  email: string
  name: string | null
  phone: string | null
  visitor_id: string | null
  first_seen_at: string
  last_seen_at: string
  total_sessions: number
  total_appointments: number
  type: string
}

const TYPE_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'New Visitor', value: 'new_visitor' },
  { label: 'Returning Visitor', value: 'returning_visitor' },
  { label: 'Interested Prospect', value: 'interested_prospect' },
  { label: 'Booked Customer', value: 'booked_customer' },
  { label: 'Regular Customer', value: 'regular_customer' },
]

const TYPE_BADGE: Record<string, string> = {
  regular_customer: 'bg-green-100 text-green-800',
  booked_customer: 'bg-blue-100 text-blue-800',
  interested_prospect: 'bg-amber-100 text-amber-800',
  returning_visitor: 'bg-purple-100 text-purple-800',
  new_visitor: 'bg-gray-100 text-gray-800',
}

const TYPE_LABEL: Record<string, string> = {
  new_visitor: 'New Visitor',
  returning_visitor: 'Returning Visitor',
  interested_prospect: 'Interested Prospect',
  booked_customer: 'Booked Customer',
  regular_customer: 'Regular Customer',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CustomersPage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [view, setView] = useState<'table' | 'list'>('table')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  async function loadCustomers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeFilter !== 'all') params.set('type', activeFilter)
    if (filterValues.name) params.set('search', filterValues.name)
    const qs = params.toString()
    const res = await fetch(`/api/business/customers${qs ? `?${qs}` : ''}`)
    if (res.ok) {
      const data = await res.json()
      setCustomers(data.customers)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => { loadCustomers() }, [businessId, activeFilter])

  const customerFilters: FilterDef[] = useMemo(() => [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Search by name...' },
  ], [])

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterValues.name && !(c.name || '').toLowerCase().includes(filterValues.name.toLowerCase())) return false
      return true
    })
  }, [customers, filterValues])

  const customerColumns: ColumnDef<Customer>[] = useMemo(() => [
    {
      header: 'Name',
      accessor: (c) => c.name ? (
        <span className="font-medium text-gray-900">{c.name}</span>
      ) : <span className="text-gray-400">-</span>,
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Phone',
      accessor: (c) => c.phone || <span className="text-gray-400">-</span>,
    },
    {
      header: 'Type',
      accessor: (c) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type] || 'bg-gray-100 text-gray-800'}`}>
          {TYPE_LABEL[c.type] || c.type}
        </span>
      ),
    },
    {
      header: 'First Seen',
      accessor: (c) => formatDate(c.first_seen_at),
    },
    {
      header: 'Last Seen',
      accessor: (c) => formatDate(c.last_seen_at),
    },
    {
      header: 'Sessions',
      accessor: 'total_sessions',
    },
    {
      header: 'Appointments',
      accessor: 'total_appointments',
    },
  ], [])

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
  }

  function renderCustomerCard(customer: Customer) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{customer.name || 'Anonymous'}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[customer.type] || 'bg-gray-100 text-gray-800'}`}>
                {TYPE_LABEL[customer.type] || customer.type}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{customer.email}</p>
            {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>First: {formatDate(customer.first_seen_at)}</span>
              <span>Last: {formatDate(customer.last_seen_at)}</span>
              <span>{customer.total_sessions} sessions</span>
              <span>{customer.total_appointments} appointments</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Customers</h1>
          <p className="text-gray-500 text-sm">View and manage customers who have interacted with your widget</p>
        </div>
        <ViewToggle view={view} onToggle={setView} />
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
            {filter.value === 'all' && (
              <span className="ml-1.5 text-xs opacity-75">({total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table/List or empty state */}
      {customers.length === 0 ? (
        <EmptyState />
      ) : view === 'table' ? (
        <TableView<Customer>
          columns={customerColumns}
          data={filteredCustomers}
          keyExtractor={(c) => c.id}
          filters={customerFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          emptyMessage="No customers match the selected filter."
        />
      ) : (
        <div className="max-w-2xl">
          <ListView<Customer>
            data={filteredCustomers}
            keyExtractor={(c) => c.id}
            renderCard={renderCustomerCard}
            filters={customerFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            emptyMessage="No customers match the selected filter."
          />
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-2xl">
      <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No customers yet</h3>
      <p className="text-sm text-gray-500 mb-4">Customers will appear here once visitors interact with your chat widget.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 bg-gray-200 rounded-lg w-28" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
