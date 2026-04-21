export interface NavItem {
  label: string
  href: string
  icon: string
  children?: NavItem[]
  keywords?: string[]
}

export const mainNav: NavItem[] = [
  {
    label: 'Overview',
    href: '/[businessId]/overview',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    keywords: ['home', 'dashboard', 'stats', 'summary', 'checklist', 'metrics'],
  },
  {
    label: 'Appointments',
    href: '/[businessId]/appointments',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    keywords: ['book', 'bookings', 'calendar', 'schedule', 'reservations'],
  },
  {
    label: 'Customers',
    href: '/[businessId]/customers',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    keywords: ['clients', 'contacts', 'people', 'leads'],
  },
  {
    label: 'Services',
    href: '/[businessId]/services',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    keywords: ['offerings', 'treatments', 'pricing', 'catalog', 'menu'],
  },
  {
    label: 'Staff',
    href: '/[businessId]/staff',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    keywords: ['team', 'employees', 'providers', 'members'],
  },
  {
    label: 'Widget Settings',
    href: '/[businessId]/widget-settings',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    keywords: ['chat', 'embed', 'widget', 'appearance', 'customize'],
    children: [
      {
        label: 'Appearance',
        href: '/[businessId]/widget-settings/appearance',
        icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
        keywords: ['design', 'color', 'theme', 'look', 'style', 'branding'],
      },
      {
        label: 'Information Control',
        href: '/[businessId]/widget-settings/information-control',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        keywords: ['visibility', 'content', 'data', 'disclosure', 'privacy'],
      },
      {
        label: 'Embed Code',
        href: '/[businessId]/widget-settings/embed-code',
        icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
        keywords: ['install', 'script', 'integration', 'snippet', 'copy'],
      },
    ],
  },
  {
    label: 'Settings',
    href: '/[businessId]/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    keywords: ['configuration', 'preferences', 'account', 'business', 'profile'],
    children: [
      {
        label: 'Business Profile',
        href: '/[businessId]/settings/business-profile',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
        keywords: ['company', 'name', 'address', 'contact', 'details'],
      },
      {
        label: 'Account',
        href: '/[businessId]/settings/account',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        keywords: ['email', 'password', 'user', 'login', 'credentials'],
      },
      {
        label: 'Business Hours',
        href: '/[businessId]/settings/business-hours',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        keywords: ['schedule', 'opening', 'closing', 'hours', 'availability', 'timings'],
      },
      {
        label: 'Holidays',
        href: '/[businessId]/settings/holidays',
        icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
        keywords: ['closed', 'days off', 'vacation', 'breaks', 'time off'],
      },
      {
        label: 'Custom Fields',
        href: '/[businessId]/settings/custom-fields',
        icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
        keywords: ['extra', 'attributes', 'metadata', 'forms', 'fields'],
      },
      {
        label: 'Payments',
        href: '/[businessId]/settings/payments',
        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        keywords: ['stripe', 'card', 'billing', 'checkout', 'payment provider'],
      },
      {
        label: 'Subscription',
        href: '/[businessId]/settings/subscription',
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        keywords: ['plan', 'billing', 'invoice', 'subscription', 'trial'],
      },
    ],
  },
]

export const settingsNav: NavItem[] = [
  {
    label: 'Business Profile',
    href: '/[businessId]/settings/business-profile',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    keywords: ['company', 'name', 'address', 'contact', 'details', 'profile'],
  },
  {
    label: 'Account',
    href: '/[businessId]/settings/account',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    keywords: ['email', 'password', 'user', 'login', 'credentials'],
  },
  {
    label: 'Business Hours',
    href: '/[businessId]/settings/business-hours',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    keywords: ['schedule', 'opening', 'closing', 'hours', 'availability', 'timings'],
  },
  {
    label: 'Holidays',
    href: '/[businessId]/settings/holidays',
    icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    keywords: ['closed', 'days off', 'vacation', 'breaks', 'time off'],
  },
  {
    label: 'Custom Fields',
    href: '/[businessId]/settings/custom-fields',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    keywords: ['extra', 'attributes', 'metadata', 'forms', 'fields'],
  },
  {
    label: 'Payments',
    href: '/[businessId]/settings/payments',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    keywords: ['stripe', 'card', 'billing', 'checkout', 'payment provider'],
  },
  {
    label: 'Subscription',
    href: '/[businessId]/settings/subscription',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    keywords: ['plan', 'billing', 'invoice', 'subscription', 'trial'],
  },
]

export const widgetSettingsNav: NavItem[] = [
  {
    label: 'Appearance',
    href: '/[businessId]/widget-settings/appearance',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    keywords: ['design', 'color', 'theme', 'look', 'style', 'branding'],
  },
  {
    label: 'Information Control',
    href: '/[businessId]/widget-settings/information-control',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    keywords: ['visibility', 'content', 'data', 'disclosure', 'privacy'],
  },
  {
    label: 'Embed Code',
    href: '/[businessId]/widget-settings/embed-code',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    keywords: ['install', 'script', 'integration', 'snippet', 'copy'],
  },
]

export const widgetAppearanceNav: NavItem[] = [
  {
    label: 'General',
    href: '/[businessId]/widget-settings/appearance/general',
    icon: 'M4 6h16M4 12h16M4 18h16',
    keywords: ['basics', 'defaults', 'overall', 'main'],
  },
  {
    label: 'Tooltip',
    href: '/[businessId]/widget-settings/appearance/tooltip',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    keywords: ['hint', 'label', 'popup', 'bubble', 'message'],
  },
  {
    label: 'Avatar',
    href: '/[businessId]/widget-settings/appearance/avatar',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    keywords: ['profile', 'image', 'icon', 'picture', 'face'],
  },
  {
    label: 'Header',
    href: '/[businessId]/widget-settings/appearance/header',
    icon: 'M4 6h16M4 10h16',
    keywords: ['title', 'top', 'bar', 'banner', 'heading'],
  },
  {
    label: 'Typing Indicator',
    href: '/[businessId]/widget-settings/appearance/typing-indicator',
    icon: 'M12 4v1m6.364 1.636l-.707.707M20 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    keywords: ['loading', 'dots', 'animation', 'thinking', 'pending'],
  },
  {
    label: 'Session Ended',
    href: '/[businessId]/widget-settings/appearance/session-ended',
    icon: 'M5 13l4 4L19 7',
    keywords: ['complete', 'finished', 'closed', 'goodbye', 'farewell'],
  },
  {
    label: 'Session Expired',
    href: '/[businessId]/widget-settings/appearance/session-expired',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    keywords: ['timeout', 'expired', 'inactive', 'stale', 'ended'],
  },
  {
    label: 'Feedback',
    href: '/[businessId]/widget-settings/appearance/feedback',
    icon: 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3',
    keywords: ['rating', 'review', 'stars', 'thumbs', 'satisfaction'],
  },
]
