// 의견 투표 화면의 입력·선택 규칙(BE D-34). 화면 컴포넌트와 분리해 node:test로 검사한다.

export const TITLE_MAX = 100
export const OPTION_MAX = 100
export const OPTIONS_MIN = 2
export const OPTIONS_MAX = 10

// 경로의 pollId. 양의 정수가 아니면 null.
export function parsePollId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// 만들기 폼 검사. 문제가 없으면 null, 있으면 { field, message }.
// 마감 일시가 지났는지는 FD-12(시간대) 미결정이라 보지 않고 BE(POLL_400_2)에 맡긴다.
export function validatePollForm({ title, options }) {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { field: 'title', message: '제목을 입력해 주세요.' }
  if (trimmedTitle.length > TITLE_MAX) return { field: 'title', message: `제목은 ${TITLE_MAX}자 이하로 입력해 주세요.` }

  const trimmed = options.map((option) => option.trim())
  if (trimmed.some((option) => !option)) return { field: 'options', message: '비어 있는 선택지를 채우거나 지워 주세요.' }
  if (trimmed.some((option) => option.length > OPTION_MAX)) {
    return { field: 'options', message: `선택지는 ${OPTION_MAX}자 이하로 입력해 주세요.` }
  }
  if (trimmed.length < OPTIONS_MIN || trimmed.length > OPTIONS_MAX) {
    return { field: 'options', message: `선택지는 ${OPTIONS_MIN}~${OPTIONS_MAX}개로 만들어 주세요.` }
  }
  if (new Set(trimmed).size !== trimmed.length) return { field: 'options', message: '같은 선택지가 있어요.' }
  return null
}

// BE 요청 본문. datetime-local 값("2026-11-25T20:00")에 초를 붙인다(경기 생성과 같은 방식).
export function toCreatePollBody({ title, options, allowMultiple, deadline }) {
  return {
    title: title.trim(),
    options: options.map((option) => option.trim()),
    allowMultiple,
    deadline: deadline ? `${deadline}:00` : null,
  }
}

// 선택지를 누를 때 고른 목록. 단일 선택이면 누른 것 하나로 바꾸고(다시 누르면 해제), 복수 선택이면 넣고 뺀다.
export function toggleSelection(selected, optionId, allowMultiple) {
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId)
  return allowMultiple ? [...selected, optionId] : [optionId]
}

// 서버에 저장된 내 선택
export function selectedOptionIds(poll) {
  return poll.options.filter((option) => option.isSelected).map((option) => option.id)
}

// 순서와 관계없이 같은 선택인지(저장할 것이 있는지 판단)
export function sameSelection(a, b) {
  return a.length === b.length && a.every((id) => b.includes(id))
}

// BE LocalDateTime(시간대 없음)을 Date로 바꾸지 않고 그대로 보여준다(FD-12 미결정).
export function formatPollDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '')
  if (!match) return value ?? ''
  return `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`
}

export function deadlineText(poll) {
  if (!poll.deadline) return '마감 없음'
  return poll.isClosed ? `${formatPollDateTime(poll.deadline)} 마감됨` : `${formatPollDateTime(poll.deadline)}까지`
}

// 투표 API 공통 실패 안내. error는 ApiError(status, code) 또는 그 밖의 오류다.
export function pollErrorMessage(error, fallback) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  switch (error?.code) {
    case 'GAME_403_1':
      return '이 경기의 파티장만 투표를 만들 수 있어요.'
    case 'POLL_403_1':
      return '이 경기의 파티장 또는 참가자만 투표를 보고 참여할 수 있어요.'
    case 'GAME_404_1':
      return '경기를 찾을 수 없어요. 삭제되었거나 없는 경기예요.'
    case 'POLL_404_1':
      return '투표를 찾을 수 없어요.'
    case 'POLL_404_2':
      return '선택지가 바뀌었어요. 새로고침한 뒤 다시 골라 주세요.'
    case 'POLL_400_1':
      return '선택지는 2~10개이고 서로 달라야 해요.'
    case 'POLL_400_2':
      return '마감 일시는 지금 이후로 선택해 주세요.'
    case 'POLL_400_3':
      return '하나만 고를 수 있는 투표예요.'
    case 'POLL_400_4':
      return '같은 선택지를 두 번 고를 수 없어요.'
    case 'POLL_409_1':
      return '마감된 투표라 더 이상 바꿀 수 없어요.'
    case 'POLL_409_2':
      return '다른 응답이 먼저 처리됐어요. 다시 시도해 주세요.'
    case 'MEMBER_403_1':
      return '온보딩을 마친 뒤 이용할 수 있어요.'
    case 'GLOBAL_400_1':
      return '입력한 내용을 확인해 주세요.'
    default:
      if (error?.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
      return fallback
  }
}
