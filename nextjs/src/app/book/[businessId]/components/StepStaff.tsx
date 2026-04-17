import { SelectableCard } from './SelectableCard'
import type { StaffMember } from './types'

interface StepStaffProps {
  staff: StaffMember[]
  selectedId: string | null
  onSelect: (staff: StaffMember) => void
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export function StepStaff({ staff, selectedId, onSelect }: StepStaffProps) {
  if (staff.length === 0) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-semibold text-gray-900">Choose a staff member</h2>
        <p className="mb-5 text-sm text-gray-500">Pick who you&apos;d like to see.</p>
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No staff available for this service.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Choose a staff member</h2>
      <p className="mb-5 text-sm text-gray-500">Pick who you&apos;d like to see.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {staff.map((member) => (
          <SelectableCard
            key={member.id}
            selected={selectedId === member.id}
            onClick={() => onSelect(member)}
          >
            <div className="flex items-start gap-3">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initials(member.name) || '?'}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-gray-900">{member.name}</h3>
                {member.role && <p className="text-sm text-gray-600">{member.role}</p>}
                {member.bio && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{member.bio}</p>
                )}
              </div>
            </div>
          </SelectableCard>
        ))}
      </div>
    </div>
  )
}
