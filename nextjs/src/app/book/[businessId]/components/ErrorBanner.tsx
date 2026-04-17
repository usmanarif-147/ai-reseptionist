interface ErrorBannerProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorBanner({ message, actionLabel, onAction }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
