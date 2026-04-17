import { SelectableCard } from './SelectableCard'
import type { Service } from './types'

interface StepServiceProps {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export function StepService({ services, selectedId, onSelect }: StepServiceProps) {
  if (services.length === 0) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No services are available right now. Please check back later.
      </p>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Choose a service</h2>
      <p className="mb-5 text-sm text-gray-500">Select what you&apos;d like to book.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {services.map((service) => (
          <SelectableCard
            key={service.id}
            selected={selectedId === service.id}
            onClick={() => onSelect(service)}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <span className="shrink-0 text-sm font-semibold text-blue-600">
                  ${service.price}
                </span>
              </div>
              {service.description && (
                <p className="line-clamp-2 text-sm text-gray-600">{service.description}</p>
              )}
              <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
            </div>
          </SelectableCard>
        ))}
      </div>
    </div>
  )
}
