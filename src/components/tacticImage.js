// 전술 배치도 이미지(PNG) 저장(#57). 라인업의 모든 팀 배치를 한 장에 그려 기기에 내려받는다.
// 서버에는 올리지 않는다(BE lineup.image_url 미사용, BE #75). 의존성 없이 Canvas 2D API로 그린다.
// tacticImageLayout은 순수 함수(테스트 대상)이고, 그리기·내려받기는 브라우저에서만 돈다.

const SCALE = 2 // 고해상도 화면에서도 선명하게 2배로 그린다
export const IMAGE_PITCH = { width: 340, height: 525 } // 68×105m 비율(Pitch.jsx와 같다)
const PADDING = 32
const GAP = 32
const TITLE_HEIGHT = 48
const HEADER_HEIGHT = 36
const BENCH_TOP_GAP = 16
const BENCH_LINE_HEIGHT = 20
const NAMES_PER_LINE = 3
const MAX_COLUMNS = 2
const PLAYER_RADIUS = 16

const COLORS = {
  background: '#ffffff',
  text: '#1b1f1c', // --color-text
  muted: '#5f6b63', // --color-text-muted
  primary: '#1f8a4c', // --color-primary
  grass: ['#2f9e57', '#2b9150'], // Pitch.module.css
  line: 'rgb(255 255 255 / 0.8)',
  label: 'rgb(0 0 0 / 0.55)',
  white: '#ffffff',
}

function isPlaced(member) {
  return member.posX !== null && member.posX !== undefined && member.posY !== null && member.posY !== undefined
}

// 이름이 길면 max 글자(이모지 등은 한 글자로 센다)로 줄이고 말줄임표를 붙인다.
export function shortName(name, max) {
  const chars = Array.from(name ?? '')
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('')
}

function benchLines(members) {
  const names = members
    .filter((member) => !isPlaced(member))
    .map((member) => `${shortName(member.name, 8)}${member.isSubstitute ? '(후보)' : ''}`)
  if (names.length === 0) return ['배치 안 된 선수 없음']
  const lines = [`배치 안 된 선수 ${names.length}명`]
  for (let index = 0; index < names.length; index += NAMES_PER_LINE) {
    lines.push(names.slice(index, index + NAMES_PER_LINE).join(' · '))
  }
  return lines
}

// tactics: TacticResponse[](팀 순서대로). 팀을 2열로 놓고, 좌표는 BE 퍼센트(0~100, 칩 중심)를 픽셀로 바꾼다.
export function tacticImageLayout(tactics, title) {
  const columns = Math.min(MAX_COLUMNS, Math.max(1, tactics.length))
  const rows = Math.max(1, Math.ceil(tactics.length / columns))
  const benches = tactics.map((tactic) => benchLines(tactic.members))
  const benchHeight = BENCH_TOP_GAP + Math.max(1, ...benches.map((lines) => lines.length)) * BENCH_LINE_HEIGHT
  const cellHeight = HEADER_HEIGHT + IMAGE_PITCH.height + benchHeight

  const teams = tactics.map((tactic, index) => {
    const x = PADDING + (index % columns) * (IMAGE_PITCH.width + GAP)
    const top = PADDING + TITLE_HEIGHT + Math.floor(index / columns) * (cellHeight + GAP)
    const pitch = { x, y: top + HEADER_HEIGHT, ...IMAGE_PITCH }
    const benchTop = pitch.y + pitch.height + BENCH_TOP_GAP
    return {
      heading: { text: tactic.formation ? `${tactic.name} · ${tactic.formation}` : tactic.name, x, y: top + HEADER_HEIGHT / 2 },
      pitch,
      players: tactic.members.filter(isPlaced).map((member) => ({
        x: pitch.x + (Number(member.posX) / 100) * pitch.width,
        y: pitch.y + (Number(member.posY) / 100) * pitch.height,
        position: member.position,
        name: shortName(member.name, 6),
      })),
      bench: benches[index].map((text, line) => ({
        text,
        x,
        y: benchTop + line * BENCH_LINE_HEIGHT + BENCH_LINE_HEIGHT / 2,
        strong: line === 0,
      })),
    }
  })

  return {
    width: PADDING * 2 + columns * IMAGE_PITCH.width + (columns - 1) * GAP,
    height: PADDING * 2 + TITLE_HEIGHT + rows * cellHeight + (rows - 1) * GAP,
    title: { text: title, x: PADDING, y: PADDING + TITLE_HEIGHT / 2 },
    teams,
  }
}

