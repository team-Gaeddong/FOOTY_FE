import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IMAGE_PITCH, shortName, tacticImageFileName, tacticImageLayout } from './tacticImage.js'

function member(gamePlayerId, name, posX, posY, extra = {}) {
  return { gamePlayerId, name, position: 'MF', isSubstitute: false, posX, posY, ...extra }
}

const teamA = {
  teamId: 1,
  name: 'A팀',
  formation: '4-4-2',
  members: [member(1, '김철수', 50, 90, { position: 'GK' }), member(2, '이영희', 0, 0), member(3, '박민수', null, null)],
}
const teamB = { teamId: 2, name: 'B팀', formation: null, members: [] }

test('두 팀이면 2열 1행으로 놓는다', () => {
  const layout = tacticImageLayout([teamA, teamB], '경기 전술 배치도')
  assert.equal(layout.width, 32 * 2 + IMAGE_PITCH.width * 2 + 32)
  assert.equal(layout.teams.length, 2)
  assert.equal(layout.teams[0].pitch.y, layout.teams[1].pitch.y)
  assert.equal(layout.teams[1].pitch.x - layout.teams[0].pitch.x, IMAGE_PITCH.width + 32)
  assert.equal(layout.title.text, '경기 전술 배치도')
})

test('한 팀이면 1열, 세 팀이면 2행이 된다', () => {
  const one = tacticImageLayout([teamA], 't')
  assert.equal(one.width, 32 * 2 + IMAGE_PITCH.width)

  const three = tacticImageLayout([teamA, teamB, teamA], 't')
  assert.equal(three.teams[2].pitch.x, three.teams[0].pitch.x)
  assert.ok(three.teams[2].pitch.y > three.teams[0].pitch.y + IMAGE_PITCH.height)
  assert.ok(three.height > tacticImageLayout([teamA, teamB], 't').height)
})

test('BE 퍼센트 좌표를 경기장 픽셀 좌표(칩 중심)로 바꾸고, 배치 안 된 선수는 경기장에 그리지 않는다', () => {
  const [team] = tacticImageLayout([teamA], 't').teams
  assert.deepEqual(
    team.players.map(({ x, y, position }) => ({ x, y, position })),
    [
      { x: team.pitch.x + IMAGE_PITCH.width * 0.5, y: team.pitch.y + IMAGE_PITCH.height * 0.9, position: 'GK' },
      { x: team.pitch.x, y: team.pitch.y, position: 'MF' },
    ],
  )
})

test('BE가 좌표를 문자열로 줘도 숫자로 계산한다', () => {
  const [team] = tacticImageLayout([{ ...teamB, members: [member(9, '최', '25.5', '10')] }], 't').teams
  assert.equal(team.players[0].x, team.pitch.x + IMAGE_PITCH.width * 0.255)
})

test('팀 제목에 포메이션을 붙이고, 없으면 팀 이름만 쓴다', () => {
  const layout = tacticImageLayout([teamA, teamB], 't')
  assert.equal(layout.teams[0].heading.text, 'A팀 · 4-4-2')
  assert.equal(layout.teams[1].heading.text, 'B팀')
})

test('배치 안 된 선수를 세 명씩 줄로 적고, 후보를 표시한다', () => {
  const members = [
    member(1, '가', null, null),
    member(2, '나', null, null, { isSubstitute: true }),
    member(3, '다', null, null),
    member(4, '라', null, null),
  ]
  const [team] = tacticImageLayout([{ ...teamB, members }], 't').teams
  assert.deepEqual(
    team.bench.map((line) => line.text),
    ['배치 안 된 선수 4명', '가 · 나(후보) · 다', '라'],
  )
  assert.equal(team.bench[0].strong, true)
  assert.ok(team.bench[0].y > team.pitch.y + team.pitch.height)
})

test('모두 배치됐으면 없음 문구를 쓰고, 팀마다 줄 수가 달라도 같은 높이로 맞춘다', () => {
  const layout = tacticImageLayout([teamA, teamB], 't')
  assert.deepEqual(layout.teams[1].bench.map((line) => line.text), ['배치 안 된 선수 없음'])
  const lastLineBottom = layout.teams[0].bench.at(-1).y + 10
  assert.ok(lastLineBottom <= layout.height - 32)
})

test('shortName은 긴 이름을 말줄임하고 이모지를 한 글자로 센다', () => {
  assert.equal(shortName('홍길동', 6), '홍길동')
  assert.equal(shortName('아주아주긴이름입니다', 6), '아주아주긴…')
  assert.equal(shortName('⚽⚽⚽⚽⚽⚽⚽', 6), '⚽⚽⚽⚽⚽…')
  assert.equal(shortName(null, 6), '')
})

test('파일 이름에 경기 번호를 넣는다', () => {
  assert.equal(tacticImageFileName(12), 'footy-경기12-전술배치도.png')
})
