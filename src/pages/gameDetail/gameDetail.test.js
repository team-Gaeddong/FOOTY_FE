import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canDeleteGame,
  canOpenMemberTabs,
  capacityNote,
  countUnratedPlayers,
  deleteErrorMessage,
  fillRatio,
  formatCreatedDate,
  formatCreatedDateFull,
  formatPlayDate,
  gameStatusBadge,
  isGamePassed,
  lineupLocked,
  nextTask,
  parseGameId,
  playerBadges,
  positionsText,
  progressSteps,
  toSummary,
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

test('경기 삭제 버튼은 파티장에게 종료 전 경기에서만 보인다', () => {
  assert.equal(canDeleteGame({ isHost: true, status: 'RECRUITING' }), true)
  assert.equal(canDeleteGame({ isHost: true, status: 'CONFIRMED' }), true)
  assert.equal(canDeleteGame({ isHost: true, status: 'FINISHED' }), false)
  assert.equal(canDeleteGame({ isHost: false, status: 'RECRUITING' }), false)
})

test('경기 삭제 실패는 상태 코드와 code로 안내한다', () => {
  assert.match(deleteErrorMessage({ status: 0 }), /서버에 연결할 수 없습니다/)
  assert.equal(deleteErrorMessage({ status: 403, code: 'GAME_403_1' }), '파티장만 경기를 삭제할 수 있어요.')
  assert.equal(deleteErrorMessage({ status: 404, code: 'GAME_404_1' }), '이미 삭제됐거나 없는 경기예요.')
  assert.equal(deleteErrorMessage({ status: 409, code: 'GAME_409_5' }), '종료된 경기는 삭제할 수 없어요.')
  assert.match(deleteErrorMessage(new Error('boom')), /삭제하지 못했습니다/)
})

test('정원 안내는 남은 자리, 가득 찬 경우, 초과(후보)를 구분한다', () => {
  assert.equal(capacityNote(8, 12), '정원까지 4명 남았어요')
  assert.equal(capacityNote(12, 12), '정원이 모두 찼어요')
  assert.equal(capacityNote(24, 22), '정원 초과 2명은 팀 짜기에서 후보가 돼요')
})

const states = (steps) => steps.map((step) => step.state)

test('진행 단계: 선수가 2명 미만이면 1단계, 실력이 비었으면 2단계, 모두 입력했으면 3단계다', () => {
  assert.deepEqual(states(progressSteps({ status: 'RECRUITING', playerCount: 1, unrated: 1 })), ['current', 'todo', 'todo', 'todo', 'todo'])
  assert.deepEqual(states(progressSteps({ status: 'RECRUITING', playerCount: 24, unrated: 3 })), ['done', 'current', 'todo', 'todo', 'todo'])
  assert.deepEqual(states(progressSteps({ status: 'RECRUITING', playerCount: 24, unrated: 0 })), ['done', 'done', 'current', 'todo', 'todo'])
})

test('진행 단계: 실력 목록을 못 받았으면 2단계로 두고, 팀 확정은 5단계, 경기 종료는 전부 끝이다', () => {
  assert.equal(progressSteps({ status: 'RECRUITING', playerCount: 10, unrated: null })[1].state, 'current')
  assert.deepEqual(states(progressSteps({ status: 'CONFIRMED', playerCount: 10, unrated: 0 })), ['done', 'done', 'done', 'done', 'current'])
  assert.deepEqual(states(progressSteps({ status: 'FINISHED', playerCount: 10, unrated: 0 })), ['done', 'done', 'done', 'done', 'done'])
})

test('진행 단계의 설명은 참가 인원과 실력 입력 수를 보여 준다', () => {
  const steps = progressSteps({ status: 'RECRUITING', playerCount: 24, unrated: 3 })
  assert.equal(steps[0].caption, '24명 참가')
  assert.equal(steps[1].caption, '21 / 24명')
  assert.equal(steps[2].caption, '실력 입력 뒤')
  assert.equal(steps[3].caption, '확정 뒤 수정 불가')
  assert.equal(steps[4].caption, '평가·MVP 열림')
  assert.equal(progressSteps({ status: 'RECRUITING', playerCount: 24, unrated: 0 })[1].caption, '모두 입력')
  assert.deepEqual(steps.map((step) => step.label), ['선수 모집', '실력 입력', '팀 짜기', '팀 확정', '경기 종료'])
})

test('다음 할 일은 단계에 맞는 안내와 버튼 키를 준다', () => {
  assert.deepEqual(
    nextTask({ status: 'RECRUITING', playerCount: 24, unrated: 3 }),
    {
      key: 'skill',
      title: '실력 매기기',
      text: '3명의 실력이 아직 없어요. 모두 입력해야 팀을 짤 수 있어요.',
      action: 'skill',
      label: '실력 매기기',
    },
  )
  assert.equal(nextTask({ status: 'RECRUITING', playerCount: 24, unrated: 0 }).action, 'lineup')
  assert.equal(nextTask({ status: 'RECRUITING', playerCount: 1, unrated: 1 }).action, null)
  assert.equal(nextTask({ status: 'RECRUITING', playerCount: 10, unrated: null }).action, 'skill')
  assert.equal(nextTask({ status: 'CONFIRMED', playerCount: 10, unrated: 0 }).action, 'viewLineup')
  assert.equal(nextTask({ status: 'FINISHED', playerCount: 10, unrated: 0 }).action, 'rematch')
})

