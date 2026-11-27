// 팀 탭(시안 Lineup·DetailLineup)에서 쓰는 계산. LineupResponse(BE D-21·D-22)와 TacticResponse(BE D-23)를 화면 모양으로 바꾼다.
// 화면에는 "라인업"이라는 말을 쓰지 않는다(코드의 lineup은 BE 이름 그대로다). 편성 방식(method)·버전도 화면에 보이지 않는다.

// 라인업 전체의 선발·후보 수(후보는 isSubstitute)
export function squadSummary(lineup) {
  let starters = 0
  let substitutes = 0
  for (const team of lineup.teams) {
    for (const member of team.members) {
      if (member.isSubstitute) substitutes += 1
      else starters += 1
    }
  }
  return { starters, substitutes }
}

// 참가 인원 아래 안내("선발 22명 · 후보 2명")
// 후보가 없으면 "후보 없음"(시안 DetailAfter)
export function lineupNote(lineup) {
  const { starters, substitutes } = squadSummary(lineup)
  return squadNote(starters, substitutes)
}

function squadNote(starters, substitutes) {
  return `선발 ${starters}명 · ${substitutes > 0 ? `후보 ${substitutes}명` : '후보 없음'}`
}

// 팀 구성을 따로 불러오지 않는 화면(경기 후 탭)용. 팀 짜기는 실력 순으로 앞의 maxPlayers명을 선발로 둔다(BE D-22).
export function squadNoteFromCounts(playerCount, maxPlayers) {
  const starters = Math.min(playerCount, maxPlayers)
  return squadNote(starters, Math.max(0, playerCount - starters))
}

// 팀 목록의 선수 줄. 서버가 준 순서를 지키되 후보는 뒤로 보낸다. 실력은 파티장에게만 내려온다(없으면 null).
export function teamRows(team) {
  const rows = team.members.map((member) => ({
    id: member.gamePlayerId,
    name: member.name,
    position: member.position,
    isSubstitute: member.isSubstitute,
    skillLevel: member.skillLevel ?? null,
  }))
  return [...rows.filter((row) => !row.isSubstitute), ...rows.filter((row) => row.isSubstitute)]
}

// 배치도에 그릴 선수: 좌표가 있는 팀원만, 퍼센트 좌표 그대로(BE D-23, 칩 중심).
export function pitchMarkers(tactic) {
  if (!tactic) return []
  return tactic.members
    .filter((member) => member.posX !== null && member.posX !== undefined && member.posY !== null && member.posY !== undefined)
    .map((member) => ({
      id: member.gamePlayerId,
      name: member.name,
      position: member.position,
      x: Number(member.posX),
      y: Number(member.posY),
    }))
}

// 팀 탭 맨 위 상태 표시(시안 Lineup·DetailLineup). 팀이 없으면 null이고, 그때는 빈 상태 카드를 보여 준다(States "팀 없음").
// 임시 팀(isConfirmed=false)은 참가자에게도 임시라고 알린다. 확정된 팀에서 확정 취소·경기 종료를 안내하는 문장은
// 그 버튼이 보이는 파티장(팀 확정 경기)에게만 쓴다. status는 경기 상태(BE status)다.
// 반환: { stage: 'draft' | 'confirmed', tone, badge, title, description }
export function teamStatusView({ lineup, isHost, status }) {
  if (!lineup) return null
  if (lineup.isConfirmed) {
    return {
      stage: 'confirmed',
      tone: 'navy',
      badge: '확정',
      title: '확정된 팀',
      description: canFinish({ isHost, status })
        ? '참가가 마감됐고 팀과 전술이 잠겼어요. 바꿀 게 있으면 확정을 취소하고, 경기를 마쳤으면 종료해 주세요.'
        : '참가가 마감됐고 팀과 전술이 잠겼어요.',
    }
  }
  return {
    stage: 'draft',
    tone: 'red',
    badge: '임시',
    title: '임시 팀 · 조정 중',
    description: isHost
      ? '실력 순으로 A·B팀에 번갈아 나눈 결과예요. 참가자에게도 임시 팀으로 보여요. 선수를 옮기고 전술을 짠 뒤 확정해 주세요.'
      : '파티장이 팀을 조정하고 있어요. 확정되기 전에는 선수와 팀이 바뀔 수 있어요.',
  }
}

// 확정된 팀의 "경기 종료" 버튼은 팀이 확정된(CONFIRMED) 경기의 파티장에게만 보인다. 권한은 BE 응답(GAME_403_1)을 따른다.
export function canFinish({ isHost, status }) {
  return isHost === true && status === 'CONFIRMED'
}

// "확정 취소"(PATCH .../lineups/confirm/cancel, BE D-40)도 같은 조건이다. 모집 중·종료된 경기는 BE가 LINEUP_409_5로 거절한다.
export function canCancelConfirm({ isHost, status }) {
  return canFinish({ isHost, status })
}

// 경기 종료 실패 안내. 분기는 상태 코드와 code로 한다.
export function finishErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'GAME_403_1') return '파티장만 경기를 종료할 수 있어요.'
  if (error?.code === 'GAME_404_1') return '경기를 찾을 수 없어요. 삭제된 경기일 수 있어요.'
  if (error?.code === 'GAME_409_4') return '팀이 확정된 경기만 종료할 수 있어요. 이미 종료됐다면 새로고침해 주세요.'
  return '경기를 종료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

// 팀 구성을 불러오지 못했을 때의 안내. 아직 팀을 짜지 않은 경우(LINEUP_404_2)는 오류가 아니라 빈 상태다.
export function isNoLineup(error) {
  return error?.code === 'LINEUP_404_2'
}

export function lineupErrorMessage(error) {
  if (error?.status === 0) return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  if (error?.code === 'MEMBER_403_1') return '온보딩을 마친 뒤 볼 수 있어요.'
  return '팀 구성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
