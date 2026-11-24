import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatRating,
  profileLoadMessage,
  savePositionsMessage,
  sortedPositions,
  withdrawErrorMessage,
  withdrawFacts,
} from './profile.js'

const api = (status, code) => ({ status, code, message: 'BE 문구' })

test('평점은 BE가 준 값을 소수 둘째 자리로 그대로 보여 주고, 값이 없으면 -다', () => {
  assert.equal(formatRating(0), '0.00')
  assert.equal(formatRating(4.5), '4.50')
  assert.equal(formatRating(6.667), '6.67')
  assert.equal(formatRating('7.25'), '7.25')
  assert.equal(formatRating(null), '-')
  assert.equal(formatRating(undefined), '-')
  assert.equal(formatRating('abc'), '-')
})

test('선호 포지션은 우선순위 순서로 포지션만 꺼낸다', () => {
  assert.deepEqual(
    sortedPositions({ positions: [{ position: 'FW', priority: 2 }, { position: 'MF', priority: 1 }] }),
    ['MF', 'FW'],
  )
  assert.deepEqual(sortedPositions({ positions: [] }), [])
  assert.deepEqual(sortedPositions({}), [])
})

test('프로필 불러오기 실패 안내는 code로 고르고 BE 문구를 쓰지 않는다', () => {
  assert.match(profileLoadMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(profileLoadMessage(api(403, 'MEMBER_403_1')), /온보딩/)
  assert.match(profileLoadMessage(api(500)), /잠시 후 다시/)
  assert.doesNotMatch(profileLoadMessage(api(500)), /BE 문구/)
  assert.match(profileLoadMessage(new Error('x')), /불러오지 못했습니다/)
})

test('포지션 저장 실패 안내', () => {
  assert.match(savePositionsMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(savePositionsMessage(api(400, 'MEMBER_400_2')), /1~4개/)
  assert.match(savePositionsMessage(api(400, 'GLOBAL_400_1')), /1~4개/)
  assert.match(savePositionsMessage(api(403, 'MEMBER_403_1')), /온보딩/)
  assert.match(savePositionsMessage(api(500)), /잠시 후 다시/)
  assert.match(savePositionsMessage(new Error('x')), /다시 시도/)
})

test('탈퇴 실패 안내와 확인 화면의 안내 문구', () => {
  assert.match(withdrawErrorMessage(api(0)), /서버에 연결할 수 없습니다/)
  assert.match(withdrawErrorMessage(api(500)), /탈퇴하지 못했습니다/)
  assert.equal(withdrawFacts('왼발장인').length, 3)
  assert.match(withdrawFacts('왼발장인')[2], /‘왼발장인’은 탈퇴한 뒤에도/)
  assert.equal(withdrawFacts('').length, 2)
  assert.equal(withdrawFacts(null).length, 2)
})