export function tacticImageFileName(gameId) {
  return `footy-경기${gameId}-전술배치도.png`
}

// Pitch.jsx의 SVG(viewBox 0 0 68 105)와 같은 선을 그린다.
function drawPitch(ctx, { x, y, width, height }) {
  const unit = width / 68
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 8)
  ctx.clip()
  const stripe = height / 10
  for (let index = 0; index < 10; index += 1) {
    ctx.fillStyle = COLORS.grass[index % 2]
    ctx.fillRect(x, y + index * stripe, width, stripe + 1)
  }

  ctx.strokeStyle = COLORS.line
  ctx.fillStyle = COLORS.line
  ctx.lineWidth = 0.4 * unit
  const rect = (rx, ry, rw, rh) => ctx.strokeRect(x + rx * unit, y + ry * unit, rw * unit, rh * unit)
  const circle = (cx, cy, r, fill) => {
    ctx.beginPath()
    ctx.arc(x + cx * unit, y + cy * unit, r * unit, 0, Math.PI * 2)
    if (fill) ctx.fill()
    else ctx.stroke()
  }
  rect(1, 1, 66, 103)
  ctx.beginPath()
  ctx.moveTo(x + unit, y + 52.5 * unit)
  ctx.lineTo(x + 67 * unit, y + 52.5 * unit)
  ctx.stroke()
  circle(34, 52.5, 9.15)
  circle(34, 52.5, 0.5, true)
  rect(13.84, 1, 40.32, 16.5)
  rect(24.84, 1, 18.32, 5.5)
  rect(13.84, 87.5, 40.32, 16.5)
  rect(24.84, 98.5, 18.32, 5.5)
  circle(34, 12, 0.5, true)
  circle(34, 93, 0.5, true)
  ctx.restore()
}

// 경기장 위 칩(PlayerChip onPitch)과 같은 모양: 포지션 원 + 아래 이름표
function drawPlayer(ctx, player, fontFamily) {
  ctx.beginPath()
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.primary
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = COLORS.white
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.white
  ctx.font = `800 11px ${fontFamily}`
  ctx.fillText(player.position, player.x, player.y)

  ctx.font = `600 11px ${fontFamily}`
  const labelWidth = Math.min(ctx.measureText(player.name).width + 8, 72)
  const labelY = player.y + PLAYER_RADIUS + 10
  ctx.beginPath()
  ctx.roundRect(player.x - labelWidth / 2, labelY - 8, labelWidth, 16, 4)
  ctx.fillStyle = COLORS.label
  ctx.fill()
  ctx.fillStyle = COLORS.white
  ctx.fillText(player.name, player.x, labelY, labelWidth - 4)
  ctx.textAlign = 'left'
}

export function drawTacticImage(ctx, layout, fontFamily) {
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  ctx.fillStyle = COLORS.text
  ctx.font = `800 22px ${fontFamily}`
  ctx.fillText(layout.title.text, layout.title.x, layout.title.y, layout.width - layout.title.x * 2)

  for (const team of layout.teams) {
    ctx.fillStyle = COLORS.text
    ctx.font = `700 16px ${fontFamily}`
    ctx.fillText(team.heading.text, team.heading.x, team.heading.y, team.pitch.width)
    drawPitch(ctx, team.pitch)
    for (const player of team.players) drawPlayer(ctx, player, fontFamily)
    for (const line of team.bench) {
      ctx.fillStyle = line.strong ? COLORS.text : COLORS.muted
      ctx.font = `${line.strong ? 700 : 400} 13px ${fontFamily}`
      ctx.fillText(line.text, line.x, line.y, team.pitch.width)
    }
  }
}

// layout을 PNG Blob으로 만든다. 웹 폰트가 다 불러와진 뒤 그려야 글자가 대체 폰트로 찍히지 않는다.
export async function renderTacticImage(layout) {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = layout.width * SCALE
  canvas.height = layout.height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unsupported')
  ctx.scale(SCALE, SCALE)
  drawTacticImage(ctx, layout, getComputedStyle(document.body).fontFamily)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png encode failed'))), 'image/png')
  })
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // 클릭 직후 바로 해제하면 일부 브라우저에서 내려받기가 취소된다
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
