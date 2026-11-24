import { useRef, useState } from 'react'
import { Badge } from './Badge.jsx'
import { Button } from './Button.jsx'
import { formationSlots } from './formations.js'
import { WandIcon } from './Icons.jsx'
import { Pitch } from './Pitch.jsx'
import { PlayerChip } from './PlayerChip.jsx'
import { PositionChips } from './PositionChips.jsx'
import { clientToPercent, pitchPosition } from './pitchCoords.js'
import styles from './TacticBoard.module.css'
import {
  MAX_PLACEMENTS,
  autoPlace,
  freeSlotIndexes,
  isFull,
  liftTarget,
  movePlayer,
} from './tacticPlacements.js'

const DRAG_THRESHOLD = 6 // px. 이보다 덜 움직이면 드래그가 아니라 탭(선택)이다
const FULL_MESSAGE = `경기장에는 ${MAX_PLACEMENTS}명까지 놓을 수 있어요. 먼저 한 명을 빼 주세요.`

// 손가락·마우스가 놓인 곳의 드롭 대상을 찾는다. 드래그 중인 칩 미리보기는 pointer-events가 없어 걸리지 않는다.
// 끌고 있는 선수 자신의 원래 칩은 건너뛴다(조금만 옮기는 미세 조정).
function dropTargetAt(clientX, clientY, pitchRect, draggingId) {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const { dropPlayer, dropSlot, dropBench } = element.dataset ?? {}
    if (dropPlayer && Number(dropPlayer) !== draggingId) return { type: 'player', gamePlayerId: Number(dropPlayer) }
    if (dropSlot) return { type: 'slot', index: Number(dropSlot) }
    if (dropBench !== undefined) return { type: 'out' }
  }
  const point = clientToPercent(clientX, clientY, pitchRect)
  return point ? { type: 'point', ...point } : { type: 'out' }
}

