'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    customerName: '',
    serviceId: '',
    appointmentDate: '',
    paymentMethod: '',
    notes: '',
  })

  useEffect(() => { loadAll() }, [businessId])

  async function loadAll() {
    setLoading(true)
    const [appointmentsRes, paymentsRes, servicesRes] = await Promise.all([
      fetch('/api/business/appointments'),
      fetch('/api/business/payments'),
      fetch('/api/business/services'),
    ])

    if (appointmentsRes.ok) {
      setAppointments(await appointmentsRes.json())
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

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

    setSuccess('Appointment created successfully')
    setForm({
      customerName: '',
      serviceId: '',
      appointmentDate: '',
      paymentMethod: paymentMethodOptions[paymentType]?.[0]?.value || '',
      notes: '',
    })
    await loadAll()
    setIsSubmitting(false)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  if (loading) return <LoadingSkeleton />

  const options = paymentMethodOptions[paymentType] || []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your business appointments</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm max-w-2xl">
          {success}
        </div>
      )}

      {/* Add Appointment Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add Appointment</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Appointment'}
          </button>
        </form>
      </div>

      {/* Appointments List */}
      <div className="max-w-2xl">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
        {appointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">No appointments yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => {
              const service = services.find(s => s.id === apt.service_id)
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-xl border border-gray-100 p-5"
                >
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
            })}
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
      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl mb-8">
        <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
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
