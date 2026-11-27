import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyRatings,
  buildRatingRows,
  changedRatings,
  formatRating,
  isValidRating,
  ratingProgress,
  ratingsLoadMessage,
  ratingsSaveError,
  stepRating,
} from './playerRatings.js'

test('평점은 0.5 단위로 움직이고 1.0~10.0 밖으로 나가지 않는다', () => {
  assert.equal(stepRating(7, 1), 7.5)
  assert.equal(stepRating(7.5, -1), 7)
  assert.equal(stepRating(10, 1), 10)
  assert.equal(stepRating(1, -1), 1)
  // 소수 오차 없이 이어서 움직인다
  let value = 1
  for (let i = 0; i < 18; i += 1) value = stepRating(value, 1)
  assert.equal(value, 10)
})

test('평점이 없을 때 +는 5.0부터, −는 아무것도 하지 않는다', () => {
  assert.equal(stepRating(null, 1), 5)
  assert.equal(stepRating(null, -1), null)
})

test('평점은 소수 첫째 자리로, 없으면 "–"로 보여 준다', () => {
  assert.equal(formatRating(6), '6.0')
  assert.equal(formatRating(7.5), '7.5')
  assert.equal(formatRating(null), '–')
})

test('BE가 받는 평점인지 확인한다(1.0~10.0, 0.5 단위)', () => {
  assert.equal(isValidRating(1), true)
  assert.equal(isValidRating(9.5), true)
  assert.equal(isValidRating(0.5), false)
  assert.equal(isValidRating(10.5), false)
  assert.equal(isValidRating(7.25), false)
})

const players = [
  { id: 1, memberId: 10, name: '파티장', positions: ['MF'] },
  { id: 2, memberId: 11, name: '철벽', positions: ['DF'] },
  { id: 3, memberId: null, name: '게스트', positions: [] },
]
const ratings = [
  { gamePlayerId: 2, memberId: 11, name: '철벽', rating: 7.5 },
  { gamePlayerId: 3, memberId: null, name: '게스트', rating: null },
]

test('참가 선수 목록 순서대로 줄을 만들고, 파티장은 평점 대상이 아니다', () => {
  const rows = buildRatingRows({ ratings, players, hostId: 10 })
  assert.deepEqual(rows.map((row) => [row.id, row.isHost, row.ratable, row.rating]), [
    [1, true, false, null],
    [2, false, true, 7.5],
    [3, false, true, null],
  ])
  assert.deepEqual(rows[1].positions, ['DF'])
})

test('참가 선수 목록을 못 받으면 평점 목록만으로 줄을 만든다', () => {
  const rows = buildRatingRows({ ratings, players: null, hostId: 10 })
  assert.deepEqual(rows.map((row) => [row.id, row.ratable, row.positions.length]), [
    [2, true, 0],
    [3, true, 0],
  ])
})

test('바꾼 평점만 보내고, 입력 현황은 평점 대상만 센다', () => {
  const rows = buildRatingRows({ ratings, players, hostId: 10 })
  const drafts = { 2: 7.5, 3: 6 }
  assert.deepEqual(changedRatings(rows, drafts), [{ gamePlayerId: 3, rating: 6 }])
  assert.deepEqual(ratingProgress(rows, {}), { rated: 1, total: 2, ratio: 0.5 })
  assert.deepEqual(ratingProgress(rows, drafts), { rated: 2, total: 2, ratio: 1 })
  // 파티장 줄은 고쳐도 보내지 않는다
  assert.deepEqual(changedRatings(rows, { 1: 8 }), [])
  assert.equal(applyRatings(rows, [{ gamePlayerId: 3, rating: 6 }])[2].rating, 6)
})

test('저장 실패는 code로 고르고 다시 해도 안 되는 경우는 잠근다', () => {
  assert.match(ratingsSaveError({ status: 400, code: 'GAME_400_5' }).message, /0.5 단위/)
  assert.match(ratingsSaveError({ status: 400, code: 'GAME_400_6' }).message, /파티장 본인/)
  assert.equal(ratingsSaveError({ status: 409, code: 'GAME_409_6' }).lock, true)
  assert.equal(ratingsSaveError({ status: 403, code: 'GAME_403_1' }).lock, true)
  assert.equal(ratingsSaveError({ status: 404, code: 'GAME_404_2' }).reload, true)
  assert.match(ratingsSaveError({ status: 0 }).message, /서버에 연결할 수 없습니다/)
  assert.match(ratingsSaveError(new Error('x')).message, /저장하지 못했습니다/)
})

test('불러오기 실패 안내', () => {
  assert.match(ratingsLoadMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.match(ratingsLoadMessage({ status: 500 }), /선수 평점을 불러오지 못했습니다/)
})
