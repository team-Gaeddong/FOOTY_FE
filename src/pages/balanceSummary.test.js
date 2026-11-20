import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatAverage, progressRatio, reasonLabel, reasonRows } from './balanceSummary.js'

test('평균 점수는 소수 둘째 자리까지 보여주고, 없으면 -', () => {
  assert.equal(formatAverage(7.5), '7.5')
  assert.equal(formatAverage(6.67), '6.67')
  assert.equal(formatAverage(8), '8')
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
