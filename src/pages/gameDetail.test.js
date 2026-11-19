import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  countUnratedPlayers,
  fillRatio,
  formatCreatedDate,
  formatPlayDate,
  parseGameId,
  playerBadges,
  positionsText,
} from './gameDetail.js'

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

test('참가 선수 배지는 파티장·후보·비회원 순으로 붙인다', () => {
  const player = { memberId: 7, isSubstitute: false }
  assert.deepEqual(playerBadges(player, 7), ['파티장'])
  assert.deepEqual(playerBadges(player, 1), [])
  assert.deepEqual(playerBadges({ memberId: 7, isSubstitute: true }, 7), ['파티장', '후보'])
  assert.deepEqual(playerBadges({ memberId: null, isSubstitute: true }, 7), ['후보', '비회원'])
})

test('비회원은 hostId가 없어도 파티장으로 보지 않는다', () => {
  assert.deepEqual(playerBadges({ memberId: null, isSubstitute: false }, null), ['비회원'])
})

test('희망 포지션은 우선순위 순으로 한국어로 잇는다', () => {
  assert.equal(positionsText(['FW', 'MF']), '공격수 · 미드필더')
  assert.equal(positionsText(['GK']), '골키퍼')
  assert.equal(positionsText([]), '희망 포지션 없음')
  assert.equal(positionsText(undefined), '희망 포지션 없음')
})

test('실력을 매기지 않은 선수 수를 센다', () => {
  assert.equal(countUnratedPlayers([{ skillLevel: 7 }, { skillLevel: null }, { skillLevel: null }]), 2)
  assert.equal(countUnratedPlayers([]), 0)
})
