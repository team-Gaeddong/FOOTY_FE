const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

export function formatNoticeDateTime(value) {
  const match = DATE_TIME.exec(value ?? '')
  if (!match) return value ?? ''
  return `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`
}