test('팀 짜기 버튼은 모집 중이고 실력이 비었거나 선수가 모자랄 때만 잠근다', () => {
  assert.equal(lineupLocked({ status: 'RECRUITING', playerCount: 24, unrated: 3 }), true)
  assert.equal(lineupLocked({ status: 'RECRUITING', playerCount: 1, unrated: 0 }), true)
  assert.equal(lineupLocked({ status: 'RECRUITING', playerCount: 24, unrated: 0 }), false)
  assert.equal(lineupLocked({ status: 'RECRUITING', playerCount: 24, unrated: null }), false)
  assert.equal(lineupLocked({ status: 'CONFIRMED', playerCount: 24, unrated: 3 }), false)
})

test('공지·투표 탭은 파티장과 참가자만 연다', () => {
  assert.equal(canOpenMemberTabs({ isHost: true, isJoined: true }), true)
  assert.equal(canOpenMemberTabs({ isHost: false, isJoined: true }), true)
  assert.equal(canOpenMemberTabs({ isHost: false, isJoined: false }), false)
})

test('다른 화면에 넘기는 경기 요약은 파티장 ID를 host.id에서 가져온다', () => {
  const game = {
    id: 3, title: '경기', playDate: '2026-11-25T20:00:00', location: '구장', maxPlayers: 12,
    teamCount: 2, status: 'RECRUITING', host: { id: 7, nickname: '철벽수비' }, playerCount: 5, isHost: false, isJoined: true,
  }
  assert.deepEqual(toSummary(game), {
    id: 3, title: '경기', playDate: '2026-11-25T20:00:00', location: '구장', maxPlayers: 12,
    teamCount: 2, status: 'RECRUITING', hostId: 7,
  })
})

test('만든 날짜는 연·월·일을 점으로 이어 쓴다', () => {
  assert.equal(formatCreatedDateFull('2026-11-20T09:00:00'), '2026. 11. 20.')
  assert.equal(formatCreatedDateFull('2026-03-04T09:00:00'), '2026. 03. 04.')
  assert.equal(formatCreatedDateFull('이상한 값'), '이상한 값')
})

// 2026-11-27 21:00(금)을 "지금"으로 둔다. Date의 월은 0부터라 10이 11월이다.
const NOW = new Date(2026, 10, 27, 21, 0, 0)

test('일정이 지난 모집 중·팀 확정 경기는 지난 경기다', () => {
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: '2026-11-27T20:59:59' }, NOW), true)
  assert.equal(isGamePassed({ status: 'CONFIRMED', playDate: '2026-11-22T17:30:00' }, NOW), true)
})

test('지금 시작하는 경기와 앞으로의 경기는 지난 경기가 아니다', () => {
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: '2026-11-27T21:00:00' }, NOW), false)
  assert.equal(isGamePassed({ status: 'CONFIRMED', playDate: '2026-12-02T20:00:00' }, NOW), false)
})

test('종료된 경기와 일시를 읽을 수 없는 경기는 지난 경기로 보지 않는다', () => {
  assert.equal(isGamePassed({ status: 'FINISHED', playDate: '2026-11-15T17:30:00' }, NOW), false)
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: null }, NOW), false)
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: '내일' }, NOW), false)
})

test('소수 초가 붙은 일시도 같은 초까지만 비교한다', () => {
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: '2026-11-27T21:00:00.500000' }, NOW), false)
  assert.equal(isGamePassed({ status: 'RECRUITING', playDate: '2026-11-27T20:59:59.999999' }, NOW), true)
})

test('목록 상태 배지는 지난 경기를 "일정 지남"으로, 나머지는 상태대로 보여 준다', () => {
  assert.deepEqual(gameStatusBadge({ status: 'RECRUITING', playDate: '2026-11-21T10:10:00' }, NOW), {
    tone: 'gray',
    label: '일정 지남',
  })
  assert.deepEqual(gameStatusBadge({ status: 'RECRUITING', playDate: '2026-12-02T20:00:00' }, NOW), {
    tone: 'green',
    label: '모집 중',
  })
  assert.deepEqual(gameStatusBadge({ status: 'CONFIRMED', playDate: '2026-12-06T18:00:00' }, NOW), {
    tone: 'navy',
    label: '팀 확정',
  })
  assert.deepEqual(gameStatusBadge({ status: 'FINISHED', playDate: '2026-11-22T17:30:00' }, NOW), {
    tone: 'gray',
    label: '경기 종료',
  })
})
