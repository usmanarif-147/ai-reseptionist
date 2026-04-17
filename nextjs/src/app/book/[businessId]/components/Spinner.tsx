export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  )
}
