'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { confirmDialog } from '@/components/confirmDialog'
import { TableView, ListView, ViewToggle, Modal, CustomFieldsInfoBox } from '@/components/dashboard'
import type { ColumnDef, ActionDef, FilterDef, PaginationInfo } from '@/components/dashboard'
import StaffScheduleModal from './StaffScheduleModal'

interface StaffMember {
  id: string
  business_id: string
  name: string
  role: string
  photo_url: string | null
  bio?: string | null
  contact?: { phone?: string | null; email?: string | null } | null
  is_active: boolean
  meta?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface StaffCustomField {
  id: string
  label: string
  field_key: string
  input_type: 'text' | 'number' | 'dropdown' | 'checkbox'
  options: string[]
  is_required: boolean
  sort_order: number
}

const emptyForm = {
  name: '',
  role: '',
  bio: '',
  contact: { phone: '', email: '' },
  is_active: true,
}

export default function StaffPage() {
  const { businessId } = useParams<{ businessId: string }>()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState(emptyForm)
  const [meta, setMeta] = useState<Record<string, unknown>>({})

  const [customFields, setCustomFields] = useState<StaffCustomField[]>([])

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(null)

  const [view, setView] = useState<'table' | 'list'>('table')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const apiBase = '/api/business/staff'

  async function loadAll(currentPage = page, filters = filterValues) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.name) params.set('search', filters.name)
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)
    params.set('page', String(currentPage))
    params.set('pageSize', String(pageSize))
    const qs = params.toString()
    const [staffRes, cfRes] = await Promise.all([
      fetch(`${apiBase}?${qs}`),
      fetch('/api/business/staff-custom-fields'),
    ])
    if (staffRes.ok) {
      const json = await staffRes.json()
      setStaff(json.data)
      setTotal(json.total)
    }
    if (cfRes.ok) setCustomFields(await cfRes.json())
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [businessId])

  function handlePageChange(newPage: number) {
    setPage(newPage)
    loadAll(newPage)
  }

  function openCreate() {
    setForm({ ...emptyForm, contact: { phone: '', email: '' } })
    setMeta({})
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }

  function openEdit(member: StaffMember) {
    setForm({
      name: member.name,
      role: member.role || '',
      bio: member.bio || '',
      contact: {
        phone: member.contact?.phone || '',
        email: member.contact?.email || '',
      },
      is_active: member.is_active ?? true,
    })
    setMeta(member.meta || {})
    setEditingId(member.id)
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setForm({ ...emptyForm, contact: { phone: '', email: '' } })
    setMeta({})
    setError('')
  }

  function openScheduleModal(member: StaffMember) {
    setScheduleStaff(member)
    setScheduleModalOpen(true)
  }

  function closeScheduleModal() {
    setScheduleModalOpen(false)
    setScheduleStaff(null)
  }

  async function handleSubmit() {
    setError('')

    if (!form.name.trim()) { setError('Name is required'); return }

    setSaving(true)

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name,
      role: form.role,
      bio: form.bio || null,
      contact: {
        phone: form.contact.phone || null,
        email: form.contact.email || null,
      },
      is_active: form.is_active,
      meta,
    }

    const method = editingId ? 'PUT' : 'POST'

    const res = await fetch(apiBase, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save staff member')
      setSaving(false)
      return
    }

    await loadAll()
    closeModal()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Remove Staff Member?',
      message: 'Are you sure you want to remove this staff member? This action cannot be undone.',
      confirmLabel: 'Yes, Remove',
      isDanger: true,
    })
    if (!confirmed) return
    setDeleting(id)

    const res = await fetch(`${apiBase}?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadAll()
    }
    setDeleting(null)
  }

  const staffFilters: FilterDef[] = useMemo(() => [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Search by name...' },
    { key: 'role', label: 'Role', type: 'text', placeholder: 'Search by role...' },
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

  const staffColumns: ColumnDef<StaffMember>[] = useMemo(() => [
    {
      header: 'Name',
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
            {m.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{m.name}</span>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (m) => m.role || <span className="text-gray-400">-</span>,
    },
    {
      header: 'Status',
      accessor: (m) => (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {m.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ], [])

  const staffActions: ActionDef<StaffMember>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>,
      onClick: (m) => openEdit(m),
      className: 'text-gray-400 hover:text-blue-600 p-1',
    },
    {
      label: 'Schedule',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
      onClick: (m) => openScheduleModal(m),
      className: 'text-gray-400 hover:text-blue-600 p-1',
    },
    {
      label: 'Delete',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
      onClick: (m) => handleDelete(m.id),
      disabled: (m) => deleting === m.id,
      className: 'text-gray-400 hover:text-red-600 p-1 disabled:opacity-50',
    },
  ], [deleting])

  function handleFilterChange(key: string, value: string) {
    const newFilters = { ...filterValues, [key]: value }
    setFilterValues(newFilters)
    setPage(1)
    loadAll(1, newFilters)
  }

  function renderStaffCard(member: StaffMember) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{member.name}</h3>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${member.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {member.role && (
              <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(member)} aria-label="Edit" className="text-gray-400 hover:text-blue-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
          </button>
          <button onClick={() => openScheduleModal(member)} aria-label="Schedule" className="text-gray-400 hover:text-blue-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          </button>
          <button onClick={() => handleDelete(member.id)} disabled={deleting === member.id} aria-label="Delete" className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Staff</h1>
          <p className="text-gray-500 text-sm">Manage your team members</p>
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
            Add Staff Member
          </button>
        </div>
      </div>

      <CustomFieldsInfoBox type="staff" businessId={businessId} />

      {/* Staff List */}
      {staff.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : view === 'table' ? (
        <TableView<StaffMember>
          columns={staffColumns}
          data={staff}
          keyExtractor={(m) => m.id}
          actions={staffActions}
          filters={staffFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          pagination={paginationInfo}
          emptyMessage="No staff members match your filters."
        />
      ) : (
        <ListView<StaffMember>
          data={staff}
          keyExtractor={(m) => m.id}
          renderCard={renderStaffCard}
          filters={staffFilters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          pagination={paginationInfo}
          emptyMessage="No staff members match your filters."
        />
      )}

      {/* Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSubmit}
        title={editingId ? 'Edit Staff Member' : 'New Staff Member'}
        isSaving={saving}
        size="lg"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Stylist, Therapist, Doctor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description or biography"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.contact.phone}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone (internal use)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={form.contact.email}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email (internal use)"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="staff_is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="staff_is_active" className="text-sm font-medium text-gray-700">Active (visible to customers)</label>
          </div>

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

      {/* Staff Schedule Modal */}
      {scheduleStaff && (
        <StaffScheduleModal
          staffId={scheduleStaff.id}
          staffName={scheduleStaff.name}
          isOpen={scheduleModalOpen}
          onClose={closeScheduleModal}
        />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-2xl">
      <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No staff members yet</h3>
      <p className="text-sm text-gray-500 mb-4">Add your team members so customers can choose who to book with.</p>
      <button
        onClick={onAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Add Your First Staff Member
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-48 mb-8" />
      <div className="space-y-3 max-w-2xl">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
