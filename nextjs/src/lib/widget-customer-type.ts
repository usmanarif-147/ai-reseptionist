export function deriveCustomerType(totalSessions: number, totalAppointments: number): string {
  if (totalAppointments >= 3) return 'regular_customer'
  if (totalAppointments >= 1) return 'booked_customer'
  if (totalSessions >= 3 && totalAppointments === 0) return 'interested_prospect'
  if (totalSessions > 1 && totalAppointments === 0) return 'returning_visitor'
  return 'new_visitor'
}
