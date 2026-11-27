import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatAverage, progressRatio, rankedReasonRows, reasonLabel, reasonRows } from './balanceSummary.js'

test('평균 점수는 소수 둘째 자리로 맞춰 보여주고, 없으면 -', () => {
  assert.equal(formatAverage(7.5), '7.50')
  assert.equal(formatAverage(6.67), '6.67')
  assert.equal(formatAverage(8), '8.00')
  assert.equal(formatAverage('5.25'), '5.25')
  assert.equal(formatAverage(null), '-')
  assert.equal(formatAverage(undefined), '-')
  assert.equal(formatAverage('abc'), '-')
})

test('작성 진행률은 0~1 사이이고 대상이 없으면 0', () => {
  assert.equal(progressRatio(3, 6), 0.5)
  assert.equal(progressRatio(6, 6), 1)
  assert.equal(progressRatio(7, 6), 1)
  assert.equal(progressRatio(0, 0), 0)
})

test('사유 집계는 정해진 순서로 6개를 모두 만들고 빠진 값은 0', () => {
  const rows = reasonRows({ SKILL_GAP: 2, WELL_BALANCED: 1 })
  assert.deepEqual(
    rows.map((row) => [row.value, row.count]),
    [
      ['OUR_TEAM_TOO_WEAK', 0],
      ['OPPONENT_TOO_STRONG', 0],
      ['SKILL_GAP', 2],
      ['POSITION_MISMATCH', 0],
      ['HEADCOUNT_MISMATCH', 0],
      ['WELL_BALANCED', 1],
    ],
  )
  assert.equal(reasonRows(null).every((row) => row.count === 0), true)
})

test('사유 문구를 찾고, 모르는 값은 그대로 둔다', () => {
  assert.equal(reasonLabel('SKILL_GAP'), '개인 실력 차이가 컸다')
  assert.equal(reasonLabel('NEW_REASON'), 'NEW_REASON')
})

test('결과 막대는 많은 사유부터, 같으면 정해진 순서이고 길이는 최댓값 기준', () => {
  const rows = rankedReasonRows({ WELL_BALANCED: 7, SKILL_GAP: 3, POSITION_MISMATCH: 2, OPPONENT_TOO_STRONG: 1 })
  assert.deepEqual(
    rows.map((row) => [row.value, row.count]),
    [
      ['WELL_BALANCED', 7],
      ['SKILL_GAP', 3],
      ['POSITION_MISMATCH', 2],
      ['OPPONENT_TOO_STRONG', 1],
      ['OUR_TEAM_TOO_WEAK', 0],
      ['HEADCOUNT_MISMATCH', 0],
    ],
  )
  assert.equal(rows[0].ratio, 1)
  assert.equal(rows[1].ratio, 3 / 7)
  assert.equal(rows.at(-1).ratio, 0)
})

test('결과 막대는 응답이 하나도 없으면 길이가 모두 0', () => {
  assert.equal(rankedReasonRows({}).every((row) => row.ratio === 0), true)
})
