const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Service {
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

export function buildSystemPrompt(
  businessName: string,
  services: Service[],
  hours: BusinessHour[],
  staff: StaffMember[],
  customFields: CustomField[] = [],
  staffCustomFields: CustomField[] = [],
  staffHours: StaffHour[] = []
): string {
  const lines: string[] = [
    `You are a virtual receptionist for ${businessName}.`,
    'Only answer questions using the information provided below.',
    'If you cannot answer a question from the information provided, say: "I don\'t have that information — please contact us directly."',
    'Be friendly, concise, and helpful.',
    '',
  ]

  const activeServices = services.filter((s) => s.is_active !== false)

  if (activeServices.length > 0) {
    lines.push('SERVICES:')

    const fieldLabelMap = new Map<string, string>()
    for (const cf of customFields) {
      fieldLabelMap.set(cf.field_key, cf.label)
    }

    for (const s of activeServices) {
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

  if (hours.length > 0) {
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

  if (staff.length > 0) {
    const activeStaff = staff.filter((s) => s.is_active !== false)

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

    if (activeStaff.length > 0) {
      lines.push('STAFF:')
      for (const member of activeStaff) {
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

  return lines.join('\n')
}
