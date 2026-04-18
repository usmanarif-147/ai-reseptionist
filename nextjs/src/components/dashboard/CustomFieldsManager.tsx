'use client'

import { useEffect, useState } from 'react'
import { confirmDialog } from '@/components/confirmDialog'
import Modal from './Modal'

export interface CustomField {
  id: string
  label: string
  field_key: string
  input_type: 'text' | 'number' | 'dropdown' | 'checkbox'
  options: string[]
  is_required: boolean
  sort_order: number
}

interface CustomFieldsManagerProps {
  apiBase: string
  targetLabel: string
  formPlaceholder: string
  optionsPlaceholder: string
  deleteMessage: string
}

function toFieldKey(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function CustomFieldsManager({
  apiBase,
  targetLabel,
  formPlaceholder,
  optionsPlaceholder,
  deleteMessage,
}: CustomFieldsManagerProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)

  const [isCfModalOpen, setIsCfModalOpen] = useState(false)
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null)
  const [cfForm, setCfForm] = useState({
    label: '',
    input_type: 'text' as CustomField['input_type'],
    is_required: false,
    optionsText: '',
  })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfDeleting, setCfDeleting] = useState<string | null>(null)
  const [cfError, setCfError] = useState('')

  async function loadFields() {
    setLoading(true)
    const res = await fetch(apiBase)
    if (res.ok) setCustomFields(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadFields() }, [apiBase])

  function openCfCreate() {
    setCfForm({ label: '', input_type: 'text', is_required: false, optionsText: '' })
    setEditingCustomFieldId(null)
    setCfError('')
    setIsCfModalOpen(true)
  }

  function openCfEdit(cf: CustomField) {
    setCfForm({
      label: cf.label,
      input_type: cf.input_type,
      is_required: cf.is_required,
      optionsText: cf.options.join('\n'),
    })
    setEditingCustomFieldId(cf.id)
    setCfError('')
    setIsCfModalOpen(true)
  }

  function closeCfModal() {
    setIsCfModalOpen(false)
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
    const res = await fetch(apiBase, {
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

    const updatedCf = await fetch(apiBase)
    if (updatedCf.ok) setCustomFields(await updatedCf.json())
    closeCfModal()
    setCfSaving(false)
  }

  async function handleCfDelete(id: string) {
    const confirmed = await confirmDialog({
      title: 'Delete Custom Field?',
      message: deleteMessage,
      confirmLabel: 'Yes, Delete',
      isDanger: true,
    })
    if (!confirmed) return
    setCfDeleting(id)
    const res = await fetch(`${apiBase}?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCustomFields(customFields.filter(cf => cf.id !== id))
    }
    setCfDeleting(null)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-16" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Custom Fields</h2>
          <p className="text-xs text-gray-500 mt-0.5">Define extra fields that appear in your {targetLabel} form.</p>
        </div>
        <button
          onClick={openCfCreate}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Field
        </button>
      </div>

      <Modal
        isOpen={isCfModalOpen}
        onClose={closeCfModal}
        onSave={handleCfSubmit}
        title={editingCustomFieldId ? 'Edit Custom Field' : 'New Custom Field'}
        isSaving={cfSaving}
      >
        <div className="space-y-3">
          {cfError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{cfError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Label</label>
            <input
              type="text"
              value={cfForm.label}
              onChange={(e) => setCfForm({ ...cfForm, label: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formPlaceholder}
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
                placeholder={optionsPlaceholder}
              />
            </div>
          )}
        </div>
      </Modal>

      {customFields.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">No custom fields defined yet. Add fields to extend your {targetLabel} form.</p>
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
  )
}
