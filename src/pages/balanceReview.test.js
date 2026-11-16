import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidScore, toggleReason, toReviewRequest } from './balanceReview.js'

test('점수는 1~10 정수만 허용한다', () => {
  assert.equal(isValidScore(1), true)
  assert.equal(isValidScore(10), true)
  assert.equal(isValidScore(0), false)
  assert.equal(isValidScore(11), false)
  assert.equal(isValidScore(5.5), false)
  assert.equal(isValidScore(null), false)
})

test('사유를 켜고 끄며 정해진 순서를 유지한다', () => {
  assert.deepEqual(toggleReason([], 'WELL_BALANCED'), ['WELL_BALANCED'])
  assert.deepEqual(toggleReason(['WELL_BALANCED'], 'SKILL_GAP'), ['SKILL_GAP', 'WELL_BALANCED'])
  assert.deepEqual(toggleReason(['SKILL_GAP', 'WELL_BALANCED'], 'SKILL_GAP'), ['WELL_BALANCED'])
})

test('의견은 앞뒤 공백을 지우고, 비면 null로 보낸다', () => {
  assert.deepEqual(toReviewRequest({ score: 7, reasons: [], comment: '  좋았어요 ' }), {
    score: 7,
    reasons: [],
    comment: '좋았어요',
  })
  assert.equal(toReviewRequest({ score: 7, reasons: [], comment: '   ' }).comment, null)
})
