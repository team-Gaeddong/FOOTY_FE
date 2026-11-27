import { Avatar } from '../../components/Avatar.jsx'
import { Badge } from '../../components/Badge.jsx'
import { Button } from '../../components/Button.jsx'
import { MinusIcon, PencilIcon, PlusIcon } from '../../components/Icons.jsx'
import { PositionChips } from '../../components/PositionChips.jsx'
import { PositionPicker } from '../../components/PositionPicker.jsx'
import { SKILL_OPTIONS } from './skillLevels.js'
import { SKILL_START, stepSkill } from './playersView.js'
import styles from './PlayerRow.module.css'

// 선수 관리의 선수 한 줄: 이름·배지·포지션(연필로 수정), 실력(PC는 1~10 버튼, 모바일은 −/+), 포지션 인라인 편집기.
// skill: 지금 보여 줄 점수(저장된 값 또는 고친 값, 없으면 null). editor: { value, saving, error } | null이면 편집기가 닫혀 있다.
export function PlayerRow({
  player,
  isMe,
  skill,
  changed,
  scoresDisabled,
  canEditPositions,
  editor,
  onSkillChange,
  onEditPositions,
  onPositionsChange,
  onPositionsSave,
  onPositionsCancel,
}) {
  const unrated = skill === null

  return (
    <li className={styles.item} data-changed={changed}>
      <div className={styles.row}>
        <div className={styles.who}>
          <Avatar name={player.name} tone={isMe ? 'brand' : 'neutral'} />
          <div className={styles.whoText}>
            <div className={styles.nameLine}>
              <span className={styles.name}>{player.name}</span>
              {isMe && <Badge tone="brand">나</Badge>}
              {player.memberId === null && <Badge tone="gray">비회원</Badge>}
              {player.isSubstitute && <Badge tone="gray">후보</Badge>}
            </div>
            <div className={styles.positionLine}>
              {player.positions.length > 0 ? (
                <PositionChips positions={player.positions} />
              ) : (
                <span className={styles.noPositions}>희망 포지션 없음</span>
              )}
              {/* 시안은 편집기를 연 뒤에도 연필 버튼을 그대로 둔다 */}
              {canEditPositions && (
                <button
                  type="button"
                  className={styles.pencil}
                  aria-label={`${player.name} 포지션 수정`}
                  aria-expanded={Boolean(editor)}
                  onClick={onEditPositions}
                >
                  <PencilIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.score}>
          {unrated && (
            <span className={styles.unratedBadge}>
              <Badge tone="red">미입력</Badge>
            </span>
          )}
          <div className={styles.scoreButtons} role="group" aria-label={`${player.name} 실력`}>
            {SKILL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.scoreButton}
                aria-pressed={skill === option}
                aria-label={`${option}점`}
                disabled={scoresDisabled}
                onClick={() => onSkillChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label={`${player.name} 실력 낮추기`}
              disabled={scoresDisabled || unrated}
              onClick={() => onSkillChange(stepSkill(skill, -1))}
            >
              <MinusIcon size={20} />
            </button>
            <span className={unrated ? styles.stepValueEmpty : styles.stepValue}>{unrated ? '–' : skill}</span>
            <button
              type="button"
              className={styles.stepButton}
              aria-label={`${player.name} 실력 높이기`}
              disabled={scoresDisabled || skill === 10}
              onClick={() => onSkillChange(stepSkill(skill, 1) ?? SKILL_START)}
            >
              <PlusIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      {editor && (
        <div className={styles.editor}>
          <PositionPicker
            legend="경기 포지션 수정 · 누른 순서가 우선순위"
            value={editor.value}
            onChange={onPositionsChange}
            hint={null}
            showOrder={false}
            invalid={Boolean(editor.invalid)}
            disabled={editor.saving}
          />
          <div className={styles.editorActions}>
            <Button variant="secondary" fit="auto" className={styles.cancel} onClick={onPositionsCancel} disabled={editor.saving}>
              취소
            </Button>
            <Button variant="secondary" fit="auto" className={styles.save} onClick={onPositionsSave} disabled={editor.saving}>
              {editor.saving ? '저장하는 중…' : '포지션 저장'}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
