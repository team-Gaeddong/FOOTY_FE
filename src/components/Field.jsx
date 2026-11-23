import { useId } from 'react'
import styles from './Field.module.css'

// 라벨 + 입력 + 안내/에러. as로 'input'(기본)·'textarea'·'select'를 고른다.
// children을 주면 입력 대신 그 요소를 그린다. 이때는 id를 직접 맞춰 준다.
// 에러가 있으면 안내 대신 에러를 보여 주고 aria-invalid를 켠다.
// aside: 라벨 옆에 붙는 보조 정보(예: 글자 수 "4 / 10")
export function Field({
  label,
  aside,
  hint,
  error,
  as: Control = 'input',
  id,
  className = '',
  children,
  ...controlProps
}) {
  const autoId = useId()
  const controlId = id ?? autoId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={controlId}>
            {label}
          </label>
          {aside && <span className={styles.aside}>{aside}</span>}
        </div>
      )}
      {children ?? (
        <Control
          id={controlId}
          className={styles.control}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...controlProps}
        />
      )}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
