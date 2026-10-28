// FOOTY_FE 하네스 검사기. FOOTY_BE scripts/harness/check.sh와 같은 규칙을 Node로 옮겼다.
// 종료 코드: 0=명시한 모드 통과, 1=실패, 2=일부 검사만 완료.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCommits } from './check-commits.mjs'

const USAGE = `사용법: npm run harness -- [--mode change|baseline] [--skip-build]
                            [--base REF] [--head REF] [--branch NAME]
       npm run harness -- [--skip-build] [기준_ref]
       (npm 없이: node scripts/harness/check.mjs [옵션])

change (기본): 브랜치 + 기준과 HEAD의 공통 조상 이후 커밋 + lint·build·test.
  --base REF     기본 origin/main. 기존 위치 인자와 동시에 지정할 수 없음.
  --head REF     기본 HEAD. 현재 checkout의 HEAD와 같은 커밋이어야 함.
  --branch NAME  detached HEAD CI에서 실제 PR 브랜치 이름을 전달.
                 일반 checkout에서는 현재 브랜치 이름과 같아야 함.
baseline: 현재 checkout의 lint·build·test만 검사. 변경 완료 증거로 사용할 수 없음.
          --base, --head, --branch는 지정할 수 없음.
--skip-build: lint·build·test 생략. 다른 오류가 없어도 일부 검사 결과(종료 코드 2).
test는 package.json에 test 스크립트가 있을 때만 실행한다.

종료 코드: 0=모드별 통과, 1=실패, 2=일부 검사(빌드 생략/변경 커밋 없음).`

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BRANCH_PATTERN = /^(feature|hotfix)\/[0-9]+[-_]\S+$/u
const BUILD_STEPS = ['lint', 'build', 'test']
// npm은 `--` 앞의 옵션을 자기 설정으로 가져가 스크립트에 넘기지 않는다.
const NPM_SWALLOWED = ['mode', 'base', 'head', 'branch', 'skip_build', 'skip-build']

class ArgumentError extends Error {}

const report = {
  failed: false,
  partial: false,
  pass(message) {
    console.log(`  [통과] ${message}`)
  },
  fail(message) {
    console.log(`  [실패] ${message}`)
    this.failed = true
  },
  warn(message) {
    console.log(`  [일부 검사] ${message}`)
    this.partial = true
  },
}

function parseArgs(argv) {
  if (process.env.npm_lifecycle_event === 'harness'
    && NPM_SWALLOWED.some((key) => process.env[`npm_config_${key}`] !== undefined)) {
    throw new ArgumentError('npm이 옵션을 가져감. -- 뒤에 적을 것 (예: npm run harness -- --mode baseline)')
  }
  const options = { mode: 'change', base: 'origin/main', head: 'HEAD', branch: '', skipBuild: false }
  const given = { mode: false, base: false, head: false, branch: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      if (argv.length !== 1) throw new ArgumentError('--help는 단독으로 사용')
      return null
    } else if (arg === '--skip-build') {
      if (options.skipBuild) throw new ArgumentError('--skip-build 중복')
      options.skipBuild = true
    } else if (arg === '--mode' || arg === '--base' || arg === '--head' || arg === '--branch') {
      const value = argv[i + 1]
      if (value === undefined || value === '' || value.startsWith('-')) {
        throw new ArgumentError(`${arg} 값 누락 또는 잘못된 값`)
      }
      const key = arg.slice(2)
      if (given[key]) throw new ArgumentError(key === 'base' ? '기준 ref 중복' : `${arg} 중복`)
      options[key] = value
      given[key] = true
      i++
    } else if (arg.startsWith('-')) {
      throw new ArgumentError(`알 수 없는 옵션: ${arg}`)
    } else {
      if (given.base) throw new ArgumentError('기준 ref 중복')
      if (arg === '') throw new ArgumentError('빈 기준 ref')
      options.base = arg
      given.base = true
    }
  }
  if (options.mode !== 'change' && options.mode !== 'baseline') {
    throw new ArgumentError(`지원하지 않는 모드: ${options.mode}`)
  }
  if (options.mode === 'baseline' && (given.base || given.head || given.branch)) {
    throw new ArgumentError('baseline에는 --base/--head/--branch/위치 기준 ref를 사용할 수 없음')
  }
  options.branchGiven = given.branch
  return options
}

function git(args, { quiet = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'inherit'],
  })
  // 셸의 $(...)처럼 끝 줄바꿈만 지운다.
  return { ok: result.status === 0, status: result.status, out: (result.stdout ?? '').replace(/[\r\n]+$/, '') }
}

