import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INITIAL_FORM,
  LOCATION_MAX,
  TITLE_MAX,
  maxPlayersHint,
  previewOf,
  setMaxPlayers,
  setTeamCount,
  submitErrorOf,
  toCreateRequest,
  validate,
} from './createGameForm.js'

const filled = {
  ...INITIAL_FORM,
  title: '  일요 조기축구 정기전 ',
  date: '2026-11-29',
  time: '07:00',
  location: ' 새벽들 축구장 1구장 ',
}

test('모두 채우면 오류가 없다', () => {
  assert.deepEqual(validate(filled), {})
})

test('빈 칸은 칸별로 오류가 나고 공백만 있는 값도 빈 값이다', () => {
  const errors = validate({ ...INITIAL_FORM, title: '   ', location: '' })
  assert.deepEqual(Object.keys(errors).sort(), ['date', 'location', 'time', 'title'])
})

test('제목은 100자, 장소는 200자까지다', () => {
  assert.equal(validate({ ...filled, title: 'ㄱ'.repeat(TITLE_MAX) }).title, undefined)
  assert.match(validate({ ...filled, title: 'ㄱ'.repeat(TITLE_MAX + 1) }).title, /100자 이하/)
  assert.equal(validate({ ...filled, location: 'ㄱ'.repeat(LOCATION_MAX) }).location, undefined)
  assert.match(validate({ ...filled, location: 'ㄱ'.repeat(LOCATION_MAX + 1) }).location, /200자 이하/)
})

test('최대 인원과 팀 수의 범위를 검사한다', () => {
  assert.ok(validate({ ...filled, maxPlayers: 1 }).maxPlayers)
  assert.ok(validate({ ...filled, maxPlayers: 31 }).maxPlayers)
  assert.ok(validate({ ...filled, maxPlayers: 10.5 }).maxPlayers)
  assert.ok(validate({ ...filled, maxPlayers: 4, teamCount: 5 }).teamCount)
  assert.ok(validate({ ...filled, teamCount: 1 }).teamCount)
  assert.deepEqual(validate({ ...filled, maxPlayers: 4, teamCount: 4 }), {})
})

test('최대 인원은 2~30 안에서만 움직이고 팀 수가 인원보다 커지지 않는다', () => {
  assert.equal(setMaxPlayers(INITIAL_FORM, 1).maxPlayers, 2)
  assert.equal(setMaxPlayers(INITIAL_FORM, 99).maxPlayers, 30)
  const shrunk = setMaxPlayers({ ...INITIAL_FORM, maxPlayers: 10, teamCount: 8 }, 6)
  assert.equal(shrunk.maxPlayers, 6)
  assert.equal(shrunk.teamCount, 6)
  assert.equal(setMaxPlayers({ ...INITIAL_FORM, teamCount: 3 }, 20).teamCount, 3)
})

test('팀 수는 2팀부터 최대 인원까지다', () => {
  assert.equal(setTeamCount(INITIAL_FORM, 1).teamCount, 2)
  assert.equal(setTeamCount({ ...INITIAL_FORM, maxPlayers: 4 }, 9).teamCount, 4)
  assert.equal(setTeamCount(INITIAL_FORM, 3).teamCount, 3)
})

test('요청 본문은 공백을 빼고 일시를 한국시간 문자열로 만든다', () => {
  assert.deepEqual(toCreateRequest({ ...filled, maxPlayers: 22, teamCount: 2 }), {
    title: '일요 조기축구 정기전',
    playDate: '2026-11-29T07:00:00',
    location: '새벽들 축구장 1구장',
    maxPlayers: 22,
    teamCount: 2,
  })
})

test('미리보기는 입력한 값을 목록 모양으로 보여 주고 빈 값은 자리 표시로 채운다', () => {
  const preview = previewOf({ ...filled, maxPlayers: 22, teamCount: 2 })
  assert.equal(preview.time, '07:00')
  assert.equal(preview.title, '일요 조기축구 정기전')
  assert.equal(preview.sub, '새벽들 축구장 1구장 · 최대 22명 · 2팀')
  assert.equal(preview.dateText, '11월 29일 일요일')
  assert.equal(preview.tone, 'sun')
  assert.equal(preview.titleFilled, true)

  const empty = previewOf(INITIAL_FORM)
  assert.equal(empty.time, '--:--')
  assert.equal(empty.titleFilled, false)
  assert.equal(empty.dateFilled, false)
  assert.equal(empty.tone, null)
  assert.equal(empty.sub, '장소 · 최대 22명 · 2팀')
})

test('인원 안내에는 지금 최대 인원이 들어간다', () => {
  assert.match(maxPlayersHint(12), /12명이 선발/)
})

test('제출 오류는 입력 칸에 붙일 수 있으면 그 칸으로 보낸다', () => {
  assert.equal(submitErrorOf({ status: 400, code: 'GAME_400_2' }).field, 'maxPlayers')
  assert.equal(submitErrorOf({ status: 400, code: 'GAME_400_3' }).field, 'date')
  assert.equal(submitErrorOf({ status: 400, code: 'GAME_400_4' }).field, 'teamCount')
})

test('나머지 제출 오류는 폼 아래 문구이고 BE message를 쓰지 않는다', () => {
  assert.match(submitErrorOf({ status: 0 }).message, /서버에 연결할 수 없습니다/)
  assert.match(submitErrorOf({ status: 403, code: 'MEMBER_403_1' }).message, /온보딩/)
  assert.match(submitErrorOf({ status: 401, code: 'AUTH_401_2' }).message, /로그인이 필요/)
  assert.match(submitErrorOf({ status: 400, code: 'GLOBAL_400_1' }).message, /입력값을 확인/)
  assert.equal(submitErrorOf({ status: 500, code: 'X', message: '서버 문구' }).field, undefined)
  assert.doesNotMatch(submitErrorOf({ status: 500, message: '서버 문구' }).message, /서버 문구/)
  assert.match(submitErrorOf(new Error('boom')).message, /만들지 못했습니다/)
})
