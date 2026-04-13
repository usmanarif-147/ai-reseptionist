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
  name: string
  role: string | null
}

interface CustomField {
  label: string
  field_key: string
}

export function buildSystemPrompt(
  businessName: string,
  services: Service[],
  hours: BusinessHour[],
  staff: StaffMember[],
  customFields: CustomField[] = []
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
    lines.push('STAFF:')
    for (const member of staff) {
      const role = member.role ? ` (${member.role})` : ''
      lines.push(`- ${member.name}${role}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