// 포메이션 위에 팀원을 끌어다 놓는 제어형 배치판(BE D-23, 시안 Tactic). 경기장 카드와 오른쪽 열(포메이션·선택한 선수·벤치)을 그린다.
// placements는 { gamePlayerId, slot, x, y }[]이고 바뀔 때마다 onChange로 새 배열을 넘긴다.
// 끌어서 놓기 외에, 칩을 눌러 고른 뒤 놓을 곳을 누르는 방식과 벤치의 "올리기" 버튼도 된다(키보드·작은 화면용).
// teamTabs는 오른쪽 열 맨 위, footer는 맨 아래에 놓는다(모바일에서는 footer가 화면 아래에 붙는다).
export function TacticBoard({
  members,
  formation,
  formationNames,
  placements,
  onChange,
  onFormationChange,
  teamName,
  teamTabs = null,
  footer = null,
  editable = true,
}) {
  const pitchRef = useRef(null)
  const gesture = useRef(null) // { gamePlayerId, pointerId, startX, startY, offsetX, offsetY, moved }
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState(null) // { gamePlayerId, x, y } 미리보기 위치(client px)
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState('')

  const slots = formationSlots(formation)
  const freeSlots = freeSlotIndexes(placements, formation)
  const placedIds = new Set(placements.map((placement) => placement.gamePlayerId))
  const bench = members.filter((member) => !placedIds.has(member.gamePlayerId))
  const memberById = new Map(members.map((member) => [member.gamePlayerId, member]))
  const selected = selectedId === null ? null : memberById.get(selectedId)
  const canAutoPlace = slots.length > 0 && members.some((member) => !member.isSubstitute)

  // 선발 선수를 포지션에 맞춰 한 번에 놓는다. 기존 배치는 대체되고 저장은 저장 버튼으로 한다.
  function handleAutoPlace() {
    const next = autoPlace(members, formation)
    setSelectedId(null)
    setNotice(`${next.length}명을 포지션에 맞춰 놓았어요. 자리는 끌어서 바꿀 수 있어요.`)
    onChange(next)
  }

  function move(gamePlayerId, target) {
    const isNew = !placedIds.has(gamePlayerId)
    if (isNew && target.type !== 'out' && target.type !== 'player' && isFull(placements)) {
      setNotice(FULL_MESSAGE)
      return
    }
    setNotice('')
    const next = movePlayer(placements, gamePlayerId, target, formation)
    if (next !== placements) onChange(next)
  }

  // 벤치의 "올리기": 같은 역할의 빈 자리에 바로 놓는다
  function handleLift(member) {
    const target = liftTarget(member, placements, formation)
    if (!target) {
      setNotice(FULL_MESSAGE)
      return
    }
    setSelectedId(null)
    move(member.gamePlayerId, target)
  }

  function handlePointerDown(event, gamePlayerId) {
    suppressClick.current = false
    if (!editable || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    gesture.current = {
      gamePlayerId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      // 경기장 위 칩은 잡은 지점과 원 중심의 차이를 유지해 놓을 때 튀지 않게 한다
      offsetX: placedIds.has(gamePlayerId) ? event.clientX - (rect.left + rect.width / 2) : 0,
      offsetY: placedIds.has(gamePlayerId) ? event.clientY - (rect.top + 22) : 0,
      moved: false,
    }
  }

  function handlePointerMove(event) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    if (
      !current.moved &&
      Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD
    ) {
      return
    }
    current.moved = true
    setDrag({
      gamePlayerId: current.gamePlayerId,
      x: event.clientX - current.offsetX,
      y: event.clientY - current.offsetY,
    })
  }

  function handlePointerUp(event) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    if (!current.moved) return
    suppressClick.current = true
    setDrag(null)
    setSelectedId(null)
    const x = event.clientX - current.offsetX
    const y = event.clientY - current.offsetY
    const target = dropTargetAt(x, y, pitchRef.current.getBoundingClientRect(), current.gamePlayerId)
    // 벤치 칩을 경기장 밖에 놓으면 아무 일도 없다
    if (target.type === 'out' && !placedIds.has(current.gamePlayerId)) return
    move(current.gamePlayerId, target)
  }

  function handlePointerCancel() {
    gesture.current = null
    setDrag(null)
  }

  // 탭으로 고르기: 첫 탭은 선택, 다른 선수를 탭하면 그 자리와 교체
  function handleChipClick(gamePlayerId) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (!editable) return
    if (selectedId === null || selectedId === gamePlayerId) {
      setSelectedId(selectedId === gamePlayerId ? null : gamePlayerId)
      setNotice('')
      return
    }
    if (!placedIds.has(selectedId) && !placedIds.has(gamePlayerId)) {
      setSelectedId(gamePlayerId) // 벤치끼리는 교체할 게 없으니 선택만 바꾼다
      return
    }
    // 벤치 선수를 먼저 골랐으면 경기장 선수 자리로, 경기장 선수를 먼저 골랐으면 상대 자리로
    if (placedIds.has(gamePlayerId)) move(selectedId, { type: 'player', gamePlayerId })
    else move(gamePlayerId, { type: 'player', gamePlayerId: selectedId })
    setSelectedId(null)
  }

  function handleSlotClick(index) {
    if (selectedId === null) return
    move(selectedId, { type: 'slot', index })
    setSelectedId(null)
  }

  function handlePitchClick(event) {
    if (selectedId === null || event.target.closest('button')) return
    const point = clientToPercent(event.clientX, event.clientY, pitchRef.current.getBoundingClientRect())
    if (!point) return
    move(selectedId, { type: 'point', ...point })
    setSelectedId(null)
  }

  function chipProps(gamePlayerId) {
    return {
      selected: selectedId === gamePlayerId,
      dragging: drag?.gamePlayerId === gamePlayerId,
      disabled: !editable,
      onPointerDown: (event) => handlePointerDown(event, gamePlayerId),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClick: () => handleChipClick(gamePlayerId),
    }
  }

  const draggingMember = drag ? memberById.get(drag.gamePlayerId) : null
  const full = isFull(placements)
  const unplaced = bench.filter((member) => !member.isSubstitute).length
  const substitutes = bench.length - unplaced

  return (
    <div className={styles.board}>
      <section className={styles.pitchCard} aria-label="경기장">
        <div className={styles.pitchArea} onClick={handlePitchClick}>
          <Pitch ref={pitchRef} label={`${teamName} 전술 배치도, ${placements.length}/${MAX_PLACEMENTS}명 배치`}>
            {editable &&
              freeSlots.map((index) => (
                <button
                  key={`slot-${index}`}
                  type="button"
                  className={styles.slot}
                  style={pitchPosition(slots[index])}
                  data-drop-slot={index}
                  data-active={selectedId !== null}
                  aria-label={`빈 ${slots[index].role} 자리`}
                  tabIndex={selectedId === null ? -1 : 0}
                  onClick={() => handleSlotClick(index)}
                >
                  {slots[index].role}
                </button>
              ))}
            {placements.map((placement) => {
              const member = memberById.get(placement.gamePlayerId)
              if (!member) return null
              return (
                <PlayerChip
                  key={placement.gamePlayerId}
                  player={member}
                  onPitch
                  style={pitchPosition(placement)}
                  data-drop-player={placement.gamePlayerId}
                  {...chipProps(placement.gamePlayerId)}
                />
              )
            })}
          </Pitch>
        </div>
        {!editable && <p className={styles.count} aria-live="polite">{placements.length}명 배치됨</p>}
      </section>

      <div className={styles.side}>
        {teamTabs}

        <section className={styles.panel} aria-labelledby="tactic-formation-title">
          <h2 id="tactic-formation-title" className={styles.panelTitle}>포메이션</h2>
          <div className={styles.formations}>
            {formationNames.map((name) => (
              <button
                key={name}
                type="button"
                className={styles.formation}
                aria-pressed={formation === name}
                disabled={!editable}
                onClick={() => onFormationChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {editable && (
            <>
              <Button variant="secondary" onClick={handleAutoPlace} disabled={!canAutoPlace}>
                <WandIcon size={18} />
                자동 배치
              </Button>
              <p className={styles.note}>
                선발 선수를 배정 포지션과 같은 역할의 자리에 놓아요. 후보는 놓지 않아요.
              </p>
            </>
          )}
        </section>

        {editable && (
          <section className={styles.panel} aria-labelledby="tactic-selected-title">
            <h2 id="tactic-selected-title" className={styles.panelTitle}>선택한 선수</h2>
            {selected && (
              <div className={styles.selected}>
                <PositionChips positions={[selected.position]} />
                <span className={styles.selectedName}>{selected.name}</span>
                <Badge tone="green">선택됨</Badge>
              </div>
            )}
            <p className={styles.text} aria-live="polite">
              {notice ||
                (selected
                  ? placedIds.has(selectedId)
                    ? '경기장의 다른 자리를 누르거나 끌어서 옮겨요. 벤치로 내리면 배치가 해제돼요.'
                    : `${selected.name} 선수를 놓을 자리나 바꿀 선수를 눌러 주세요.`
                  : '선수를 끌어 경기장에 놓거나, 눌러서 고른 뒤 자리를 눌러 주세요.')}
            </p>
            {selected && placedIds.has(selectedId) && (
              <Button
                variant="secondary"
                onClick={() => {
                  move(selectedId, { type: 'out' })
                  setSelectedId(null)
                }}
              >
                벤치로 내리기
              </Button>
            )}
          </section>
        )}

        <section className={styles.panel} data-drop-bench="" aria-labelledby="tactic-bench-title">
          <div className={styles.panelHead}>
            <h2 id="tactic-bench-title" className={styles.panelTitle}>벤치</h2>
            <span className={styles.count}>미배치 {unplaced} · 후보 {substitutes}</span>
          </div>
          {bench.length === 0 ? (
            <p className={styles.text}>모든 선수를 배치했어요.</p>
          ) : (
            <ul className={styles.benchList}>
              {bench.map((member) => (
                <li key={member.gamePlayerId} className={styles.benchRow}>
                  <PlayerChip player={member} {...chipProps(member.gamePlayerId)} />
                  {editable && (
                    <Button
                      variant="secondary"
                      fit="auto"
                      className={styles.lift}
                      aria-label={`${member.name} 선수를 경기장에 올리기`}
                      disabled={full}
                      onClick={() => handleLift(member)}
                    >
                      올리기
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <p className={styles.note}>
              경기장에는 최대 {MAX_PLACEMENTS}명까지 올릴 수 있어요. 지금 {placements.length} / {MAX_PLACEMENTS}명.
            </p>
          )}
        </section>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>

      {draggingMember && (
        <div className={styles.ghost} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <span className={styles.ghostPosition}>{draggingMember.position}</span>
          <span className={styles.ghostName}>{draggingMember.name}</span>
        </div>
      )}
    </div>
  )
}
