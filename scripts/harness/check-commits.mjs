// check.mjs가 넘긴 커밋 제목을 검사한다. 명령형 여부 같은 의미 검토는 리뷰에서 한다.
// 규칙은 FOOTY_BE scripts/harness/check_commits.py와 같다.

const TYPES = ['📄', '⚡', '⚰', '🐛', '♻', '📝', '⚙', '🧪', '🚀', '🔀']
const PATTERN = new RegExp(
  `^(?<type>${TYPES.join('|')})\\u{FE0F}? :: (?<issue>\\(#\\d+\\) ?)?(?:\\[[^\\]]+\\] ?)?(?<subject>\\S.*)$`,
  'u',
)
// 가-힣, ㄱ-ㅎ·ㅏ-ㅣ, 첫가끝(ᄀ-ᇿ), 확장 A·B 자모
const KOREAN = /[\u{AC00}-\u{D7A3}\u{3131}-\u{3163}\u{1100}-\u{11FF}\u{A960}-\u{A97F}\u{D7B0}-\u{D7FF}]/u

// 한 줄에 "{짧은 해시}\t{제목}" 하나. 줄마다 결과를 출력하고, 실패가 있으면 true를 돌려준다.
export function checkCommits(log) {
  const records = log === '' ? [] : log.replace(/\n$/, '').split('\n')
  let failed = false
  for (const record of records) {
    const line = record.replace(/\r$/, '')
    const tab = line.indexOf('\t')
    const sha = tab === -1 ? line : line.slice(0, tab)
    const message = tab === -1 ? '' : line.slice(tab + 1)
    const match = tab === -1 ? null : PATTERN.exec(message)
    let reason = null
    if (match === null) {
      reason = '형식 위반'
    } else if (match.groups.type === '🔀' && match.groups.issue === undefined) {
      reason = 'PR·merge 타입(🔀)에는 (#이슈번호)가 필요'
    } else {
      // NFC로 맞춰야 분해된 한글 음절을 여러 글자로 세지 않는다.
      const subject = match.groups.subject.normalize('NFC')
      if ([...subject].length > 50) {
        reason = '제목 50자 초과'
      } else if (!KOREAN.test(subject)) {
        reason = '제목에 한국어가 없음'
      }
    }
    if (reason) {
      console.log(`  [실패] ${sha} ${reason}: ${message}`)
      failed = true
    } else {
      console.log(`  [통과] ${sha} ${message}`)
    }
  }
  if (records.length === 0) {
    console.log('  [실패] 커밋 조회 결과가 비어 있음')
    failed = true
  }
  return failed
}
