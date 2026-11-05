import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fillRatio, formatCreatedDate, formatPlayDate, parseGameId } from './gameDetail.js'

test('경기 일시를 요일과 오전·오후로 표시한다', () => {
  assert.equal(formatPlayDate('2026-11-08T08:00:00'), '11월 8일 (일) 오전 8:00')
  assert.equal(formatPlayDate('2026-11-09T00:05:00'), '11월 9일 (월) 오전 12:05')
  assert.equal(formatPlayDate('2026-11-10T12:30:00'), '11월 10일 (화) 오후 12:30')
  assert.equal(formatPlayDate('2026-12-31T23:59'), '12월 31일 (목) 오후 11:59')
})

test('형식이 다르면 받은 값을 그대로 둔다', () => {
  assert.equal(formatPlayDate('내일'), '내일')
  assert.equal(formatPlayDate(null), '')
  assert.equal(formatCreatedDate('?'), '?')
})

test('만든 날짜는 월·일만 표시한다', () => {
  assert.equal(formatCreatedDate('2026-11-01T14:03:12.123456'), '11월 1일')
})

test('참가 인원 비율은 0~1로 자른다', () => {
  assert.equal(fillRatio(8, 12), 8 / 12)
  assert.equal(fillRatio(15, 12), 1)
  assert.equal(fillRatio(0, 12), 0)
  assert.equal(fillRatio(3, 0), 0)
})

test('gameId는 양의 정수만 받는다', () => {
  assert.equal(parseGameId('12'), 12)
  assert.equal(parseGameId('0'), null)
  assert.equal(parseGameId('-1'), null)
  assert.equal(parseGameId('1.5'), null)
  assert.equal(parseGameId('abc'), null)
  assert.equal(parseGameId('99999999999999999999'), null)
})
