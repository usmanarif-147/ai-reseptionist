export type VisitorIntent = 'basic_information' | 'book_appointment' | 'appointment_details'

// Multi-word phrases are checked first so "appointment number" / "booking number"
// beat the bare "appointment" keyword in BOOK_APPOINTMENT_KEYWORDS.
const APPOINTMENT_DETAILS_KEYWORDS = [
  'appointment number',
  'booking number',
  'look up',
  'lookup',
  'reschedule',
  'existing',
  'upcoming',
  'manage',
  'status',
  'cancel',
  'check',
  'find',
]

const BOOK_APPOINTMENT_KEYWORDS = [
  'next available',
  'how to book',
  'when can',
  'book',
  'schedule',
  'appointment',
  'reserve',
  'available',
]

export function inferIntent(message: string): VisitorIntent {
  if (!message || typeof message !== 'string') return 'basic_information'

  const normalized = message.toLowerCase()

  for (const kw of APPOINTMENT_DETAILS_KEYWORDS) {
    if (normalized.includes(kw)) return 'appointment_details'
  }

  for (const kw of BOOK_APPOINTMENT_KEYWORDS) {
    if (normalized.includes(kw)) return 'book_appointment'
  }

  return 'basic_information'
}
