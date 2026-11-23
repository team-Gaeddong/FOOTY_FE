// 시안의 선 아이콘. 색은 currentColor를 따른다.
function Icon({ size = 20, children }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  )
}

export function SwapIcon(props) {
  return <Icon {...props}><path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" /></Icon>
}

export function PitchIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM3 12h18M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </Icon>
  )
}

export function TrophyIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
    </Icon>
  )
}

export function LogoutIcon(props) {
  return <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>
}

export function ClockIcon(props) {
  return <Icon {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" /></Icon>
}

export function UserIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </Icon>
  )
}

export function CalendarIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </Icon>
  )
}

export function ArrowLeftIcon(props) {
  return <Icon {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>
}

export function ArrowRightIcon(props) {
  return <Icon {...props}><path d="M5 12h14M12 5l7 7-7 7" /></Icon>
}

export function ChevronRightIcon(props) {
  return <Icon {...props}><path d="M9 18l6-6-6-6" /></Icon>
}

export function PlusIcon(props) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
}
