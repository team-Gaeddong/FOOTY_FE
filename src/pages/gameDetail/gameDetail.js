import { POSITION_LABELS } from '../../components/positions.js'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

// BE LocalDateTime 문자열(시간대 없음, 한국시간 기준)을 그대로 읽는다.
// 브라우저 시간대로 바꾸지 않으려고 Date 변환 없이 숫자만 꺼낸다(FD-12 미결정).
function parse(value) {
  const match = DATE_TIME.exec(value ?? '')
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  return { year, month, day, hour, minute }
}

// 경기 상태 배지 문구(BE `status`)
export const GAME_STATUS_LABELS = {
  RECRUITING: '모집 중',
  CONFIRMED: '팀 확정',
  FINISHED: '경기 종료',
}

// "2026-11-08T08:00:00" → "11월 8일 (토) 오전 8:00"
export function formatPlayDate(value) {
  const date = parse(value)
  if (!date) return value ?? ''
  const { year, month, day, hour, minute } = date
  // 요일은 날짜만으로 정해지므로 UTC로 계산해도 시간대 영향이 없다.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  const meridiem = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${month}월 ${day}일 (${weekday}) ${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`
}

// "2026-11-01T14:03:12" → "11월 1일"
export function formatCreatedDate(value) {
  const date = parse(value)
  if (!date) return value ?? ''
  return `${date.month}월 ${date.day}일`
}

// 참가 인원 막대의 채움 비율(0~1). 참가는 정원을 넘을 수 있어(BE D-19) 1에서 자른다.
export function fillRatio(playerCount, maxPlayers) {
  if (!(maxPlayers > 0)) return 0
  return Math.min(Math.max(playerCount / maxPlayers, 0), 1)
}

// 참가 선수 행의 배지. 파티장은 경기 생성 때 자동 참가한다(BE D-14), 비회원은 memberId가 null이다.
export function playerBadges(player, hostId) {
  const badges = []
  if (player.memberId !== null && player.memberId === hostId) badges.push('파티장')
  if (player.isSubstitute) badges.push('후보')
  if (player.memberId === null) badges.push('비회원')
  return badges
}

// 희망 포지션(우선순위 순) → "공격수 · 미드필더"
export function positionsText(positions) {
  if (!positions?.length) return '희망 포지션 없음'
  return positions.map((position) => POSITION_LABELS[position] ?? position).join(' · ')
}

// 실력은 파티장이 볼 때만 내려온다(BE D-20). 파티장 화면에서 아직 매기지 않은 선수 수.
export function countUnratedPlayers(players) {
  return players.filter((player) => player.skillLevel === null).length
}

// 경기 삭제는 파티장만, 종료 전(모집 중·팀 확정)까지만 된다(BE D-33). 버튼 노출에만 쓰고 권한은 BE 응답을 따른다.
export function canDeleteGame(game) {
  return game.isHost && game.status !== 'FINISHED'
}

// 경기 삭제 실패 안내. error는 ApiError(status, code) 또는 그 밖의 오류다.
export function deleteErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'GAME_403_1') return '파티장만 경기를 삭제할 수 있어요.'
  if (error?.code === 'GAME_404_1') return '이미 삭제됐거나 없는 경기예요.'
  if (error?.code === 'GAME_409_5') return '종료된 경기는 삭제할 수 없어요.'
  return '경기를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 경로의 gameId. 양의 정수가 아니면 null.
