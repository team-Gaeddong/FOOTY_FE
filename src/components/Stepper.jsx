import { useId } from 'react'
import { MinusIcon, PlusIcon } from './Icons.jsx'
import styles from './Stepper.module.css'

// 숫자를 −/+ 버튼으로 바꾸는 입력(최대 인원·팀 수). 값은 min~max 안에서만 움직이고 끝에서는 버튼이 잠긴다.
// label: 제목, unit: 값 뒤의 단위("명"), hint: 아래 안내
export function Stepper({
  label,
  value,
  unit = '',
  min,
  max,
  onChange,
  hint,
  decreaseLabel,
  increaseLabel,
  disabled = false,
}) {
  const labelId = useId()
  const hintId = useId()

  return (
    <div className={styles.stepper} role="group" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          aria-label={decreaseLabel}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
        >
          <MinusIcon size={20} />
        </button>
        <span className={styles.value} aria-live="polite">
          {value}
          {unit}
        </span>
        <button
          type="button"
          className={styles.button}
          aria-label={increaseLabel}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
        >
          <PlusIcon size={20} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  )
}
