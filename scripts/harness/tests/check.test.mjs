// 격리된 임시 저장소에서 검사기의 관찰 가능한 동작을 확인한다. 실제 lint·build는 돌리지 않는다.
// FOOTY_BE scripts/harness/tests/test_check.py의 시나리오를 옮기고 FE 전용 경우를 더했다.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUB_SCRIPTS = { lint: 'node stub.mjs lint', build: 'node stub.mjs build' }
// npm run이 실행하는 가짜 단계. 호출을 기록하고 stub-codes.json의 종료 코드로 끝난다.
const STUB = `import fs from 'node:fs'
const name = process.argv[2]
fs.appendFileSync('build-invocation', name + '\\n')
let codes = {}
try {
  codes = JSON.parse(fs.readFileSync('stub-codes.json', 'utf8'))
} catch {
  // 파일이 없으면 모두 성공
}
process.exit(codes[name] ?? 0)
`

function isolatedEnv(tmp) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    // Windows 환경변수 이름은 대소문자를 구분하지 않으므로 대문자로 비교한다.
    const upper = key.toUpperCase()
    if (upper.startsWith('GIT_') || upper.startsWith('NPM_') || ['TMPDIR', 'TEMP', 'TMP'].includes(upper)) continue
    env[key] = value
  }
  const gitconfig = path.join(tmp, 'gitconfig')
  fs.writeFileSync(gitconfig, '')
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitconfig, TMPDIR: tmp, TEMP: tmp, TMP: tmp }
}