export function parseGameId(value) {
  if (!/^\d+$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// ── 개요 탭(시안 DetailGuest·DetailHost) ──

// 참가 인원 아래 안내. 참가는 정원을 넘을 수 있고(BE D-19) 넘친 선수는 팀 짜기에서 후보가 된다(BE D-22).
export function capacityNote(playerCount, maxPlayers) {
  if (playerCount < maxPlayers) return `정원까지 ${maxPlayers - playerCount}명 남았어요`
  if (playerCount === maxPlayers) return '정원이 모두 찼어요'
  return `정원 초과 ${playerCount - maxPlayers}명은 팀 짜기에서 후보가 돼요`
}

const STEP_LABELS = ['선수 모집', '실력 입력', '팀 짜기', '팀 확정', '경기 종료']

// 파티장 개요의 진행 단계 5개. unrated는 실력을 아직 안 매긴 선수 수이고 목록을 못 받았으면 null이다.
// 상태(status)로 알 수 있는 만큼만 구분한다: 모집 중은 1~3단계, 팀 확정은 4단계까지 끝난 5단계, 경기 종료는 전부 끝.
// (저장했지만 확정 전인 라인업은 status로 알 수 없어 3단계에 둔다.)
// 반환: [{ index, label, caption, state: 'done' | 'current' | 'todo' }]
export function progressSteps({ status, playerCount, unrated }) {
  let current
  if (status === 'FINISHED') current = 6
  else if (status === 'CONFIRMED') current = 5
  else if (playerCount < 2) current = 1
  else if (unrated === null || unrated > 0) current = 2
  else current = 3

  const rated = unrated === null ? null : Math.max(playerCount - unrated, 0)
  const captions = [
    `${playerCount}명 참가`,
    current > 2 ? '모두 입력' : rated === null ? '선수 실력 입력' : `${rated} / ${playerCount}명`,
    current > 3 ? '팀 짜기 완료' : '실력 입력 뒤',
    current > 4 ? '팀 확정 완료' : '확정 뒤 수정 불가',
    current > 5 ? '종료됨' : current === 5 ? '경기 후 종료' : '평가·MVP 열림',
  ]

  return STEP_LABELS.map((label, offset) => {
    const index = offset + 1
    return {
      index,
      label,
      caption: captions[offset],
      state: index < current ? 'done' : index === current ? 'current' : 'todo',
    }
  })
}

// 파티장 메뉴 맨 위의 "다음 할 일". action은 화면이 어떤 버튼을 그릴지 정하는 키다
// ('skill' 실력 매기기, 'lineup' 팀 짜기, 'viewLineup' 저장된 팀 보기, 'rematch' 재경기, null 버튼 없음).
// "팀 짜기"는 실력을 모두 입력한 경우에만 다음 할 일이 되고, 그 전에는 따로 잠긴 버튼으로 보여 준다(lineupLocked).
export function nextTask({ status, playerCount, unrated }) {
  if (status === 'FINISHED') {
    return {
      key: 'after',
      title: '경기 후',
      text: '평가·MVP 결과를 보고 다음 경기를 열 수 있어요.',
      action: 'rematch',
      label: '재경기 만들기',
    }
  }
  if (status === 'CONFIRMED') {
    return {
      key: 'play',
      title: '경기 진행',
      text: '팀이 확정됐어요. 경기를 마친 뒤 종료해 주세요.',
      action: 'viewLineup',
      label: '저장된 팀 보기',
    }
  }
  if (playerCount < 2) {
    return {
      key: 'recruit',
      title: '선수 모으기',
      text: '참가한 선수가 2명 이상이어야 팀을 짤 수 있어요.',
      action: null,
      label: null,
    }
  }
  if (unrated === 0) {
    return {
      key: 'lineup',
      title: '팀 짜기',
      text: '실력을 모두 입력했어요. 이제 팀을 나눠 볼 수 있어요.',
      action: 'lineup',
      label: '팀 짜기',
    }
  }
  return {
    key: 'skill',
    title: '실력 매기기',
    text:
      unrated === null
        ? '선수들의 실력을 입력하면 팀을 짤 수 있어요.'
        : `${unrated}명의 실력이 아직 없어요. 모두 입력해야 팀을 짤 수 있어요.`,
    action: 'skill',
    label: '실력 매기기',
  }
}

// 모집 중 경기에서 "팀 짜기" 버튼을 잠가 둘지(실력을 모두 입력하기 전). 목록을 못 받았으면 열어 두고 BE 응답으로 판단한다.
export function lineupLocked({ status, playerCount, unrated }) {
  return status === 'RECRUITING' && (playerCount < 2 || (unrated !== null && unrated > 0))
}

// 공지·투표 탭은 파티장과 참가자만 연다(BE 403). 그 밖에는 탭에 자물쇠를 보여 준다.
export function canOpenMemberTabs(game) {
  return game.isHost || game.isJoined
}

// 실력 매기기·팀 짜기·재경기 화면이 목록에서 받던 state와 같은 모양(GameSummaryResponse)
export function toSummary(game) {
  return {
    id: game.id,
    title: game.title,
    playDate: game.playDate,
    location: game.location,
    maxPlayers: game.maxPlayers,
    teamCount: game.teamCount,
    status: game.status,
    hostId: game.host.id,
  }
}

// "2026-11-20T09:00:00" → "2026. 11. 20."
export function formatCreatedDateFull(value) {
  const date = parse(value)
  if (!date) return value ?? ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.year}. ${pad(date.month)}. ${pad(date.day)}.`
}
