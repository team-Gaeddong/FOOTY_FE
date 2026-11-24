// 공지 탭·공지 작성 화면의 순수 규칙. BE 계약: 제목은 필수·공백만 불가·100자 이하, 내용은 필수·공백만 불가(GLOBAL_400_1).
// ApiError(api/client.js)는 import.meta.env를 읽어 node:test에서 불러올 수 없어, status가 숫자인지로 API 오류를 가린다.
export const NOTICE_TITLE_MAX = 100

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const isApiError = (error) => typeof error?.status === 'number'

// 내용을 줄바꿈 기준 문단으로 나눈다(빈 줄은 버린다). 화면은 문단마다 <p>로 그린다.
export function noticeParagraphs(content) {
  return String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

// 목록 카드에 보여 줄 첫 문단
export function noticePreview(content) {
  return noticeParagraphs(content)[0] ?? ''
}

// 목록에서 보여 줄 공지를 고른다. noticeId가 없으면 가장 최근 공지(목록 맨 앞), 있는데 목록에 없으면 missing이다.
export function pickNotice(notices, noticeId) {
  if (noticeId === null || noticeId === undefined) return { notice: notices[0] ?? null, missing: false }
  const notice = notices.find((item) => item.id === noticeId) ?? null
  return { notice, missing: notice === null }
}

// 작성 폼 검증. 오류가 없으면 빈 객체다. 제목·내용은 앞뒤 공백을 뺀 값으로 본다.
export function validateNotice({ title, content }) {
  const errors = {}
  if (!title.trim()) errors.title = '제목을 입력해 주세요.'
  else if (title.trim().length > NOTICE_TITLE_MAX) errors.title = `제목은 ${NOTICE_TITLE_MAX}자 이하로 입력해 주세요.`
  if (!content.trim()) errors.content = '내용을 입력해 주세요.'
  return errors
}

// 공지 목록·불러오기 실패 안내(분기는 status·code로, BE message는 쓰지 않는다)
export function loadErrorMessage(error) {
  if (!isApiError(error)) return '공지를 불러오지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제됐거나 없는 경기예요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 공지를 볼 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 목록을 파티장·참가자만 볼 수 있어 비참가자에게는 안내 카드를 보여 준다
export function isNoticeForbidden(error) {
  return isApiError(error) && error.code === 'GAME_403_1'
}

export function createErrorMessage(error) {
  if (!isApiError(error)) return '공지를 올리지 못했습니다. 다시 시도해 주세요.'
  if (error.status === 0) return NETWORK_ERROR
  if (error.code === 'GLOBAL_400_1') return '제목과 내용을 확인해 주세요.'
  if (error.code === 'GAME_403_1') return '이 경기의 파티장만 공지를 작성할 수 있어요.'
  if (error.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제됐거나 없는 경기예요.'
  if (error.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 공지를 작성할 수 있어요.'
  if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.'
  return '공지를 올리지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
