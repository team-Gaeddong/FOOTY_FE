import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loginErrorView, loginNoticeMessage } from './loginView.js'

test('로그인 코드 만료는 안내 카드로 보여 준다', () => {
  assert.deepEqual(loginErrorView('code_expired'), { kind: 'expired' })
})

test('나머지 실패 사유는 로그인 카드 안의 문구다', () => {
  for (const key of ['login_failed', 'network', 'member_not_found', 'unknown']) {
    const view = loginErrorView(key)
    assert.equal(view.kind, 'text', key)
    assert.ok(view.message.length > 0, key)
  }
})

test('모르는 사유나 사유가 없으면 아무것도 보여 주지 않는다', () => {
  assert.equal(loginErrorView('nope'), null)
  assert.equal(loginErrorView(undefined), null)
})

test('탈퇴 안내는 같은 계정으로 복구된다고 알려 준다', () => {
  assert.match(loginNoticeMessage('withdrawn'), /복구/)
  assert.equal(loginNoticeMessage('other'), null)
  assert.equal(loginNoticeMessage(undefined), null)
})
