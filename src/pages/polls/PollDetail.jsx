import { useRef, useState } from 'react'
import { answerPoll } from '../../api/polls.js'
import { Button } from '../../components/Button.jsx'
import { ErrorMessage } from '../../components/ErrorMessage.jsx'
import { CheckIcon } from '../../components/Icons.jsx'
import {
  pollErrorMessage,
  pollMeta,
  sameSelection,
  selectedOptionIds,
  toggleSelection,
} from './polls.js'
import { PollStatusBadges } from './PollStatusBadges.jsx'
import styles from './PollDetail.module.css'

// 투표 한 건의 상세와 참여(PUT /games/{gameId}/polls/{pollId}/answers, BE D-34, 시안 Polls).
// 마감 전에는 다시 보내 내 선택을 전부 바꾸거나 빈 목록으로 취소할 수 있다. 결과는 득표 수와 투표자 닉네임까지 공개다.
// poll은 GET /games/{gameId}/polls/{pollId} 응답이고, 저장하면 반영된 응답을 onChange로 올려 보낸다.
// 투표가 바뀌면(다른 투표를 열면) 부모가 key를 바꿔 이 안의 선택·메시지를 처음부터 다시 시작한다.
export function PollDetail({ gameId, poll, justCreated, onChange, onRefresh }) {
  const [draft, setDraft] = useState(null) // 고른 선택지 ID. null이면 저장된 선택 그대로
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null) // { message } | { error }
  const pending = useRef(false)
  const saved = selectedOptionIds(poll)
  const selected = draft ?? saved
  const changed = !sameSelection(selected, saved)
  const inputType = poll.allowMultiple ? 'checkbox' : 'radio'

  function select(ids) {
    setDraft(ids)
    setSaveResult(null)
  }

  async function submit(optionIds, doneMessage) {
    if (pending.current) return
    pending.current = true
    setSaving(true)
    setSaveResult(null)
    try {
      const updated = await answerPoll(gameId, poll.id, optionIds)
      onChange(updated)
      setDraft(null)
      setSaveResult({ message: doneMessage })
    } catch (error) {
      setSaveResult({ error: pollErrorMessage(error, '투표하지 못했습니다. 잠시 후 다시 시도해 주세요.') })
      // 마감됐거나 선택지가 바뀌었으면 최신 상태를 다시 받는다
      if (error?.code === 'POLL_409_1' || error?.code === 'POLL_404_2') {
        setDraft(null)
        onRefresh()
      }
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <div className={styles.detail}>
      <PollStatusBadges poll={{ ...poll, hasVoted: saved.length > 0 }} />
      <h3 className={styles.title}>{poll.title}</h3>
      <p className={styles.meta}>{pollMeta(poll)}</p>

      <fieldset className={styles.options} disabled={poll.isClosed || saving}>
        <legend className={styles.srOnly}>선택지</legend>
        {poll.options.map((option) => {
          const checked = selected.includes(option.id)
          const ratio = poll.voterCount > 0 ? option.voteCount / poll.voterCount : 0
          return (
            <label key={option.id} className={styles.option} data-checked={checked}>
              <input
                className={styles.input}
                type={inputType}
                name={`poll-${poll.id}`}
                checked={checked}
                onChange={() => select(toggleSelection(selected, option.id, poll.allowMultiple))}
                onClick={() => {
                  // 라디오는 다시 눌러도 change가 없어서 해제를 여기서 처리한다
                  if (inputType === 'radio' && checked) select([])
                }}
              />
              <span className={styles.indicator} data-multiple={poll.allowMultiple} aria-hidden="true">
                {checked && (poll.allowMultiple ? <CheckIcon size={14} /> : <span className={styles.dot} />)}
              </span>
              <span className={styles.optionBody}>
                <span className={styles.optionHead}>
                  <span className={styles.optionName}>{option.content}</span>
                  <span className={styles.optionCount}>{option.voteCount}표</span>
                </span>
                <span className={styles.bar} role="img" aria-label={`${poll.voterCount} 중 ${option.voteCount}`}>
                  <span style={{ width: `${ratio * 100}%` }} />
                </span>
                <span className={styles.voters}>
                  {option.voters.length > 0
                    ? option.voters.map((voter) => voter.nickname).join(', ')
                    : '아직 고른 사람이 없어요'}
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>

      {justCreated && !saveResult && <p className={styles.saved} role="status">투표를 만들었어요.</p>}
      {saveResult?.message && <p className={styles.saved} role="status">{saveResult.message}</p>}
      <ErrorMessage>{saveResult?.error}</ErrorMessage>

      {poll.isClosed ? (
        <p className={styles.hint}>마감된 투표예요. 결과만 볼 수 있어요.</p>
      ) : (
        <div className={styles.actions}>
          <Button
            fit="auto"
            onClick={() => submit(selected, saved.length > 0 ? '투표를 바꿨어요.' : '투표했어요.')}
            disabled={saving || !changed || selected.length === 0}
          >
            {saving ? '저장하는 중…' : '선택 저장'}
          </Button>
          {saved.length > 0 && (
            <Button
              variant="subtle"
              fit="auto"
              className={styles.cancel}
              onClick={() => submit([], '투표를 취소했어요.')}
              disabled={saving}
            >
              투표 취소
            </Button>
          )}
          <span className={styles.hint}>마감 전까지 바꿀 수 있어요. 고른 사람의 닉네임이 공개돼요.</span>
        </div>
      )}
    </div>
  )
}
