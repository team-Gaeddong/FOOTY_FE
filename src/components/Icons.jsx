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

export function XIcon(props) {
  return <Icon {...props}><path d="M18 6L6 18M6 6l12 12" /></Icon>
}

export function ChevronDownIcon(props) {
  return <Icon {...props}><path d="M6 9l6 6 6-6" /></Icon>
}

export function PlusIcon(props) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
}

export function PinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    </Icon>
  )
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return <Icon {...props}><path d="M20 6L9 17l-5-5" /></Icon>
}

export function MinusIcon(props) {
  return <Icon {...props}><path d="M5 12h14" /></Icon>
}

export function RepeatIcon(props) {
  return (
    <Icon {...props}>
      <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
    </Icon>
  )
}

export function LockIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

export function MegaphoneIcon(props) {
  return <Icon {...props}><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1zM19 9a4 4 0 0 1 0 6" /></Icon>
}

export function BarChartIcon(props) {
  return <Icon {...props}><path d="M6 20V10M12 20V4M18 20v-6" /></Icon>
}

export function TrashIcon(props) {
  return <Icon {...props}><path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></Icon>
}

export function InfoIcon(props) {
  return <Icon {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01" /></Icon>
}

export function PencilIcon(props) {
  return <Icon {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></Icon>
}

export function DownloadIcon(props) {
  return <Icon {...props}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Icon>
}

export function AlertTriangleIcon(props) {
  return <Icon {...props}><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></Icon>
}

export function WandIcon(props) {
  return <Icon {...props}><path d="M15 4V2M15 10V8M11 6h2M17 6h2M3 21l12-12M12.5 6.5l2 2" /></Icon>
}
