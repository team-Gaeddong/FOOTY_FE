// 내비게이션 아이콘(시안의 선 아이콘). 색은 currentColor를 따른다.
function Icon({ size = 22, children }) {
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

export function ListIcon(props) {
  return <Icon {...props}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>
}

export function ShieldIcon(props) {
  return <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>
}

export function PlusIcon(props) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
}

export function UserIcon(props) {
  return <Icon {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></Icon>
}

export function ArrowLeftIcon(props) {
  return <Icon {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>
}
