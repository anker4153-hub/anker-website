import { type ReactNode } from "react"

export type IconName =
  | "anchor"
  | "arrow"
  | "calendar"
  | "clock"
  | "users"
  | "pin"
  | "phone"
  | "check"
  | "chevron"
  | "menu"
  | "close"
  | "grid"
  | "book"
  | "settings"
  | "layout"
  | "search"
  | "mail"
  | "trash"
  | "edit"
  | "filter"
  | "refresh"
  | "plus"
  | "logout"

export function Icon({
  name,
  size = 20,
}: {
  name: IconName
  size?: number
}) {
  const paths: Record<string, ReactNode> = {
    anchor: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 7.5V21M5 12H2.5C3.2 18 6.6 21 12 21s8.8-3 9.5-9H19M8 10h8" />
      </>
    ),
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c.4-4 2.3-6 6-6s5.6 2 6 6M16 5.5a3 3 0 0 1 0 5.8M16 14c3 0 4.6 2 5 5" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    phone: (
      <path d="M7 3 4 5c-1.5 1 1 6.5 5 10.5s9 6 10 4.5l2-3-5-3-2 2c-2-1-5-4-6-6l2-2-3-5Z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    book: (
      <path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z" />
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
        <path d="m14 6 4 4" />
      </>
    ),
    filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" />,
    refresh: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    logout: (
      <>
        <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-mark">
        <Icon name="anchor" size={compact ? 20 : 24} />
      </span>
      <span>
        <b>Zum Anker</b>
        <small>Trier-Pfalzel · Seit 1896</small>
      </span>
    </div>
  )
}
