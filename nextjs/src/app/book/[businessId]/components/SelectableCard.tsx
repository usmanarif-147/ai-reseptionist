interface SelectableCardProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

export function SelectableCard({ selected, onClick, children, disabled }: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border-2 bg-white p-5 text-left transition-all ${
        selected
          ? 'border-blue-600 shadow-sm ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-blue-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}
