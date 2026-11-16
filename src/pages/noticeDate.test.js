import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatNoticeDateTime } from './noticeDate.js'

test('공지 작성 시각을 받은 한국시간 그대로 표시한다', () => {
  assert.equal(formatNoticeDateTime('2026-11-16T09:05:12'), '2026. 11. 16. 09:05')
  assert.equal(formatNoticeDateTime('2026-01-02T00:00:00.123'), '2026. 01. 02. 00:00')
})

test('시각 형식이 다르면 받은 값을 그대로 둔다', () => {
  assert.equal(formatNoticeDateTime('날짜 미상'), '날짜 미상')
  assert.equal(formatNoticeDateTime(null), '')
})
