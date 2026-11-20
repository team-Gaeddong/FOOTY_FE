import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  deadlineText,
  parsePollId,
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

test('요청 본문은 공백을 지우고 마감 일시에 초를 붙인다', () => {
  assert.deepEqual(
    toCreatePollBody({ title: ' 날짜 ', options: [' 토 ', '일'], allowMultiple: true, deadline: '2026-11-25T20:00' }),
    { title: '날짜', options: ['토', '일'], allowMultiple: true, deadline: '2026-11-25T20:00:00' },
  )
  assert.equal(toCreatePollBody({ title: 't', options: [], allowMultiple: false, deadline: '' }).deadline, null)
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

test('마감 문구는 시간대 변환 없이 보여준다', () => {
  assert.equal(deadlineText({ deadline: null, isClosed: false }), '마감 없음')
  assert.equal(deadlineText({ deadline: '2026-11-25T20:00:00', isClosed: false }), '2026. 11. 25. 20:00까지')
  assert.equal(deadlineText({ deadline: '2026-11-25T20:00:00', isClosed: true }), '2026. 11. 25. 20:00 마감됨')
})

test('실패 안내는 code로 고르고 모르면 기본 문구를 쓴다', () => {
  assert.match(pollErrorMessage({ status: 0 }, 'x'), /서버에 연결할 수 없습니다/)
  assert.equal(pollErrorMessage({ status: 409, code: 'POLL_409_1' }, 'x'), '마감된 투표라 더 이상 바꿀 수 없어요.')
  assert.equal(pollErrorMessage({ status: 403, code: 'POLL_403_1' }, 'x'), '이 경기의 파티장 또는 참가자만 투표를 보고 참여할 수 있어요.')
  assert.equal(pollErrorMessage({ status: 401 }, 'x'), '로그인이 필요합니다. 다시 로그인해 주세요.')
  assert.equal(pollErrorMessage(new Error('boom'), '기본'), '기본')
})
