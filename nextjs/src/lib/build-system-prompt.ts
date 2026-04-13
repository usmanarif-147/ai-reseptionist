const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Service {
  id?: string
  name: string
  description: string | null
  price: number | null
  duration_minutes: number | null
  category: string | null
  is_active: boolean
  meta: Record<string, unknown>
}

interface BusinessHour {
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

interface StaffMember {
  id?: string
  name: string
  role: string | null
  bio?: string | null
  is_active?: boolean
  meta?: Record<string, unknown>
}

interface CustomField {
  label: string
  field_key: string
}

interface StaffHour {
  staff_id: string
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

export interface VisibilitySettings {
  show_business_name: boolean
  show_contact: boolean
  show_address: boolean
  show_business_type: boolean
  show_business_hours: boolean
  services_visibility: 'active_only' | 'all' | 'hide_specific'
  hidden_service_ids: string[]
  staff_visibility: 'active_only' | 'all' | 'hide_specific'
  hidden_staff_ids: string[]
  show_appointment_service: boolean
  show_appointment_staff: boolean
  show_appointment_datetime: boolean
  show_appointment_duration: boolean
  show_appointment_payment_type: boolean
  show_appointment_payment_status: boolean
  show_appointment_notes: boolean
}

// Single source of truth for all widget visibility defaults.
// Import this constant wherever fallback values are needed — never hardcode defaults elsewhere.
export const DEFAULT_VISIBILITY_SETTINGS: VisibilitySettings = {
  show_business_name: false,
  show_contact: false,
  show_address: false,
  show_business_type: false,
  show_business_hours: false,
  services_visibility: 'active_only',
  hidden_service_ids: [],
  staff_visibility: 'active_only',
  hidden_staff_ids: [],
  show_appointment_service: false,
  show_appointment_staff: false,
  show_appointment_datetime: false,
  show_appointment_duration: false,
  show_appointment_payment_type: false,
  show_appointment_payment_status: false,
  show_appointment_notes: false,
}

interface BusinessInfo {
  contact?: string | null
  address?: string | null
  type?: string | null
}

export function buildSystemPrompt(
  businessName: string,
  services: Service[],
  hours: BusinessHour[],
  staff: StaffMember[],
  customFields: CustomField[] = [],
  staffCustomFields: CustomField[] = [],
  staffHours: StaffHour[] = [],
  visibilitySettings?: VisibilitySettings,
  businessInfo?: BusinessInfo
): string {
  const vs = visibilitySettings

  const displayName = vs && !vs.show_business_name ? 'this business' : businessName

  const lines: string[] = [
    `You are a virtual receptionist for ${displayName}.`,
    'Only answer questions using the information provided below.',
    'If you cannot answer a question from the information provided, say: "I don\'t have that information — please contact us directly."',
    'Be friendly, concise, and helpful.',
    '',
  ]

  // Business info section
  if (businessInfo) {
    const infoLines: string[] = []
    if (vs?.show_business_type && businessInfo.type) {
      infoLines.push(`Business type: ${businessInfo.type}`)
    }
    if (vs?.show_contact && businessInfo.contact) {
      infoLines.push(`Contact: ${businessInfo.contact}`)
    }
    if (vs?.show_address && businessInfo.address) {
      infoLines.push(`Address: ${businessInfo.address}`)
    }
    if (infoLines.length > 0) {
      lines.push('BUSINESS INFO:')
      for (const line of infoLines) {
        lines.push(`- ${line}`)
      }
      lines.push('')
    }
  }

  // Filter services based on visibility settings
  let filteredServices: Service[]
  if (vs) {
    switch (vs.services_visibility) {
      case 'all':
        filteredServices = services
        break
      case 'hide_specific': {
        const hiddenIds = new Set(vs.hidden_service_ids)
        filteredServices = services.filter((s) => !s.id || !hiddenIds.has(s.id))
        break
      }
      case 'active_only':
      default:
        filteredServices = services.filter((s) => s.is_active !== false)
        break
    }
  } else {
    filteredServices = services.filter((s) => s.is_active !== false)
  }

  if (filteredServices.length > 0) {
    lines.push('SERVICES:')

    const fieldLabelMap = new Map<string, string>()
    for (const cf of customFields) {
      fieldLabelMap.set(cf.field_key, cf.label)
    }

    for (const s of filteredServices) {
      const parts = [s.name]
      if (s.description) parts.push(s.description)
      if (s.price != null) parts.push(`$${Number(s.price).toFixed(2)}`)
      if (s.duration_minutes != null) parts.push(`${s.duration_minutes} min`)
      lines.push(`- ${parts.join(' — ')}`)

      if (s.meta && typeof s.meta === 'object') {
        for (const [key, value] of Object.entries(s.meta)) {
          const label = fieldLabelMap.get(key)
          if (!label) continue
          lines.push(`    • ${label}: ${value}`)
        }
      }
    }
    lines.push('')
  }

  // Business hours (conditionally included)
  if (vs?.show_business_hours && hours.length > 0) {
    lines.push('BUSINESS HOURS:')
    for (const h of hours) {
      const day = DAY_NAMES[h.day_of_week] ?? `Day ${h.day_of_week}`
      if (h.is_closed) {
        lines.push(`- ${day}: Closed`)
      } else {
        lines.push(`- ${day}: ${h.open_time ?? '?'} – ${h.close_time ?? '?'}`)
      }
    }
    lines.push('')
  }

  // Filter staff based on visibility settings
  if (staff.length > 0) {
    let filteredStaff: StaffMember[]
    if (vs) {
      switch (vs.staff_visibility) {
        case 'all':
          filteredStaff = staff
          break
        case 'hide_specific': {
          const hiddenIds = new Set(vs.hidden_staff_ids)
          filteredStaff = staff.filter((s) => !s.id || !hiddenIds.has(s.id))
          break
        }
        case 'active_only':
        default:
          filteredStaff = staff.filter((s) => s.is_active !== false)
          break
      }
    } else {
      filteredStaff = staff.filter((s) => s.is_active !== false)
    }

    const staffFieldLabelMap = new Map<string, string>()
    for (const cf of staffCustomFields) {
      staffFieldLabelMap.set(cf.field_key, cf.label)
    }

    const staffHoursByStaffId = new Map<string, StaffHour[]>()
    for (const sh of staffHours) {
      const existing = staffHoursByStaffId.get(sh.staff_id) ?? []
      existing.push(sh)
      staffHoursByStaffId.set(sh.staff_id, existing)
    }

    if (filteredStaff.length > 0) {
      lines.push('STAFF:')
      for (const member of filteredStaff) {
        const role = member.role ? ` (${member.role})` : ''
        lines.push(`- ${member.name}${role}`)

        if (member.bio) {
          lines.push(`    Bio: ${member.bio}`)
        }

        if (member.meta && typeof member.meta === 'object') {
          for (const [key, value] of Object.entries(member.meta)) {
            const label = staffFieldLabelMap.get(key)
            if (!label) continue
            lines.push(`    • ${label}: ${value}`)
          }
        }

        if (member.id) {
          const memberHours = staffHoursByStaffId.get(member.id)
          if (memberHours && memberHours.length > 0) {
            lines.push('    Hours:')
            for (const h of memberHours) {
              const day = DAY_NAMES[h.day_of_week] ?? `Day ${h.day_of_week}`
              if (h.is_closed) {
                lines.push(`      ${day}: Off`)
              } else {
                lines.push(`      ${day}: ${h.open_time ?? '?'} – ${h.close_time ?? '?'}`)
              }
            }
          } else {
            lines.push('    Hours: Follows general business hours')
          }
        }
      }
      lines.push('')
    }
  }

  // Appointment lookup fields (visible fields only)
  if (vs) {
    const appointmentFields: string[] = []
    if (vs.show_appointment_service) appointmentFields.push('Service name')
    if (vs.show_appointment_staff) appointmentFields.push('Staff member')
    if (vs.show_appointment_datetime) appointmentFields.push('Date and time')
    if (vs.show_appointment_duration) appointmentFields.push('Duration')
    if (vs.show_appointment_payment_type) appointmentFields.push('Payment type')
    if (vs.show_appointment_payment_status) appointmentFields.push('Payment status')
    if (vs.show_appointment_notes) appointmentFields.push('Notes')

    if (appointmentFields.length > 0) {
      lines.push('APPOINTMENT LOOKUP — visible fields to share with customer:')
      for (const field of appointmentFields) {
        lines.push(`- ${field}`)
      }
      lines.push('')
    }
  }

  // Non-configurable rules — always appended
  lines.push('IMPORTANT RULES (always enforce, non-negotiable):')
  lines.push('- Refund requests: Never handle them. Always redirect customer to contact the business directly.')
  lines.push('- Appointment booking: Never collect booking details in chat. Share the booking link only and direct the customer to book there.')
  lines.push('- Appointment lookup: Customers must provide their 8-digit appointment number for you to look up their appointment.')
  lines.push('')

  return lines.join('\n')
}
