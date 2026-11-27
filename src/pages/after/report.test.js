import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DETAIL_MAX,
  REPORT_REASONS,
  isReportReason,
  isValidDetail,
  reportablePlayers,
  toDetail,
} from './report.js'

const players = [
  { id: 1, memberId: 10, name: '나' },
  { id: 2, memberId: 20, name: '회원' },
  { id: 3, memberId: null, name: '비회원' },
  { id: 4, memberId: 30, name: '다른 회원' },
]

test('신고 대상에서 나와 비회원 선수를 뺀다', () => {
  assert.deepEqual(
    reportablePlayers(players, 10).map((player) => player.id),
    [2, 4],
  )
})

test('나 말고 회원이 없으면 신고 대상이 없다', () => {
  assert.deepEqual(reportablePlayers([players[0], players[2]], 10), [])
  assert.deepEqual(reportablePlayers([], 10), [])
})

test('신고 사유는 BE ReportReason 네 가지다', () => {
  assert.deepEqual(
    REPORT_REASONS.map((reason) => reason.value),
    ['ABUSE', 'VIOLENT_PLAY', 'NO_SHOW', 'OTHER'],
  )
  assert.equal(isReportReason('NO_SHOW'), true)
  assert.equal(isReportReason(''), false)
  assert.equal(isReportReason('SPAM'), false)
})

test('상세 내용은 500자까지 허용한다', () => {
  assert.equal(isValidDetail(''), true)
  assert.equal(isValidDetail('가'.repeat(DETAIL_MAX)), true)
  assert.equal(isValidDetail('가'.repeat(DETAIL_MAX + 1)), false)
})

test('상세 내용 길이는 BE와 같이 UTF-16 단위로 센다', () => {
  // 이모지는 2단위라 250개가 500자다.
  assert.equal(isValidDetail('😀'.repeat(250)), true)
  assert.equal(isValidDetail('😀'.repeat(251)), false)
})

test('공백만 쓴 상세 내용은 null로 보내고 나머지는 그대로 보낸다', () => {
  assert.equal(toDetail(''), null)
  assert.equal(toDetail('  \n\t '), null)
  assert.equal(toDetail(' 욕설을 했어요 '), ' 욕설을 했어요 ')
})
