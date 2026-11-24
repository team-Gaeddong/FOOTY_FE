import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatNoticeTime } from './noticeDate.js'

const NOW = new Date(2026, 10, 24, 12, 0)

test('공지 작성 시각을 받은 한국시간 그대로 "월 일 시:분"으로 표시한다', () => {
  assert.equal(formatNoticeTime('2026-11-24T21:10:12', NOW), '11월 24일 21:10')
  assert.equal(formatNoticeTime('2026-01-02T00:00:00.123', NOW), '1월 2일 00:00')
})

test('올해가 아니면 연도를 붙인다', () => {
  assert.equal(formatNoticeTime('2025-12-31T23:59:00', NOW), '2025년 12월 31일 23:59')
})

test('시각 형식이 다르면 받은 값을 그대로 둔다', () => {
  assert.equal(formatNoticeTime('날짜 미상', NOW), '날짜 미상')
  assert.equal(formatNoticeTime(null, NOW), '')
})
