import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  NOTICE_TITLE_MAX,
  createErrorMessage,
  isNoticeForbidden,
  loadErrorMessage,
  noticeParagraphs,
  noticePreview,
  pickNotice,
  validateNotice,
} from './noticeView.js'

const api = (status, code) => ({ status, code, message: 'BE 문구' })

test('내용을 줄바꿈 기준 문단으로 나누고 빈 줄은 버린다', () => {
  assert.deepEqual(noticeParagraphs('첫째 줄\n\n  둘째 줄  \r\n셋째'), ['첫째 줄', '둘째 줄', '셋째'])
  assert.deepEqual(noticeParagraphs('   '), [])
  assert.deepEqual(noticeParagraphs(null), [])
})

test('목록 미리보기는 첫 문단이다', () => {
  assert.equal(noticePreview('\n  06:40까지 모여 주세요\n조끼는 제가 챙겨요'), '06:40까지 모여 주세요')
  assert.equal(noticePreview(''), '')
})

test('주소에 공지 번호가 없으면 가장 최근 공지를, 있으면 그 공지를 고르고, 목록에 없으면 missing이다', () => {
  const notices = [{ id: 9 }, { id: 7 }, { id: 3 }]
  assert.deepEqual(pickNotice(notices, null), { notice: { id: 9 }, missing: false })
  assert.deepEqual(pickNotice(notices, 7), { notice: { id: 7 }, missing: false })
  assert.deepEqual(pickNotice(notices, 5), { notice: null, missing: true })
  assert.deepEqual(pickNotice([], null), { notice: null, missing: false })
})

test('작성 검증: 제목·내용은 필수이고 제목은 100자 이하다', () => {
  assert.deepEqual(validateNotice({ title: '안내', content: '내용' }), {})
  assert.deepEqual(validateNotice({ title: '  ', content: '' }), { title: '제목을 입력해 주세요.', content: '내용을 입력해 주세요.' })
  assert.match(validateNotice({ title: 'a'.repeat(NOTICE_TITLE_MAX + 1), content: 'x' }).title, /100자 이하/)
  assert.deepEqual(validateNotice({ title: ` ${'a'.repeat(NOTICE_TITLE_MAX)} `, content: 'x' }), {})
})

test('불러오기 실패 안내는 code로 고르고 BE 문구를 쓰지 않는다', () => {
  assert.match(loadErrorMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(loadErrorMessage(api(404, 'GAME_404_1')), /경기를 찾을 수 없어요/)
  assert.match(loadErrorMessage(api(403, 'MEMBER_403_1')), /온보딩/)
  assert.match(loadErrorMessage(api(500)), /잠시 후 다시/)
  assert.doesNotMatch(loadErrorMessage(api(500)), /BE 문구/)
  assert.match(loadErrorMessage(new Error('x')), /다시 시도/)
})

test('GAME_403_1만 비참가자 안내 카드로 처리한다', () => {
  assert.equal(isNoticeForbidden(api(403, 'GAME_403_1')), true)
  assert.equal(isNoticeForbidden(api(403, 'MEMBER_403_1')), false)
  assert.equal(isNoticeForbidden(new Error('x')), false)
})

test('공지 올리기 실패 안내', () => {
  assert.match(createErrorMessage(api(400, 'GLOBAL_400_1')), /제목과 내용을 확인/)
  assert.match(createErrorMessage(api(403, 'GAME_403_1')), /파티장만/)
  assert.match(createErrorMessage(api(404, 'GAME_404_1')), /경기를 찾을 수 없어요/)
  assert.match(createErrorMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(createErrorMessage(new Error('x')), /다시 시도/)
})
