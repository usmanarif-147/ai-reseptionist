'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { StepIndicator } from './components/StepIndicator'
import { StepService } from './components/StepService'
import { StepStaff } from './components/StepStaff'
import { StepSlots } from './components/StepSlots'
import { StepCustomerDetails } from './components/StepCustomerDetails'
import { StepPayment } from './components/StepPayment'
import { StepConfirm } from './components/StepConfirm'
import { SuccessView } from './components/SuccessView'
import { Spinner } from './components/Spinner'
import { WizardFooter } from './components/WizardFooter'
import { ErrorBanner } from './components/ErrorBanner'
import type {
  Appointment,
  DaySlots,
  Service,
  Slot,
  StaffMember,
  Step,
  WizardState,
} from './components/types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const INITIAL_STATE: WizardState = {
  currentStep: 1,
  completedSteps: new Set<number>(),
  selectedService: null,
  selectedStaff: null,
  selectedDate: null,
  selectedSlot: null,
  paymentMethod: 'cash_on_arrival',
  customerInfo: { name: '', email: '', phone: '' },
}

export default function BookingWizardPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const searchParams = useSearchParams()

  const [state, setState] = useState<WizardState>(() => {
    const sessionParam = searchParams.get('session') || undefined
    const visitorParam = searchParams.get('visitor') || undefined
    return {
      ...INITIAL_STATE,
      chatSessionId: sessionParam && UUID_REGEX.test(sessionParam) ? sessionParam : undefined,
      visitorId: visitorParam || undefined,
    }
  })
  const [services, setServices] = useState<Service[] | null>(null)
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const [days, setDays] = useState<DaySlots[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<number | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [customerSubmitting, setCustomerSubmitting] = useState(false)
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setFetchError(null)
      try {
        const res = await fetch(`/api/book/${businessId}/services`)
        if (!res.ok) throw new Error('Failed to load services')
        const data: Service[] = await res.json()
        if (!cancelled) setServices(data)
      } catch (err) {
        if (!cancelled) setFetchError((err as Error).message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [businessId])

  const fetchStaff = useCallback(
    async (serviceId: string) => {
      setStaff(null)
      setFetchError(null)
      try {
        const res = await fetch(`/api/book/${businessId}/staff?serviceId=${serviceId}`)
        if (!res.ok) throw new Error('Failed to load staff')
        const data: StaffMember[] = await res.json()
        return data
      } catch (err) {
        setFetchError((err as Error).message)
        return null
      }
    },
    [businessId]
  )

  const fetchSlots = useCallback(
    async (staffId: string, serviceId: string) => {
      setDays(null)
      setFetchError(null)
      try {
        const res = await fetch(
          `/api/book/${businessId}/slots?staffId=${staffId}&serviceId=${serviceId}`
        )
        if (!res.ok) throw new Error('Failed to load time slots')
        const data: DaySlots[] = await res.json()
        return data
      } catch (err) {
        setFetchError((err as Error).message)
        return null
      }
    },
    [businessId]
  )

  const handleSelectService = useCallback(
    async (service: Service) => {
      setState((prev) => ({
        ...prev,
        selectedService: service,
        selectedStaff: null,
        selectedDate: null,
        selectedSlot: null,
      }))
      const fetched = await fetchStaff(service.id)
      if (!fetched) return
      setStaff(fetched)
      if (fetched.length === 1) {
        const solo = fetched[0]
        const slotDays = await fetchSlots(solo.id, service.id)
        if (!slotDays) return
        setDays(slotDays)
        const firstAvailable = slotDays.find((d) => d.slots.length > 0)
        setState((prev) => ({
          ...prev,
          selectedStaff: solo,
          selectedDate: firstAvailable?.date ?? null,
          currentStep: 3,
          completedSteps: new Set([...Array.from(prev.completedSteps), 1, 2]),
        }))
      }
    },
    [fetchStaff, fetchSlots]
  )

  const handleSelectStaff = useCallback((member: StaffMember) => {
    setState((prev) => ({
      ...prev,
      selectedStaff: member,
      selectedDate: null,
      selectedSlot: null,
    }))
  }, [])

  const handleSelectSlot = useCallback((date: string, slot: Slot) => {
    setState((prev) => ({ ...prev, selectedDate: date, selectedSlot: slot }))
  }, [])

  const handleDateChange = useCallback((date: string) => {
    setState((prev) => ({ ...prev, selectedDate: date, selectedSlot: null }))
  }, [])

  const handlePrevious = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep === 1) return prev
      const nextStep = (prev.currentStep - 1) as Step
      const nextCompleted = new Set(prev.completedSteps)
      nextCompleted.delete(prev.currentStep)
      nextCompleted.delete(nextStep)
      return { ...prev, currentStep: nextStep, completedSteps: nextCompleted }
    })
    setValidationError(null)
    setSubmitError(null)
    setSubmitErrorCode(null)
  }, [])

  const upsertWidgetCustomer = useCallback(async (): Promise<string | null> => {
    const { visitorId, chatSessionId, customerInfo } = state
    if (!visitorId) return null
    const email = customerInfo.email.trim()
    if (!email) return null
    try {
      const res = await fetch(`/api/widget/${businessId}/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: customerInfo.name.trim() || null,
          phone: customerInfo.phone.trim() || null,
          visitor_id: visitorId,
          session_id: chatSessionId || undefined,
        }),
      })
      if (!res.ok) return null
      const data: { id?: string; customer_id?: string } = await res.json()
      return data.id || data.customer_id || null
    } catch {
      return null
    }
  }, [businessId, state])

  const handleNext = useCallback(async () => {
    const { currentStep, selectedService, selectedStaff, customerInfo } = state

    if (currentStep === 1 && selectedService) {
      setState((prev) => ({
        ...prev,
        currentStep: 2,
        completedSteps: new Set([...Array.from(prev.completedSteps), 1]),
      }))
      return
    }

    if (currentStep === 2 && selectedService && selectedStaff) {
      const slotDays = await fetchSlots(selectedStaff.id, selectedService.id)
      if (!slotDays) return
      setDays(slotDays)
      const firstAvailable = slotDays.find((d) => d.slots.length > 0)
      setState((prev) => ({
        ...prev,
        selectedDate: firstAvailable?.date ?? null,
        currentStep: 3,
        completedSteps: new Set([...Array.from(prev.completedSteps), 2]),
      }))
      return
    }

    if (currentStep === 3) {
      setState((prev) => ({
        ...prev,
        currentStep: 4,
        completedSteps: new Set([...Array.from(prev.completedSteps), 3]),
      }))
      return
    }

    if (currentStep === 4) {
      const name = customerInfo.name.trim()
      const email = customerInfo.email.trim()

      if (!name) {
        setValidationError('Please enter your name.')
        return
      }
      if (!email || !EMAIL_REGEX.test(email)) {
        setValidationError('Please enter a valid email address.')
        return
      }
      setValidationError(null)
      setCustomerSubmitting(true)
      const widgetCustomerId = await upsertWidgetCustomer()
      setCustomerSubmitting(false)
      setState((prev) => ({
        ...prev,
        widgetCustomerId: widgetCustomerId || prev.widgetCustomerId,
        currentStep: 5,
        completedSteps: new Set([...Array.from(prev.completedSteps), 4]),
      }))
      return
    }

    if (currentStep === 5) {
      setState((prev) => ({
        ...prev,
        currentStep: 6,
        completedSteps: new Set([...Array.from(prev.completedSteps), 5]),
      }))
      return
    }
  }, [state, fetchSlots, upsertWidgetCustomer])

  const handleConfirm = useCallback(async () => {
    const {
      selectedService,
      selectedStaff,
      selectedDate,
      selectedSlot,
      customerInfo,
      chatSessionId,
      visitorId,
      widgetCustomerId,
    } = state
    if (!selectedService || !selectedStaff || !selectedDate || !selectedSlot) return

    const name = customerInfo.name.trim()
    const email = customerInfo.email.trim()
    const phone = customerInfo.phone.trim()

    if (!name) {
      setValidationError('Please enter your name.')
      return
    }
    if (!email && !phone) {
      setValidationError('Please provide at least an email or phone number.')
      return
    }
    setValidationError(null)
    setSubmitError(null)
    setSubmitErrorCode(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/book/${businessId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          staff_id: selectedStaff.id,
          appointment_date: selectedDate,
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          payment_method: 'cash_on_arrival',
          customer_name: name,
          customer_email: email || undefined,
          customer_phone: phone || undefined,
          ...(chatSessionId ? { chat_session_id: chatSessionId } : {}),
          ...(visitorId ? { visitor_id: visitorId } : {}),
          ...(widgetCustomerId ? { widget_customer_id: widgetCustomerId } : {}),
        }),
      })
      if (res.status === 201) {
        const data: Appointment = await res.json()
        setConfirmedAppointment(data)
        return
      }
      const body = await res.json().catch(() => ({}))
      setSubmitErrorCode(res.status)
      setSubmitError(body?.error || 'Something went wrong. Please try again.')
    } catch (err) {
      setSubmitError((err as Error).message || 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [businessId, state])

  const handleSlotFullRetry = useCallback(async () => {
    const { selectedService, selectedStaff } = state
    setSubmitError(null)
    setSubmitErrorCode(null)
    if (!selectedService || !selectedStaff) return
    const slotDays = await fetchSlots(selectedStaff.id, selectedService.id)
    if (!slotDays) return
    setDays(slotDays)
    const firstAvailable = slotDays.find((d) => d.slots.length > 0)
    setState((prev) => {
      const nextCompleted = new Set(prev.completedSteps)
      nextCompleted.delete(3)
      nextCompleted.delete(4)
      nextCompleted.delete(5)
      return {
        ...prev,
        selectedDate: firstAvailable?.date ?? null,
        selectedSlot: null,
        currentStep: 3,
        completedSteps: nextCompleted,
      }
    })
  }, [fetchSlots, state])

  const nextDisabled = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return !state.selectedService || !staff
      case 2:
        return !state.selectedStaff
      case 3:
        return !state.selectedSlot
      case 4:
        return customerSubmitting
      case 5:
        return !state.paymentMethod
      default:
        return false
    }
  }, [state, staff, customerSubmitting])

  if (confirmedAppointment && state.selectedService && state.selectedStaff && state.selectedDate && state.selectedSlot) {
    return (
      <SuccessView
        service={state.selectedService}
        staff={state.selectedStaff}
        date={state.selectedDate}
        slot={state.selectedSlot}
        paymentMethod={state.paymentMethod}
        customerName={state.customerInfo.name}
      />
    )
  }

  return (
    <div>
      <StepIndicator currentStep={state.currentStep} completedSteps={state.completedSteps} />

      {fetchError && (
        <div className="mb-4">
          <ErrorBanner message={fetchError} />
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        {state.currentStep === 1 && (
          services === null ? (
            <Spinner label="Loading services..." />
          ) : (
            <StepService
              services={services}
              selectedId={state.selectedService?.id ?? null}
              onSelect={handleSelectService}
            />
          )
        )}

        {state.currentStep === 2 && (
          staff === null ? (
            <Spinner label="Loading staff..." />
          ) : (
            <StepStaff
              staff={staff}
              selectedId={state.selectedStaff?.id ?? null}
              onSelect={handleSelectStaff}
            />
          )
        )}

        {state.currentStep === 3 && state.selectedService && (
          days === null ? (
            <Spinner label="Loading available times..." />
          ) : (
            <StepSlots
              days={days}
              service={state.selectedService}
              selectedDate={state.selectedDate}
              selectedSlot={state.selectedSlot}
              onSelect={handleSelectSlot}
              onDateChange={handleDateChange}
            />
          )
        )}

        {state.currentStep === 4 && (
          <StepCustomerDetails
            value={state.customerInfo}
            onChange={(info) => setState((prev) => ({ ...prev, customerInfo: info }))}
            validationError={validationError}
          />
        )}

        {state.currentStep === 5 && (
          <StepPayment
            value={state.paymentMethod}
            onChange={(method) => setState((prev) => ({ ...prev, paymentMethod: method }))}
          />
        )}

        {state.currentStep === 6 &&
          state.selectedService &&
          state.selectedStaff &&
          state.selectedDate &&
          state.selectedSlot && (
            <StepConfirm
              service={state.selectedService}
              staff={state.selectedStaff}
              date={state.selectedDate}
              slot={state.selectedSlot}
              paymentMethod={state.paymentMethod}
              customerInfo={state.customerInfo}
              onChange={(info) => setState((prev) => ({ ...prev, customerInfo: info }))}
              validationError={validationError}
            />
          )}

        {submitError && (
          <div className="mt-4">
            <ErrorBanner
              message={submitError}
              actionLabel={submitErrorCode === 409 ? 'Pick another time' : undefined}
              onAction={submitErrorCode === 409 ? handleSlotFullRetry : undefined}
            />
          </div>
        )}
      </div>

      {state.currentStep < 6 ? (
        <WizardFooter
          onPrevious={handlePrevious}
          onNext={handleNext}
          nextDisabled={nextDisabled}
          nextLoading={customerSubmitting && state.currentStep === 4}
          hidePrevious={state.currentStep === 1}
        />
      ) : (
        <WizardFooter
          onPrevious={handlePrevious}
          onNext={handleConfirm}
          nextLabel="Confirm Booking"
          nextLoading={submitting}
          nextDisabled={submitting}
        />
      )}
    </div>
  )
}
