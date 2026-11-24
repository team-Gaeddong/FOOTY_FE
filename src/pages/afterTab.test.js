import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  afterLoadMessage,
  canViewBalanceResult,
  isAfterOpen,
  mvpBadge,
  reviewBadge,
  reviewProgress,
} from './afterTab.js'

test('경기 후 탭은 종료된 경기에서만 열린다', () => {
  assert.equal(isAfterOpen({ status: 'FINISHED' }), true)
  assert.equal(isAfterOpen({ status: 'CONFIRMED' }), false)
  assert.equal(isAfterOpen({ status: 'RECRUITING' }), false)
})

test('내 밸런스 평가·MVP 투표 여부를 배지로 바꾼다(아직 모르면 배지 없음)', () => {
  assert.deepEqual(reviewBadge({ reviewed: false }), { tone: 'red', label: '미작성' })
  assert.deepEqual(reviewBadge({ reviewed: true }), { tone: 'green', label: '작성 완료' })
  assert.equal(reviewBadge(null), null)
  assert.deepEqual(mvpBadge({ voted: false }), { tone: 'red', label: '투표 전' })
  assert.deepEqual(mvpBadge({ voted: true }), { tone: 'green', label: '투표 완료' })
  assert.equal(mvpBadge(undefined), null)
})

test('작성 현황은 작성 수/대상 수와 비율이고, 대상이 없으면 없다', () => {
  assert.deepEqual(reviewProgress({ reviewedCount: 19, requiredCount: 22 }), { reviewed: 19, required: 22, ratio: 19 / 22 })
  assert.deepEqual(reviewProgress({ reviewedCount: 30, requiredCount: 22 }), { reviewed: 22, required: 22, ratio: 1 })
  assert.equal(reviewProgress({ reviewedCount: 0, requiredCount: 0 }), null)
  assert.equal(reviewProgress(null), null)
})

test('결과는 전원이 작성한 뒤에만 볼 수 있다', () => {
  assert.equal(canViewBalanceResult({ completed: true }), true)
  assert.equal(canViewBalanceResult({ completed: false }), false)
  assert.equal(canViewBalanceResult(null), false)
})

test('불러오기 실패 안내는 status로 고르고 BE 문구를 쓰지 않는다', () => {
  assert.match(afterLoadMessage({ status: 0 }), /서버에 연결할 수 없어요/)
  assert.match(afterLoadMessage({ status: 500, message: 'BE 문구' }), /잠시 후 다시/)
  assert.doesNotMatch(afterLoadMessage({ status: 500, message: 'BE 문구' }), /BE 문구/)
  assert.match(afterLoadMessage(new Error('x')), /불러오지 못했어요/)
})
