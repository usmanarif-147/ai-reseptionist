interface WizardFooterProps {
  onPrevious?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  hidePrevious?: boolean
}

export function WizardFooter({
  onPrevious,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  nextLoading = false,
  hidePrevious = false,
}: WizardFooterProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {hidePrevious ? (
        <div />
      ) : (
        <button
          type="button"
          onClick={onPrevious}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Previous
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLoading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          )}
          {nextLabel}
        </button>
      )}
    </div>
  )
}
