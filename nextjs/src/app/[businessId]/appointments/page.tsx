'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { TableView, ListView, ViewToggle, Modal } from '@/components/dashboard'
import type { ColumnDef, FilterDef, PaginationInfo } from '@/components/dashboard'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface Appointment {
  id: string
  customer_name: string
  service_id: string | null
  appointment_date: string
  payment_method: string
  notes: string | null
  created_at: string
  service?: Service
}

type PaymentType = 'cash' | 'online' | 'both'

const paymentMethodOptions: Record<PaymentType, { value: string; label: string }[]> = {
  cash: [
    { value: 'cash_on_arrival', label: 'Cash on Arrival' },
    { value: 'paid_cash', label: 'Mark as Paid (cash received)' },
  ],
  online: [
    { value: 'paid_online', label: 'Mark as Paid (online transfer)' },
  ],
  both: [
    { value: 'cash_on_arrival', label: 'Cash on Arrival' },
    { value: 'paid_cash', label: 'Mark as Paid (cash received)' },
    { value: 'paid_online', label: 'Mark as Paid (online transfer)' },
  ],
}

const paymentMethodLabels: Record<string, string> = {
  cash_on_arrival: 'Cash on Arrival',
  paid_cash: 'Paid (Cash)',
  paid_online: 'Paid (Online)',
}

export default function AppointmentsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // View toggle + filters + pagination
  const [view, setView] = useState<'table' | 'list'>('table')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const [form, setForm] = useState({
    customerName: '',
    serviceId: '',
    appointmentDate: '',
    paymentMethod: '',
    notes: '',
  })

  useEffect(() => { loadAll() }, [businessId])

  async function loadAll(currentPage = page, filters = filterValues) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.customer) params.set('search', filters.customer)
    if (filters.payment) params.set('status', filters.payment)
    params.set('page', String(currentPage))
    params.set('pageSize', String(pageSize))
    const qs = params.toString()
    const [appointmentsRes, paymentsRes, servicesRes] = await Promise.all([
      fetch(`/api/business/appointments?${qs}`),
      fetch('/api/business/payments'),
      fetch('/api/business/services'),
    ])

    if (appointmentsRes.ok) {
      const json = await appointmentsRes.json()
      setAppointments(json.data)
      setTotal(json.total)
    }
    if (paymentsRes.ok) {
      const data = await paymentsRes.json()
      if (data) {
        const pt = data.payment_type || 'cash'
        setPaymentType(pt)
        const options = paymentMethodOptions[pt as PaymentType]
        if (options?.length > 0) {
          setForm(prev => ({ ...prev, paymentMethod: prev.paymentMethod || options[0].value }))
        }
      }
    }
    if (servicesRes.ok) {
      setServices(await servicesRes.json())
    }
    setLoading(false)
  }

  function openCreate() {
    const options = paymentMethodOptions[paymentType] || []
    setForm({
      customerName: '',
      serviceId: '',
      appointmentDate: '',
      paymentMethod: options[0]?.value || '',
      notes: '',
    })
    setError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setError('')
  }

  async function handleSubmit() {
    setError('')

    if (!form.customerName.trim()) {
      setError('Customer name is required')
      return
    }
    if (!form.appointmentDate) {
      setError('Appointment date is required')
      return
    }
    if (!form.paymentMethod) {
      setError('Payment method is required')
      return
    }

    setIsSubmitting(true)

    const body = {
      customer_name: form.customerName.trim(),
      service_id: form.serviceId || null,
      appointment_date: form.appointmentDate,
      payment_method: form.paymentMethod,
      notes: form.notes.trim() || null,
    }

    const res = await fetch('/api/business/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create appointment')
      setIsSubmitting(false)
      return
    }

    await loadAll()
    closeModal()
    setIsSubmitting(false)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const appointmentFilters: FilterDef[] = useMemo(() => [
    { key: 'customer', label: 'Customer', type: 'text', placeholder: 'Search by customer...' },
    {
      key: 'payment',
      label: 'Payment',
      type: 'select',
      placeholder: 'All Payments',
      options: [
        { value: 'cash_on_arrival', label: 'Cash on Arrival' },
        { value: 'paid_cash', label: 'Paid (Cash)' },
        { value: 'paid_online', label: 'Paid (Online)' },
      ],
    },
  ], [])

  function handlePageChange(newPage: number) {
    setPage(newPage)
    loadAll(newPage)
  }

  const paginationInfo: PaginationInfo = {
    page,
    pageSize,
    total,
    onPageChange: handlePageChange,
  }

  const appointmentColumns: ColumnDef<Appointment>[] = useMemo(() => [
    {
      header: 'Customer',
      accessor: (a) => <span className="font-medium text-gray-900">{a.customer_name}</span>,
    },
    {
      header: 'Date & Time',
      accessor: (a) => formatDate(a.appointment_date),
    },
    {
      header: 'Service',
      accessor: (a) => {
        const service = services.find(s => s.id === a.service_id)
        return service ? (
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{service.name}</span>
        ) : <span className="text-gray-400">-</span>
      },
    },
    {
      header: 'Payment',
      accessor: (a) => (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          a.payment_method === 'cash_on_arrival'
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-green-50 text-green-700'
        }`}>
          {paymentMethodLabels[a.payment_method] || a.payment_method}
        </span>
      ),
    },
    {
      header: 'Notes',
      accessor: (a) => a.notes ? (
        <span className="text-gray-500 truncate max-w-[200px] inline-block">{a.notes}</span>
      ) : <span className="text-gray-400">-</span>,
    },
  ], [services])

  function handleFilterChange(key: string, value: string) {
    const newFilters = { ...filterValues, [key]: value }
    setFilterValues(newFilters)
    setPage(1)
    loadAll(1, newFilters)
  }

  function renderAppointmentCard(apt: Appointment) {
    const service = services.find(s => s.id === apt.service_id)
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{apt.customer_name}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(apt.appointment_date)}
              </span>
              {service && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {service.name}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full ${
                apt.payment_method === 'cash_on_arrival'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {paymentMethodLabels[apt.payment_method] || apt.payment_method}
              </span>
            </div>
            {apt.notes && (
              <p className="text-xs text-gray-400 mt-1.5">{apt.notes}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSkeleton />

  const options = paymentMethodOptions[paymentType] || []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h1>
          <p className="text-gray-500 text-sm">Manage your business appointments</p>
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
            Add Appointment
          </button>
        </div>
      </div>

      {/* Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSubmit}
        title="New Appointment"
        isSaving={isSubmitting}
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service (optional)</label>
            <select
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No specific service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — ${Number(service.price).toFixed(2)} ({service.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date & Time</label>
            <input
              type="datetime-local"
              required
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              required
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select payment method</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes about this appointment"
            />
          </div>
        </div>
      </Modal>

      {/* Appointments List */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
        {view === 'table' ? (
          <TableView<Appointment>
            columns={appointmentColumns}
            data={appointments}
            keyExtractor={(a) => a.id}
            filters={appointmentFilters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            pagination={paginationInfo}
            emptyMessage="No appointments yet. Click 'Add Appointment' to create your first one."
          />
        ) : (
          <div className="max-w-2xl">
            <ListView<Appointment>
              data={appointments}
              keyExtractor={(a) => a.id}
              renderCard={renderAppointmentCard}
              filters={appointmentFilters}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              pagination={paginationInfo}
              emptyMessage="No appointments yet. Click 'Add Appointment' to create your first one."
            />
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-44 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
      <div className="max-w-2xl">
        <div className="h-5 bg-gray-200 rounded w-44 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
