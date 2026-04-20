export type VisitorTier = 'customer' | 'lead' | 'frequent_visitor' | 'one_time_visitor'

export type ClassifierInput =
  | { kind: 'identified'; totalAppointments: number }
  | { kind: 'anonymous'; sessionCount: number }

export function classifyVisitor(input: ClassifierInput): VisitorTier {
  if (input.kind === 'identified') {
    return input.totalAppointments >= 1 ? 'customer' : 'lead'
  }
  return input.sessionCount >= 2 ? 'frequent_visitor' : 'one_time_visitor'
}
