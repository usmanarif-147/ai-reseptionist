'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  is_active: boolean
  staff_ids: string[]
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

  // Existing state
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Service form state
  const [form, setForm] = useState({
    name: '', description: '', price: '', duration_minutes: '30',
    category: '', is_active: true
  })
  const [staffIds, setStaffIds] = useState<string[]>([])
  const [meta, setMeta] = useState<Record<string, unknown>>({})

  // New data
  const [staff, setStaff] = useState<Staff[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  // Custom Fields Manager state
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false)
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null)
  const [cfForm, setCfForm] = useState({
    label: '', input_type: 'text' as CustomField['input_type'],
    is_required: false, optionsText: ''
  })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfDeleting, setCfDeleting] = useState<string | null>(null)
  const [cfError, setCfError] = useState('')

  async function loadAll() {
    setLoading(true)
    const [servicesRes, staffRes, cfRes] = await Promise.all([
      fetch('/api/business/services'),
      fetch('/api/business/staff'),
      fetch('/api/business/service-custom-fields'),
    ])
    if (servicesRes.ok) setServices(await servicesRes.json())
    if (staffRes.ok) setStaff(await staffRes.json())
    if (cfRes.ok) setCustomFields(await cfRes.json())
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [businessId])

  function openCreate() {
    setForm({ name: '', description: '', price: '', duration_minutes: '30', category: '', is_active: true })
    setStaffIds([])
    setMeta({})
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(service: Service) {
    setForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      category: service.category || '',
      is_active: service.is_active,
    })
    setStaffIds(service.staff_ids || [])
    setMeta(service.meta || {})
    setEditingId(service.id)
    setShowForm(true)
    setError('')
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', description: '', price: '', duration_minutes: '30', category: '', is_active: true })
    setStaffIds([])
    setMeta({})
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
    closeForm()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this service?')) return
    setDeleting(id)

    const res = await fetch(`/api/business/services?id=${id}`, { method: 'DELETE' })

    if (res.ok) {
      setServices(services.filter((s) => s.id !== id))
    }
    setDeleting(null)
  }

  // Custom Fields Manager functions

  function toFieldKey(label: string): string {
    return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  function openCfCreate() {
    setCfForm({ label: '', input_type: 'text', is_required: false, optionsText: '' })
    setEditingCustomFieldId(null)
    setShowCustomFieldForm(true)
    setCfError('')
  }

  function openCfEdit(cf: CustomField) {
    setCfForm({
      label: cf.label,
      input_type: cf.input_type,
      is_required: cf.is_required,
      optionsText: cf.options.join('\n'),
    })
    setEditingCustomFieldId(cf.id)
    setShowCustomFieldForm(true)
    setCfError('')
  }

  function closeCfForm() {
    setShowCustomFieldForm(false)
    setEditingCustomFieldId(null)
    setCfForm({ label: '', input_type: 'text', is_required: false, optionsText: '' })
    setCfError('')
  }

  async function handleCfSubmit() {
    if (!cfForm.label.trim()) { setCfError('Label is required'); return }
    if (cfForm.input_type === 'dropdown' && !cfForm.optionsText.trim()) {
      setCfError('Dropdown fields require at least one option'); return
    }
    setCfSaving(true)
    setCfError('')

    const options = cfForm.input_type === 'dropdown'
      ? cfForm.optionsText.split('\n').map(o => o.trim()).filter(Boolean)
      : []

    const body = {
      ...(editingCustomFieldId ? { id: editingCustomFieldId } : {}),
      label: cfForm.label,
      input_type: cfForm.input_type,
      is_required: cfForm.is_required,
      options,
    }

    const method = editingCustomFieldId ? 'PUT' : 'POST'
    const res = await fetch('/api/business/service-custom-fields', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setCfError(data.error || 'Failed to save field')
      setCfSaving(false)
      return
    }

    const updatedCf = await fetch('/api/business/service-custom-fields')
    if (updatedCf.ok) setCustomFields(await updatedCf.json())
    closeCfForm()
    setCfSaving(false)
  }

  async function handleCfDelete(id: string) {
    if (!confirm('Delete this custom field? Existing service values will be kept but not displayed.')) return
    setCfDeleting(id)
    const res = await fetch(`/api/business/service-custom-fields?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCustomFields(customFields.filter(cf => cf.id !== id))
    }
    setCfDeleting(null)
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Services</h1>
          <p className="text-gray-500 text-sm">Manage the services your business offers</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Service' : 'New Service'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Service' : 'Add Service'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 && !showForm ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-3 max-w-2xl">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between"
            >
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
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(service)}
                  className="text-gray-400 hover:text-blue-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={deleting === service.id}
                  className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Fields Manager */}
      <div className="mt-10 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Custom Fields</h2>
            <p className="text-xs text-gray-500 mt-0.5">Define extra fields that appear in your service form.</p>
          </div>
          {!showCustomFieldForm && (
            <button
              onClick={openCfCreate}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          )}
        </div>

        {/* Custom field add/edit form */}
        {showCustomFieldForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            {cfError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-3 text-sm">{cfError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Label</label>
                <input
                  type="text"
                  value={cfForm.label}
                  onChange={(e) => setCfForm({ ...cfForm, label: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Gender Type, Includes Wash"
                />
                {cfForm.label && (
                  <p className="text-xs text-gray-400 mt-1">Key: {toFieldKey(cfForm.label)}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
                  <select
                    value={cfForm.input_type}
                    onChange={(e) => setCfForm({ ...cfForm, input_type: e.target.value as CustomField['input_type'] })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox (Yes/No)</option>
                  </select>
                </div>
                <div className="flex items-end pb-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfForm.is_required}
                      onChange={(e) => setCfForm({ ...cfForm, is_required: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </label>
                </div>
              </div>
              {cfForm.input_type === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                  <textarea
                    value={cfForm.optionsText}
                    onChange={(e) => setCfForm({ ...cfForm, optionsText: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={"One option per line, e.g.:\nMale\nFemale\nAny"}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCfSubmit}
                  disabled={cfSaving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {cfSaving ? 'Saving...' : editingCustomFieldId ? 'Update Field' : 'Add Field'}
                </button>
                <button
                  type="button"
                  onClick={closeCfForm}
                  className="text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom fields list */}
        {customFields.length === 0 && !showCustomFieldForm ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500">No custom fields defined yet. Add fields to extend your service form.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((cf) => (
              <div key={cf.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{cf.label}</span>
                    {cf.is_required && <span className="text-xs text-red-500">Required</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 capitalize">{cf.input_type}</span>
                    <span className="text-xs text-gray-300">key: {cf.field_key}</span>
                    {cf.options.length > 0 && (
                      <span className="text-xs text-gray-400">{cf.options.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openCfEdit(cf)} className="text-gray-400 hover:text-blue-600 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCfDelete(cf.id)}
                    disabled={cfDeleting === cf.id}
                    className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
