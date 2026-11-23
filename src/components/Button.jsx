import styles from './Button.module.css'

// variant: 'primary'(brand-green) | 'secondary'(테두리) | 'subtle'(회색 면) | 'light'(밝은 면, 구글 로그인) | 'danger'
// size: 'md'(44px) | 'lg'(52px)
// fit: 'full'(폭 전체, 기본) | 'auto'(내용 폭) | 'responsive'(모바일은 폭 전체, PC는 내용 폭)
// as: 기본은 <button>이고, 이동하는 버튼은 as={Link} to="…"처럼 링크로 그린다.
export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  fit = 'full',
  className = '',
  ...props
}) {
  const classes = [styles.button, styles[variant], styles[size], styles[fit], className]
  const typeProps = Tag === 'button' ? { type: 'button' } : {}
  return <Tag {...typeProps} className={classes.filter(Boolean).join(' ')} {...props} />
}
