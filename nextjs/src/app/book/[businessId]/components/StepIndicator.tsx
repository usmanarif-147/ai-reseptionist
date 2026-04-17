const TOTAL_STEPS = 5

const STEP_LABELS = ['Service', 'Staff', 'Time', 'Payment', 'Confirm'] as const

interface StepIndicatorProps {
  currentStep: number
  completedSteps: Set<number>
}

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step, idx) => {
          const isCurrent = step === currentStep
          const isCompleted = completedSteps.has(step)
          const isLast = idx === TOTAL_STEPS - 1

          return (
            <li key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isCurrent
                        ? 'border-blue-600 bg-white text-blue-600'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`mt-1 hidden text-xs sm:block ${
                    isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {STEP_LABELS[idx]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`mx-2 h-0.5 flex-1 -translate-y-2 sm:mx-3 ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
