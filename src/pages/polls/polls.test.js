import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyAnswerToList,
  formatPollTime,
  parsePollId,
  pickPoll,
  pollMeta,
  pollErrorMessage,
  sameSelection,
  selectedOptionIds,
  toCreatePollBody,
  toggleSelection,
  validatePollForm,
} from './polls.js'

test('pollId는 양의 정수만 받는다', () => {
  assert.equal(parsePollId('7'), 7)
  assert.equal(parsePollId('0'), null)
  assert.equal(parsePollId('a'), null)
  assert.equal(parsePollId(undefined), null)
})

test('만들기 폼은 제목과 선택지 규칙을 BE와 같게 검사한다', () => {
  const ok = { title: ' 뒤풀이 ', options: ['고기', '치킨'] }
  assert.equal(validatePollForm(ok), null)
  assert.equal(validatePollForm({ ...ok, title: '   ' }).field, 'title')
  assert.equal(validatePollForm({ ...ok, title: 'a'.repeat(101) }).field, 'title')
  assert.equal(validatePollForm({ ...ok, options: ['고기'] }).message, '선택지는 2~10개로 만들어 주세요.')
  assert.equal(validatePollForm({ ...ok, options: Array.from({ length: 11 }, (_, i) => `${i}`) }).field, 'options')
  assert.equal(validatePollForm({ ...ok, options: ['고기', ' 고기 '] }).message, '같은 선택지가 있어요.')
  assert.equal(validatePollForm({ ...ok, options: ['고기', ' '] }).message, '비어 있는 선택지를 채우거나 지워 주세요.')
  assert.equal(validatePollForm({ ...ok, options: ['고기', 'a'.repeat(101)] }).field, 'options')
})

test('요청 본문은 공백을 지우고 마감 날짜·시간을 합쳐 초를 붙인다', () => {
  assert.deepEqual(
    toCreatePollBody({ title: ' 날짜 ', options: [' 토 ', '일'], allowMultiple: true, date: '2026-11-25', time: '20:00' }),
    { title: '날짜', options: ['토', '일'], allowMultiple: true, deadline: '2026-11-25T20:00:00' },
  )
  assert.equal(toCreatePollBody({ title: 't', options: [], allowMultiple: false }).deadline, null)
})

test('마감은 날짜와 시간을 함께 넣거나 둘 다 비워 둔다', () => {
  const ok = { title: '뒤풀이', options: ['고기', '치킨'] }
  assert.equal(validatePollForm({ ...ok, date: '2026-11-25', time: '20:00' }), null)
  assert.equal(validatePollForm({ ...ok, date: '', time: '' }), null)
  assert.equal(validatePollForm({ ...ok, date: '2026-11-25', time: '' }).field, 'deadline')
  assert.equal(validatePollForm({ ...ok, date: '', time: '20:00' }).field, 'deadline')
})

test('단일 선택은 하나로 바꾸고 다시 누르면 해제한다', () => {
  assert.deepEqual(toggleSelection([], 1, false), [1])
  assert.deepEqual(toggleSelection([1], 2, false), [2])
  assert.deepEqual(toggleSelection([2], 2, false), [])
})

test('복수 선택은 넣고 뺀다', () => {
  assert.deepEqual(toggleSelection([1], 2, true), [1, 2])
  assert.deepEqual(toggleSelection([1, 2], 1, true), [2])
})

test('저장된 내 선택과 바뀐 선택을 비교한다', () => {
  const poll = { options: [{ id: 1, isSelected: true }, { id: 2, isSelected: false }, { id: 3, isSelected: true }] }
  assert.deepEqual(selectedOptionIds(poll), [1, 3])
  assert.equal(sameSelection([1, 3], [3, 1]), true)
  assert.equal(sameSelection([1], [1, 3]), false)
})

const NOW = new Date(2026, 10, 24, 12, 0)

test('마감 시각은 시간대 변환 없이 "월 일 시:분"으로 보여주고 올해가 아니면 연도를 붙인다', () => {
  assert.equal(formatPollTime('2026-11-28T18:00:00', NOW), '11월 28일 18:00')
  assert.equal(formatPollTime('2027-01-02T09:05:00', NOW), '2027년 1월 2일 09:05')
  assert.equal(formatPollTime('날짜 미상', NOW), '날짜 미상')
  assert.equal(formatPollTime(null, NOW), '')
})

test('카드 요약은 선택 방식·마감·참여 인원이다', () => {
  assert.equal(pollMeta({ allowMultiple: false, deadline: '2026-11-28T18:00:00', voterCount: 15 }, NOW), '하나만 선택 · 11월 28일 18:00 마감 · 15명 참여')
  assert.equal(pollMeta({ allowMultiple: true, deadline: null, voterCount: 0 }, NOW), '여러 개 선택 · 마감 없음 · 0명 참여')
})

test('주소에 투표 번호가 없으면 가장 최근 투표를, 있으면 그 투표를 고르고, 목록에 없으면 missing이다', () => {
  const polls = [{ id: 9 }, { id: 7 }]
  assert.deepEqual(pickPoll(polls, null), { poll: { id: 9 }, missing: false })
  assert.deepEqual(pickPoll(polls, 7), { poll: { id: 7 }, missing: false })
  assert.deepEqual(pickPoll(polls, 3), { poll: null, missing: true })
  assert.deepEqual(pickPoll([], null), { poll: null, missing: false })
})

test('응답을 저장하면 목록 카드의 참여 인원과 투표 여부가 상세 응답을 따른다', () => {
  const polls = [{ id: 1, voterCount: 3, hasVoted: false }, { id: 2, voterCount: 5, hasVoted: true }]
  const answered = { id: 1, voterCount: 4, options: [{ id: 10, isSelected: true }, { id: 11, isSelected: false }] }
  assert.deepEqual(applyAnswerToList(polls, answered), [{ id: 1, voterCount: 4, hasVoted: true }, polls[1]])
  const canceled = { id: 2, voterCount: 4, options: [{ id: 20, isSelected: false }] }
  assert.deepEqual(applyAnswerToList(polls, canceled)[1], { id: 2, voterCount: 4, hasVoted: false })
})

test('실패 안내는 code로 고르고 모르면 기본 문구를 쓴다', () => {
  assert.match(pollErrorMessage({ status: 0 }, 'x'), /서버에 연결할 수 없습니다/)
  assert.equal(pollErrorMessage({ status: 409, code: 'POLL_409_1' }, 'x'), '마감된 투표라 더 이상 바꿀 수 없어요.')
  assert.equal(pollErrorMessage({ status: 403, code: 'POLL_403_1' }, 'x'), '이 경기의 파티장 또는 참가자만 투표를 보고 참여할 수 있어요.')
  assert.equal(pollErrorMessage({ status: 401 }, 'x'), '로그인이 필요합니다. 다시 로그인해 주세요.')
  assert.equal(pollErrorMessage(new Error('boom'), '기본'), '기본')
})