class Fixture {
  constructor() {
    this.tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'footy-gate-test-'))
    this.repo = path.join(this.tmp, 'repo')
    this.env = isolatedEnv(this.tmp)
    const dest = path.join(this.repo, 'scripts', 'harness')
    fs.mkdirSync(dest, { recursive: true })
    for (const name of ['check.mjs', 'check-commits.mjs']) {
      fs.copyFileSync(path.join(SOURCE, name), path.join(dest, name))
    }
    fs.writeFileSync(path.join(this.repo, 'stub.mjs'), STUB)
    this.writeScripts(STUB_SCRIPTS)
    this.git('init', '-b', 'main')
    this.git('config', 'user.name', 'Harness test')
    this.git('config', 'user.email', 'test@example.invalid')
    this.git('config', 'commit.gpgsign', 'false')
    this.git('add', '.')
    this.commit('initial baseline')
    this.base = this.git('rev-parse', 'HEAD')
    this.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    this.git('switch', '-c', 'feature/12_harness')
  }

  cleanup() {
    fs.rmSync(this.tmp, { recursive: true, force: true, maxRetries: 3 })
  }

  git(...args) {
    return execFileSync('git', args, {
      cwd: this.repo, env: this.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  }

  commit(message = '🧪 :: 검증 추가') {
    this.git('commit', '--allow-empty', '-m', message)
  }

  writeScripts(scripts) {
    const pkg = { name: 'gate-test', private: true, type: 'module', scripts }
    fs.writeFileSync(path.join(this.repo, 'package.json'), JSON.stringify(pkg, null, 2))
  }

  stubCodes(codes) {
    fs.writeFileSync(path.join(this.repo, 'stub-codes.json'), JSON.stringify(codes))
  }

  invocations() {
    const file = path.join(this.repo, 'build-invocation')
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : null
  }

  buildLogs() {
    return fs.readdirSync(this.tmp).filter((name) => name.startsWith('footy-harness-build.'))
  }

  gate(expected, ...args) {
    const result = spawnSync(process.execPath, ['scripts/harness/check.mjs', ...args], {
      cwd: this.repo, env: this.env, encoding: 'utf8',
    })
    assert.equal(result.status, expected, result.stdout + result.stderr)
    return result
  }
}

function findOnPath(command, env) {
  for (const dir of (env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(dir, command)
    if (dir && fs.existsSync(candidate)) return candidate
  }
  throw new Error(`${command}를 PATH에서 찾을 수 없음`)
}

describe('harness gate', () => {
  let fx

  beforeEach(() => {
    fx = new Fixture()
  })

  afterEach(() => {
    fx.cleanup()
  })

  test('유효한 변경은 lint·build를 실행하고 성공 로그를 지운다', () => {
    fx.commit()
    fx.gate(0)
    assert.deepEqual(fx.invocations(), ['lint', 'build'])
    assert.deepEqual(fx.buildLogs(), [])
  })

  test('test 스크립트가 있으면 lint·build 뒤에 실행한다', () => {
    fx.writeScripts({ ...STUB_SCRIPTS, test: 'node stub.mjs test' })
    fx.commit()
    fx.gate(0)
    assert.deepEqual(fx.invocations(), ['lint', 'build', 'test'])
  })

  test('기준 ref가 없으면 잘못된 커밋을 통과시키지 않는다', () => {
    fx.commit('bad commit')
    fx.git('update-ref', '-d', 'refs/remotes/origin/main')
    fx.gate(1)
  })

  test('커밋이 아닌 기준은 실패', () => {
    fx.commit()
    const blob = fx.git('rev-parse', 'HEAD:scripts/harness/check.mjs')
    fx.gate(1, '--base', blob)
  })

  test('main 직접 커밋은 실패', () => {
    fx.git('switch', 'main')
    fx.commit()
    fx.gate(1)
  })

  test('develop 직접 커밋은 실패', () => {
    fx.git('switch', '-c', 'develop')
    fx.commit()
    fx.gate(1)
  })

  test('이슈 번호 없는 브랜치는 실패', () => {
    fx.git('branch', '-m', 'feature/no-issue')
    fx.commit()
    fx.gate(1)
  })

  test('이슈 번호 뒤 하이픈을 쓰는 브랜치는 통과', () => {
    fx.git('branch', '-m', 'feature/13-feature-재경기-생성-화면-구현')
    fx.commit()
    fx.gate(0)
  })

  test('형식이 틀린 커밋은 실패', () => {
    fx.commit('feat :: 검증 추가')
    fx.gate(1)
  })

  test('제목 50자 초과는 실패', () => {
    fx.commit('🧪 :: ' + '가'.repeat(51))
    fx.gate(1)
  })

  test('분해된 한글 50자 제목은 통과', () => {
    fx.commit('🧪 :: ' + '가'.repeat(50).normalize('NFD'))
    fx.gate(0)
  })

  test('영어만 있는 제목은 실패', () => {
    fx.commit('🧪 :: Add tests')
    fx.gate(1)
  })

  test('🔀 타입은 이슈 번호가 필요', () => {
    fx.commit('🔀 :: 병합 추가')
    fx.gate(1)
  })

  test('일반 커밋의 이슈 번호·범위 표기는 둘 다 허용', () => {
    for (const message of ['🐛 :: 버그 수정', '🐛 :: (#12)[서비스] 버그 수정',
      '📝 :: [문서] 설명 추가', '🔀 :: (#12) 변경 병합', '⚙️ :: 프로젝트 세팅']) {
      fx.commit(message)
    }
    fx.gate(0)
  })

  test('기본 형식의 merge commit은 기능 커밋 검사에서 제외', () => {
    fx.commit()
    fx.git('switch', '-c', 'feature/13_merge-source')
    fx.commit()
    fx.git('switch', 'feature/12_harness')
    fx.git('merge', '--no-ff', 'feature/13_merge-source', '-m', "Merge branch 'feature/13_merge-source' into feature/12_harness")
    fx.gate(0)
  })

  test('새 커밋이 없으면 일부 검사', () => {
    fx.gate(2)
  })

  test('--skip-build는 일부 검사이며 빌드하지 않음', () => {
    fx.commit()
    fx.gate(2, '--skip-build')
    assert.equal(fx.invocations(), null)
  })

  test('--skip-build가 실패를 가리지 않음', () => {
    fx.commit('bad')
    fx.gate(1, '--skip-build')
  })

  test('빌드 실패는 로그를 남긴다', () => {
    fx.commit()
    fx.stubCodes({ build: 1 })
    fx.gate(1)
    assert.equal(fx.buildLogs().length, 1)
  })

  test('lint가 실패해도 build까지 실행하고 실패로 끝난다', () => {
    fx.commit()
    fx.stubCodes({ lint: 1 })
    fx.gate(1)
    assert.deepEqual(fx.invocations(), ['lint', 'build'])
  })

  test('lint 스크립트가 없으면 실패', () => {
    fx.writeScripts({ build: STUB_SCRIPTS.build })
    fx.commit()
    fx.gate(1)
  })

  test('detached HEAD는 --branch가 필요', () => {
    fx.commit()
    fx.git('checkout', '--detach')
    fx.gate(1)
    fx.gate(0, '--branch', 'feature/12_harness', '--head', 'HEAD', '--base', fx.base)
  })

  test('연결된 브랜치는 --branch로 바꿔 보일 수 없음', () => {
    fx.git('switch', 'main')
    fx.commit()
    fx.gate(1, '--branch', 'feature/12_harness')
  })

  test('--head는 checkout과 같은 커밋이어야 함', () => {
    fx.commit()
    fx.gate(1, '--head', fx.base)
  })

  test('baseline은 main에서도 커밋 규칙 없이 빌드한다', () => {
    fx.git('switch', 'main')
    fx.gate(0, '--mode', 'baseline')
    assert.notEqual(fx.invocations(), null)
    fx.gate(2, '--mode', 'baseline', '--skip-build')
  })

  test('잘못된 인자는 빌드 전에 실패', () => {
    for (const args of [['--unknown'], ['--base'], ['--base', 'HEAD', 'HEAD'],
      ['--mode', 'baseline', '--base', 'HEAD'], ['--mode', 'bogus'], ['--head', '--all'],
      ['--help', '--skip-build']]) {
      fx.gate(1, ...args)
    }
    assert.equal(fx.invocations(), null)
  })

  test('npm이 -- 없이 받은 옵션을 가져가면 실패', () => {
    fx.commit()
    fx.env.npm_lifecycle_event = 'harness'
    fx.env.npm_config_mode = 'baseline'
    fx.gate(1)
    assert.equal(fx.invocations(), null)
  })

  test('얕은 이력은 실패', () => {
    fx.commit()
    const clone = path.join(fx.tmp, 'shallow')
    execFileSync('git', ['clone', '--depth=1', pathToFileURL(fx.repo).href, clone],
      { env: fx.env, stdio: 'ignore' })
    fx.repo = clone
    fx.gate(1, '--base', 'HEAD')
  })

  test('기준이 앞서 나가도 공통 조상 이후만 검사', () => {
    fx.commit()
    fx.git('switch', 'main')
    fx.commit('legacy base commit outside feature scope')
    fx.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    fx.git('switch', 'feature/12_harness')
    fx.gate(0)
  })

  test('관련 없는 이력은 실패', () => {
    fx.commit()
    fx.git('switch', '--orphan', 'unrelated')
    fx.commit('other root')
    fx.git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    fx.git('switch', 'feature/12_harness')
    fx.gate(1)
  })

  test('git log 실패는 통과할 수 없음', {
    skip: process.platform === 'win32' && 'Windows에서는 PATH로 가로챌 git 실행 파일(.exe)을 만들 수 없음',
  }, () => {
    fx.commit()
    const real = findOnPath('git', fx.env)
    const bindir = path.join(fx.tmp, 'bin')
    fs.mkdirSync(bindir)
    const shim = path.join(bindir, 'git')
    fs.writeFileSync(shim, `#!/bin/sh\nif [ "$1" = log ]; then exit 42; fi\nexec "${real}" "$@"\n`)
    fs.chmodSync(shim, 0o755)
    fx.env.PATH = bindir + path.delimiter + fx.env.PATH
    fx.gate(1)
  })
})
