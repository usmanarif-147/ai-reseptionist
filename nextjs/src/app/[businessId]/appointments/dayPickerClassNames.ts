export const dayPickerClassNames = {
  root: 'rdp text-sm',
  months: 'flex flex-col gap-4',
  month: 'space-y-3',
  month_caption: 'flex justify-center items-center h-10 font-semibold text-gray-900',
  caption_label: 'text-sm font-semibold',
  nav: 'flex items-center justify-between absolute w-full px-2',
  button_previous:
    'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40',
  button_next:
    'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'text-xs font-medium text-gray-400 w-9 h-9 flex items-center justify-center',
  week: 'flex',
  day: 'w-9 h-9 text-sm',
  day_button:
    'w-9 h-9 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400',
  outside: 'text-gray-300',
  disabled: 'text-gray-300 cursor-not-allowed',
}
