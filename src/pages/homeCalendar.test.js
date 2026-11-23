import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  buildDays,
  dayAriaLabel,
  dayHeading,
  gameSubtitle,
  groupGamesByDate,
  homeErrorMessage,
  pickSelectedDay,
  playDateKey,
  playTime,
  rangeLabel,
  todayString,
  windowEnd,
} from './homeCalendar.js'

test('날짜 더하기는 달·해·윤년을 넘긴다', () => {
  assert.equal(addDays('2026-11-23', 7), '2026-11-30')
  assert.equal(addDays('2026-11-28', 7), '2026-12-05')
  assert.equal(addDays('2026-12-28', 7), '2027-01-04')
  assert.equal(addDays('2028-02-27', 2), '2028-02-29')
  assert.equal(addDays('2027-02-27', 2), '2027-03-01')
  assert.equal(addDays('2026-11-23', -7), '2026-11-16')
})

test('오늘은 브라우저의 날짜를 yyyy-MM-dd로 만든다', () => {
  assert.equal(todayString(new Date(2026, 10, 3, 23, 59)), '2026-11-03')
  assert.equal(todayString(new Date(2027, 0, 9, 0, 0)), '2027-01-09')
})

test('날짜 줄은 시작일부터 7일이고 요일·토요일·일요일 표시가 맞다', () => {
  const days = buildDays('2026-11-23', '2026-11-23')
  assert.equal(days.length, 7)
  assert.deepEqual(days.map((day) => day.weekday), ['월', '화', '수', '목', '금', '토', '일'])
  assert.deepEqual(days.map((day) => day.day), [23, 24, 25, 26, 27, 28, 29])
  assert.deepEqual(days.map((day) => day.tone), [null, null, null, null, null, 'sat', 'sun'])
  assert.deepEqual(days.map((day) => day.isToday), [true, false, false, false, false, false, false])
})

test('날짜 줄은 달이 바뀌어도 날짜 숫자가 이어진다', () => {
  const days = buildDays('2026-11-28', '2026-11-23')
  assert.deepEqual(days.map((day) => day.date).slice(2, 4), ['2026-11-30', '2026-12-01'])
  assert.deepEqual(days.map((day) => day.day), [28, 29, 30, 1, 2, 3, 4])
  assert.equal(days.some((day) => day.isToday), false)
})

test('범위 문구는 같은 달이면 날짜만, 달이 다르면 월을 붙인다', () => {
  assert.equal(rangeLabel('2026-11-23'), '11월 23일 – 29일')
  assert.equal(rangeLabel('2026-11-28'), '11월 28일 – 12월 4일')
  assert.equal(rangeLabel('2026-12-28'), '12월 28일 – 1월 3일')
  assert.equal(windowEnd('2026-11-23'), '2026-11-29')
})

test('날짜 제목과 버튼 이름', () => {
  assert.equal(dayHeading('2026-11-23'), '11월 23일 월요일')
  assert.equal(dayHeading('2026-11-29'), '11월 29일 일요일')
  assert.equal(dayAriaLabel('2026-11-23', true), '11월 23일 · 경기 있음')
  assert.equal(dayAriaLabel('2026-11-24', false), '11월 24일 · 경기 없음')
})

test('창을 넘길 때 오늘이 들어 있으면 오늘, 아니면 첫날을 고른다', () => {
  assert.equal(pickSelectedDay('2026-11-23', '2026-11-25'), '2026-11-25')
  assert.equal(pickSelectedDay('2026-11-30', '2026-11-25'), '2026-11-30')
  assert.equal(pickSelectedDay('2026-11-16', '2026-11-25'), '2026-11-16')
  assert.equal(pickSelectedDay('2026-11-19', '2026-11-25'), '2026-11-25')
})

test('경기 일시에서 날짜와 시간을 문자열로 뽑는다', () => {
  assert.equal(playDateKey('2026-11-23T19:00:00'), '2026-11-23')
  assert.equal(playTime('2026-11-23T19:00:00'), '19:00')
  assert.equal(playTime('2026-11-23T07:05'), '07:05')
  assert.equal(playDateKey('이상한 값'), null)
  assert.equal(playTime('이상한 값'), '')
})

test('날짜별로 묶고 하루 안에서는 시작 시간 순, 같으면 id 순이다', () => {
  const games = [
    { id: 3, playDate: '2026-11-23T22:00:00' },
    { id: 2, playDate: '2026-11-23T19:00:00' },
    { id: 5, playDate: '2026-11-24T08:00:00' },
    { id: 1, playDate: '2026-11-23T19:00:00' },
    { id: 9, playDate: '값이 이상함' },
  ]
  const groups = groupGamesByDate(games)
  assert.deepEqual(Object.keys(groups).sort(), ['2026-11-23', '2026-11-24'])
  assert.deepEqual(groups['2026-11-23'].map((game) => game.id), [1, 2, 3])
  assert.deepEqual(groups['2026-11-24'].map((game) => game.id), [5])
})

test('경기가 없으면 빈 묶음이다', () => {
  assert.deepEqual(groupGamesByDate([]), {})
})

test('경기 부제는 장소·최대 인원·팀 수다', () => {
  assert.equal(
    gameSubtitle({ location: '모래내 풋살파크 A구장', maxPlayers: 12, teamCount: 2 }),
    '모래내 풋살파크 A구장 · 최대 12명 · 2팀',
  )
})

test('오류 문구는 상태 코드와 code로 고른다', () => {
  assert.match(homeErrorMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.match(homeErrorMessage({ status: 403, code: 'MEMBER_403_1' }), /온보딩/)
  assert.match(homeErrorMessage({ status: 401, code: 'AUTH_401_2' }), /로그인이 필요/)
  assert.match(homeErrorMessage({ status: 500, message: '서버 문구' }), /불러오지 못했습니다/)
  assert.doesNotMatch(homeErrorMessage({ status: 500, message: '서버 문구' }), /서버 문구/)
  assert.match(homeErrorMessage(undefined), /불러오지 못했습니다/)
})
