import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INVALID_NICKNAME,
  INVALID_POSITIONS,
  describeNicknameFailure,
  describePositionsFailure,
} from './onboarding.js'

test('닉네임 저장 실패를 code로 나눈다', () => {
  assert.equal(describeNicknameFailure({ code: 'MEMBER_409_1' }).kind, 'already')
  assert.deepEqual(describeNicknameFailure({ code: 'MEMBER_409_2' }), { kind: 'taken', field: 'nickname', message: null })
  assert.deepEqual(describeNicknameFailure({ code: 'MEMBER_400_1' }), {
    kind: 'invalid',
    field: 'nickname',
    message: INVALID_NICKNAME,
  })
})

test('연결 실패와 알 수 없는 실패는 입력 칸에 붙이지 않는다', () => {
  assert.equal(describeNicknameFailure({ status: 0 }).kind, 'network')
  assert.equal(describeNicknameFailure({ status: 0 }).field, null)
  assert.equal(describeNicknameFailure({ status: 500, code: 'GLOBAL_500_1' }).kind, 'unknown')
})

test('BE가 보낸 message 문구는 쓰지 않는다', () => {
  const failure = describeNicknameFailure({ code: 'MEMBER_400_1', message: '서버가 보낸 문구' })
  assert.equal(failure.message, INVALID_NICKNAME)
})

test('포지션 저장 실패는 닉네임이 저장됐다는 안내를 붙인다', () => {
  const failure = describePositionsFailure({ status: 500 })
  assert.equal(failure.kind, 'unknown')
  assert.match(failure.message, /닉네임은 저장됐어요/)
  assert.equal(describePositionsFailure({ status: 0 }).kind, 'network')
})

test('포지션 개수 오류는 포지션 칸에 붙인다', () => {
  assert.deepEqual(describePositionsFailure({ code: 'MEMBER_400_2' }), {
    kind: 'invalid',
    field: 'positions',
    message: INVALID_POSITIONS,
  })
})
