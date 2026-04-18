'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { confirmDialog } from '@/components/confirmDialog'
import { TableView, ListView, ViewToggle, Modal, CustomFieldsInfoBox } from '@/components/dashboard'
import type { ColumnDef, ActionDef, FilterDef, PaginationInfo } from '@/components/dashboard'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  is_active: boolean
  staff_ids: string[]
  max_bookings_per_slot: number
  meta: Record<string, unknown>
}

interface Staff {
  id: string
  name: string
  role: string | null
}

interface CustomField {
  id: string
  label: string
  field_key: string
  input_type: 'text' | 'number' | 'dropdown' | 'checkbox'
  options: string[]
  is_required: boolean
  sort_order: number
}

export default function ServicesPage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [view, setView] = useState<'table' | 'list'>('table')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const [form, setForm] = useState({
    name: '', description: '', price: '', duration_minutes: '30',
    category: '', is_active: true, max_bookings_per_slot: '1'
  })
  const [staffIds, setStaffIds] = useState<string[]>([])
  const [meta, setMeta] = useState<Record<string, unknown>>({})

  const [staff, setStaff] = useState<Staff[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  async function loadAll(currentPage = page, filters = filterValues) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.name) params.set('search', filters.name)
    if (filters.status) params.set('status', filters.status)
    params.set('page', String(currentPage))
    params.set('pageSize', String(pageSize))
    const qs = params.toString()
    const [servicesRes, staffRes, cfRes] = await Promise.all([
      fetch(`/api/business/services?${qs}`),
      fetch('/api/business/staff'),
      fetch('/api/business/service-custom-fields'),
    ])
    if (servicesRes.ok) {
      const json = await servicesRes.json()
      setServices(json.data)
      setTotal(json.total)
    }
    if (staffRes.ok) setStaff(await staffRes.json())
    if (cfRes.ok) setCustomFields(await cfRes.json())
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [businessId])

  function handlePageChange(newPage: number) {
    setPage(newPage)
    loadAll(newPage)
  }

  function openCreate() {
    setForm({ name: '', description: '', price: '', duration_minutes: '30', category: '', is_active: true, max_bookings_per_slot: '1' })
    setStaffIds([])
    setMeta({})
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }

  function openEdit(service: Service) {
    setForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      category: service.category || '',
      is_active: service.is_active,
      max_bookings_per_slot: String(service.max_bookings_per_slot ?? 1),
    })
    setStaffIds(service.staff_ids || [])
    setMeta(service.meta || {})
    setEditingId(service.id)
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setForm({ name: '', description: '', price: '', duration_minutes: '30', category: '', is_active: true, max_bookings_per_slot: '1' })
    setStaffIds([])
    setMeta({})
    setError('')
  }

  async function handleSubmit() {
    setError('')

    if (!form.name.trim()) { setError('Service name is required'); return }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('Valid price is required'); return }

    const maxBookings = parseInt(form.max_bookings_per_slot, 10)
    if (!Number.isFinite(maxBookings) || maxBookings < 1) {
      setError('Max parallel bookings per slot must be at least 1')
      return
    }

    setSaving(true)

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes),
      category: form.category || null,
      is_active: form.is_active,
      staff_ids: staffIds,
      max_bookings_per_slot: maxBookings,
      meta,
    }

    const method = editingId ? 'PUT' : 'POST'

    const res = await fetch('/api/business/services', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save service')
      setSaving(false)
      return
    }

    await loadAll()
    closeModal()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete Service?',
      message: 'Are you sure you want to delete this service? This action cannot be undone.',
      confirmLabel: 'Yes, Delete',
      isDanger: true,
    })
    if (!confirmed) return
    setDeleting(id)

    const res = await fetch(`/api/business/services?id=${id}`, { method: 'DELETE' })

    if (res.ok) {
      await loadAll()
    }
    setDeleting(null)
  }

  const serviceFilters: FilterDef[] = useMemo(() => [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Search by name...' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'All Statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ], [])

  const paginationInfo: PaginationInfo = {
    page,
    pageSize,
    total,
    onPageChange: handlePageChange,
  }

  const serviceColumns: ColumnDef<Service>[] = useMemo(() => [
    {
      header: 'Name',
      accessor: (s) => (
        <div>
          <span className="font-medium text-gray-900">{s.name}</span>
          {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: (s) => `$${Number(s.price).toFixed(2)}`,
    },
    {
      header: 'Duration',
      accessor: (s) => `${s.duration_minutes} min`,
    },
    {
      header: 'Per slot',
      accessor: (s) => s.max_bookings_per_slot ?? 1,
    },
    {
      header: 'Category',
      accessor: (s) => s.category ? (
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.category}</span>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      header: 'Status',
      accessor: (s) => (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {s.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ], [])

  const serviceActions: ActionDef<Service>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>,
      onClick: (s) => openEdit(s),
      className: 'text-gray-400 hover:text-blue-600 p-1',
    },
    {
      label: 'Delete',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
      onClick: (s) => handleDelete(s.id),
      disabled: (s) => deleting === s.id,
      className: 'text-gray-400 hover:text-red-600 p-1 disabled:opacity-50',
    },
  ], [deleting])

  function handleFilterChange(key: string, value: string) {
    const newFilters = { ...filterValues, [key]: value }
    setFilterValues(newFilters)
    setPage(1)
    loadAll(1, newFilters)
  }

  function renderServiceCard(service: Service) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${service.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {service.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {service.description && (
            <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>${Number(service.price).toFixed(2)}</span>
            <span>{service.duration_minutes} min</span>
            {service.category && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{service.category}</span>}
            {service.staff_ids?.length > 0 && <span>{service.staff_ids.length} staff</span>}
            {service.max_bookings_per_slot > 1 && <span>{service.max_bookings_per_slot} per slot</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(service)} className="text-gray-400 hover:text-blue-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
          </button>
          <button onClick={() => handleDelete(service.id)} disabled={deleting === service.id} className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Services</h1>
          <p className="text-gray-500 text-sm">Manage the services your business offers</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onToggle={setView} />
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        </div>
      </div>

      <CustomFieldsInfoBox type="services" businessId={businessId} />

      {/* Services List */}
      {services.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : view === 'table' ? (
        <TableView<Service>
          columns={serviceColumns}
          data={services}
          keyExtractor={(s) => s.id}
          actions={serviceActions}
          filters={serviceFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          pagination={paginationInfo}
          emptyMessage="No services match your filters."
        />
      ) : (
        <ListView<Service>
          data={services}
          keyExtractor={(s) => s.id}
          renderCard={renderServiceCard}
          filters={serviceFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          pagination={paginationInfo}
          emptyMessage="No services match your filters."
        />
      )}

      {/* Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSubmit}
        title={editingId ? 'Edit Service' : 'New Service'}
        isSaving={saving}
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Haircut"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the service"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <select
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Bookings Per Slot</label>
            <select
              value={form.max_bookings_per_slot}
              onChange={(e) => setForm({ ...form, max_bookings_per_slot: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={String(num)}>{num}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many appointments can be booked at the same time for this service
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Haircuts, Facials"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to customers)</label>
          </div>

          {/* Staff assignment */}
          {staff.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Staff</label>
              <p className="text-xs text-gray-500 mb-2">Leave empty if any staff member can deliver this service.</p>
              <div className="space-y-1.5">
                {staff.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffIds.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) setStaffIds([...staffIds, member.id])
                        else setStaffIds(staffIds.filter(id => id !== member.id))
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{member.name}{member.role ? ` — ${member.role}` : ''}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Custom Fields</p>
                <div className="space-y-4">
                  {customFields.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {cf.label}{cf.is_required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {cf.input_type === 'text' && (
                        <input
                          type="text"
                          value={(meta[cf.field_key] as string) || ''}
                          onChange={(e) => setMeta({ ...meta, [cf.field_key]: e.target.value })}
                          required={cf.is_required}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      {cf.input_type === 'number' && (
                        <input
                          type="number"
                          value={(meta[cf.field_key] as string) || ''}
                          onChange={(e) => setMeta({ ...meta, [cf.field_key]: e.target.value })}
                          required={cf.is_required}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      {cf.input_type === 'checkbox' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!(meta[cf.field_key])}
                            onChange={(e) => setMeta({ ...meta, [cf.field_key]: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-600">Yes</span>
                        </div>
                      )}
                      {cf.input_type === 'dropdown' && (
                        <select
                          value={(meta[cf.field_key] as string) || ''}
                          onChange={(e) => setMeta({ ...meta, [cf.field_key]: e.target.value })}
                          required={cf.is_required}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {cf.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-2xl">
      <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No services yet</h3>
      <p className="text-sm text-gray-500 mb-4">Add your first service so customers know what you offer.</p>
      <button
        onClick={onAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Add Your First Service
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
      <div className="space-y-3 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