function checkChange(options) {
  console.log('1. Git 기준 및 브랜치')
  let historyReady = true
  const shallow = git(['rev-parse', '--is-shallow-repository'])
  if (!shallow.ok) {
    report.fail('Git 저장소 정보를 읽을 수 없음')
    historyReady = false
  } else if (shallow.out !== 'false') {
    report.fail('얕은 이력으로는 커밋 범위를 검증할 수 없음. 전체 이력을 가져온 뒤 재실행')
    historyReady = false
  }
  const base = git(['rev-parse', '--verify', '--end-of-options', `${options.base}^{commit}`])
  if (!base.ok) {
    report.fail(`기준 ref '${options.base}'가 없거나 커밋이 아님`)
    historyReady = false
  }
  const head = git(['rev-parse', '--verify', '--end-of-options', `${options.head}^{commit}`])
  if (!head.ok) {
    report.fail(`대상 ref '${options.head}'가 없거나 커밋이 아님`)
    historyReady = false
  }
  const checkout = git(['rev-parse', '--verify', '--end-of-options', 'HEAD^{commit}'])
  if (!checkout.ok) {
    report.fail('현재 HEAD 커밋을 읽을 수 없음')
    historyReady = false
  } else if (head.ok && head.out !== checkout.out) {
    report.fail('--head는 현재 checkout의 HEAD와 같은 커밋이어야 함')
    historyReady = false
  }

  let branch = ''
  const symbolic = git(['symbolic-ref', '--quiet', '--short', 'HEAD'])
  if (symbolic.ok) {
    branch = symbolic.out
    if (options.branchGiven && options.branch !== branch) {
      report.fail('--branch가 현재 checkout 브랜치와 다름')
    }
  } else if (symbolic.status !== 1) {
    report.fail('현재 브랜치를 읽을 수 없음')
  } else if (!options.branchGiven) {
    report.fail('detached HEAD에서는 --branch로 실제 PR 브랜치 이름을 지정해야 함')
  } else {
    branch = options.branch
  }
  if (branch) {
    if (BRANCH_PATTERN.test(branch) && git(['check-ref-format', '--branch', branch], { quiet: true }).ok) {
      report.pass(branch)
    } else {
      report.fail(`'${branch}'는 feature|hotfix/{이슈번호}_{할일} 또는 feature|hotfix/{이슈번호}-{할일} 형식이 아님 (main/develop 변경 검사 금지)`)
    }
  }

  console.log('2. 변경 커밋')
  if (!historyReady) {
    report.fail('유효한 전체 이력이 없어 커밋 검사를 수행할 수 없음')
    return
  }
  const mergeBase = git(['merge-base', base.out, head.out])
  if (!mergeBase.ok || mergeBase.out === '') {
    report.fail('기준과 대상의 공통 조상을 찾을 수 없음')
    return
  }
  const range = `${mergeBase.out}..${head.out}`
  const count = git(['rev-list', '--count', range])
  if (!count.ok) {
    report.fail('커밋 범위를 읽을 수 없음')
  } else if (!/^[0-9]+$/.test(count.out)) {
    report.fail('커밋 개수 결과가 잘못됨')
  } else if (count.out === '0') {
    report.warn('검사할 새 커밋이 없음. 변경 완료 검증으로 사용할 수 없음')
  } else {
    console.log(`  범위: ${range} (${count.out}개)`)
    const log = git(['log', '--format=%h%x09%s', range])
    // 조회가 실패해도 받은 출력은 검사한다(BE의 파이프라인과 같은 결과).
    if (checkCommits(log.out) || !log.ok) report.fail('커밋 조회 또는 메시지 검증 실패')
  }
}

function runBuild() {
  let scripts
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts ?? {}
  } catch {
    report.fail('package.json의 scripts를 읽을 수 없음')
    return
  }
  let logDir
  try {
    // 빌드가 비우는 dist/ 밖에 기록한다. 실패한 단계의 전체 로그는 남긴다.
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'footy-harness-build.'))
  } catch {
    report.fail('빌드 로그 임시 디렉터리를 만들 수 없음')
    return
  }
  let allPassed = true
  for (const name of BUILD_STEPS) {
    if (!scripts[name]) {
      if (name === 'test') {
        console.log('  [참고] test 스크립트 없음: 실행할 테스트가 없음 (FD-11)')
      } else {
        report.fail(`package.json에 ${name} 스크립트가 없음`)
        allPassed = false
      }
      continue
    }
    const logPath = path.join(logDir, `${name}.log`)
    const fd = fs.openSync(logPath, 'w')
    // Windows의 npm은 npm.cmd라 셸로 실행한다. 명령이 고정 문자열이라 셸 해석 위험은 없다.
    const result = spawnSync(`npm run ${name}`, { cwd: ROOT, shell: true, stdio: ['ignore', fd, fd] })
    fs.closeSync(fd)
    if (result.status === 0) {
      report.pass(`npm run ${name}`)
    } else {
      allPassed = false
      report.fail(`npm run ${name} (전체 로그: ${logPath}, 마지막 30줄)`)
      const lines = fs.readFileSync(logPath, 'utf8').replace(/\s+$/, '').split(/\r?\n/)
      for (const line of lines.slice(-30)) console.log(`      ${line}`)
    }
  }
  if (allPassed) {
    try {
      fs.rmSync(logDir, { recursive: true, force: true })
    } catch {
      report.fail(`성공한 빌드 로그를 정리할 수 없음: ${logDir}`)
    }
  }
}

function main(argv) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    if (!(error instanceof ArgumentError)) throw error
    console.error(`[실패] 인자 오류: ${error.message}`)
    console.error(USAGE)
    return 1
  }
  if (options === null) {
    console.log(USAGE)
    return 0
  }

  if (options.mode === 'change') {
    checkChange(options)
  } else {
    console.log('baseline: 현재 checkout의 lint·build·test만 검사 (변경 완료 검증 아님)')
  }

  console.log('3. lint·build·test')
  if (options.skipBuild) {
    report.warn('--skip-build 지정: lint·build·test를 검증하지 않음')
  } else {
    runBuild()
  }

  console.log()
  if (report.failed) {
    console.log(`결과: 실패 (${options.mode} 모드)`)
    return 1
  }
  if (report.partial) {
    console.log(`결과: 일부 검사 (${options.mode} 모드, 변경 완료 증거로 사용할 수 없음)`)
    return 2
  }
  if (options.mode === 'baseline') {
    console.log('결과: 기준 검사 통과 (baseline 모드, 변경 완료 증거로 사용할 수 없음)')
  } else {
    console.log('결과: 변경 검사 통과 (change 모드: 브랜치·커밋·lint·build)')
  }
  return 0
}

process.exitCode = main(process.argv.slice(2))
