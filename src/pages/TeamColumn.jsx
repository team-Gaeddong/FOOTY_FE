import { Link } from 'react-router'
import { Badge } from '../components/Badge.jsx'
import { Button } from '../components/Button.jsx'
import { ArrowRightIcon, PitchIcon } from '../components/Icons.jsx'
import { PositionChips } from '../components/PositionChips.jsx'
import { squadCounts, toTeamLabel } from './lineupEdit.js'
import styles from './TeamColumn.module.css'

// 팀 하나(시안 Lineup): 선발·후보 수, 선수 줄(포지션·이름·실력·다른 팀으로 옮기기), 전술 배치도 열기.
// team.members의 movedFrom은 이 선수가 다른 팀에서 옮겨 왔다는 뜻이다. editable이 아니면 옮기기 버튼이 없다.
export function TeamColumn({
  team,
  otherTeams,
  editable,
  moveDisabled,
  onMove,
  myGamePlayerId,
  tactic,
  onLeave,
}) {
  const { starters, substitutes } = squadCounts(team.members)

  return (
    <section className={styles.card} aria-labelledby={`team-${team.teamId}`}>
      <div className={styles.header}>
        <h2 id={`team-${team.teamId}`} className={styles.title}>
          {team.name}
        </h2>
        <span className={styles.count}>
          선발 {starters} · 후보 {substitutes}
        </span>
      </div>

      {team.members.length === 0 ? (
        <p className={styles.empty}>배정된 선수가 없어요.</p>
      ) : (
        <ul className={styles.rows}>
          {team.members.map((member) => (
            <li key={member.gamePlayerId} className={styles.row}>
              <PositionChips positions={[member.position]} />
              <div className={styles.who}>
                <span className={styles.name}>{member.name}</span>
                {member.gamePlayerId === myGamePlayerId && <Badge tone="brand">나</Badge>}
                {member.movedFrom !== undefined && <Badge tone="green">옮김</Badge>}
                {member.isSubstitute && <Badge tone="gray">후보</Badge>}
              </div>
              {typeof member.skillLevel === 'number' && <span className={styles.skill}>{member.skillLevel}</span>}
              {editable &&
                otherTeams.map((other) => (
                  <button
                    key={other.teamId}
                    type="button"
                    className={styles.move}
                    aria-label={`${member.name} 선수를 ${toTeamLabel(other.name)} 옮기기`}
                    disabled={moveDisabled}
                    onClick={() => onMove(member.gamePlayerId, other.teamId)}
                  >
                    {toTeamLabel(other.name)}
                    <ArrowRightIcon size={16} />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      <Button
        as={Link}
        to={tactic.to}
        state={tactic.state}
        variant="secondary"
        onClick={onLeave}
      >
        <PitchIcon size={18} />
        {team.name} 전술 배치도
      </Button>
    </section>
  )
}
