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

export interface CustomerData {
  name?: string | null
  email?: string | null
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
  businessInfo?: BusinessInfo,
  intent?: string,
  customerData?: CustomerData
): string {
  const vs = visibilitySettings

  const displayName = vs && !vs.show_business_name ? 'this business' : businessName

  const hasCustomerEmail = Boolean(customerData?.email)

  const lines: string[] = [
    `You are a virtual receptionist for ${displayName}.`,
    'Only answer questions using the information provided below.',
    'If you cannot answer a question from the information provided, say: "I don\'t have that information — please contact us directly."',
    'Be friendly, concise, and helpful.',
    '',
    'ANONYMOUS VISITORS:',
    'The visitor may be anonymous — you may not know who they are. That is fine. Never demand personal information (name, email, phone) for general questions about services, hours, staff, pricing, or the business itself. Answer those questions directly.',
    '',
  ]

  // Contact-request signal — only when we don't yet have the visitor's email
  if (!hasCustomerEmail) {
    lines.push('CONTACT REQUEST SIGNAL:')
    lines.push('When the visitor expresses booking intent or wants to look up an existing appointment, and you do not yet have their email address, emit [REQUEST_CONTACT] on a line by itself at the very start of your reply, then continue with a brief friendly acknowledgement (e.g. "Sure — to help with that, we\'ll just need a couple of details."). The widget will show an inline contact form to the visitor.')
    lines.push('Do NOT emit [REQUEST_CONTACT] for general questions (services, hours, staff, pricing, address).')
    lines.push('Do NOT repeat [REQUEST_CONTACT] in the same conversation. If the visitor has already been asked and declined to share contact info, continue the conversation gracefully without asking again.')
    lines.push('If the visitor chooses not to provide contact info, answer what you can from the information below and do not pressure them.')
    lines.push('')
  }

  // Intent-specific instruction
  if (intent) {
    lines.push('CUSTOMER INTENT:')
    if (intent === 'basic_information') {
      lines.push('The customer wants general information. Answer questions about services, hours, staff, and pricing.')
      lines.push('Do not bring up appointment booking unless the customer asks.')
    } else if (intent === 'book_appointment') {
      lines.push('The customer wants to book an appointment. Guide them toward booking.')
      lines.push('Share the booking link early in the conversation and encourage them to book there.')
    } else if (intent === 'appointment_details') {
      lines.push('The customer wants to check an existing appointment. They provided their appointment number.')
      lines.push('Look up and share the appointment details using the visible fields listed below.')
      lines.push('If appointment number was not provided, ask for it before proceeding.')
    }
    lines.push('')
  }

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

  // Returning customer greeting
  if (customerData) {
    lines.push('CUSTOMER GREETING:')
    if (customerData.name) {
      lines.push(`Greet this customer by name — "Welcome back, ${customerData.name}!"`)
    } else if (customerData.email) {
      lines.push('Greet warmly without name — "Welcome back! Great to hear from you again."')
    }
    lines.push('')
  }

  // Non-configurable rules — always appended
  lines.push('IMPORTANT RULES (always enforce, non-negotiable):')
  lines.push('- Refund requests: Never handle them. Always redirect customer to contact the business directly.')
  lines.push('- Appointment booking: Never collect booking details in chat. Share the booking link only and direct the customer to book there.')
  lines.push('- Appointment lookup: Customers must provide their 8-digit appointment number for you to look up their appointment.')
  lines.push('')

  // Scope guard
  lines.push('SCOPE GUARD:')
  lines.push(`Only answer questions directly related to ${displayName} and its services. If the customer asks about anything unrelated, respond politely: "I can only help with questions about ${displayName}. For other topics, please use a general search engine or contact us directly."`)
  lines.push('')

  // Closing phrase detection
  lines.push('CONVERSATION ENDING:')
  lines.push('If the customer uses closing phrases such as "thank you", "bye", "that\'s all", "I\'m done", or similar signals they are finished — do NOT end immediately. Respond: "You\'re welcome! Is there anything else I can help you with, or shall we wrap up?" Wait for their response. If they confirm done (e.g. "no that\'s all", "yes wrap up"), reply: "Thank you for chatting with us. Have a great day! [END_CONVERSATION]". If they want to continue, proceed normally.')
  lines.push('')

  // Natural goodbye detection — judgemental, not keyword-based.
  lines.push('NATURAL GOODBYES:')
  lines.push('Read the visitor\'s intent, not their wording. If their latest message clearly signals they are wrapping up or leaving — e.g. gratitude that closes the thread ("thanks, super helpful"), a soft exit ("I\'ll think about it and get back to you"), a farewell ("have a nice day", "catch you later"), or an explicit stop ("no more questions", "that\'s everything") — close warmly on that beat.')
  lines.push('Match the visitor\'s tone and energy: if they\'re casual, reply casually; if they\'re formal, reply formally; keep it to one or two sentences.')
  lines.push('Then emit [END_CONVERSATION] at the very end of that same reply, exactly as written.')
  lines.push('Do NOT guess — if there is any real chance the visitor still has a question, prefer the confirming prompt from CONVERSATION ENDING above instead of closing.')
  lines.push('Do NOT pattern-match on keywords; classify the intent of what they\'re actually saying.')
  lines.push('')

  return lines.join('\n')
}
