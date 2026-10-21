# FOOTY_FE

축구 경기를 만들고, 참가 선수의 포지션·실력으로 팀을 나누고, 경기 후 밸런스·MVP를 평가하는 서비스 FOOTY의 웹 프론트엔드. 현재 화면은 Vite + React 템플릿 그대로이며 화면·API 연동은 아직 없다. 백엔드는 [FOOTY_BE](https://github.com/team-Gaeddong/FOOTY_BE)다.

## 시작하기

Node.js 24(또는 22.13 이상), npm, Git이 필요하다. 버전 고정 방식은 아직 정하지 않았다([decisions.md](docs/harness/decisions.md) FD-15).

```bash
npm ci
npm run dev        # http://localhost:5173
```

## 로컬 검증

```bash
npm run harness -- --mode baseline
npm run harness:test
```

baseline은 현재 소스의 lint·build(`test` 스크립트가 생기면 test까지)만 확인한다. main이나 커밋 전 수정의 점검에 사용할 수 있지만 변경 제출 완료 증거는 아니다. `harness:test`는 검사기 자체의 회귀 테스트다.

이슈가 연결된 기능 브랜치에서 커밋한 뒤, 실제 PR base를 기준으로 다음을 실행한다. `origin/main`은 예시이며 PR base 정책(FC-01)을 대신하지 않는다.

```bash
git fetch origin
npm run harness -- --base origin/main
```

검사기는 BE `scripts/harness/check.sh`와 같은 규칙을 Node로 구현했다(Bash·Python 불필요). main/develop의 변경, 기준 ref 누락, 얕은 이력, 잘못된 브랜치 이름·커밋 메시지, lint·build 실패를 차단한다. 종료 코드 0은 명시한 모드의 통과, 1은 실패, 2는 일부 검사다. `--skip-build`와 새 커밋 0개는 일부 검사이며 전체 완료로 처리하지 않는다. 실패한 단계의 전체 로그 경로는 출력에 표시된다. npm으로 옵션을 넘길 때는 `--` 뒤에 적는다(빠뜨리면 검사기가 인자 오류로 멈춘다). 명령형 문장·기능 범위·권한·테스트 충분성은 사람/에이전트 리뷰로 확인한다.

## 에이전트 지침

- 공통 규칙: [AGENTS.md](AGENTS.md). Claude는 `CLAUDE.md`에서 이를 import한다.
- 스킬 원본: `.claude/skills`(화면 구현 `footy-ui-implement`, 코드 리뷰 `footy-code-review`, Git 규칙 `footy-git-workflow`). Codex는 `.agents/skills`의 상대 심볼릭 링크로 같은 파일을 읽는다. Windows Git 기본값(`core.symlinks=false`)에서는 링크가 경로 문자열만 든 파일로 체크아웃되므로, 링크 지원을 켜거나 AGENTS.md의 원본 경로를 직접 읽는다. 이 상태에서 `git add`해도 링크 형식(mode 120000)은 유지된다.
- 팀 결정: [decisions.md](docs/harness/decisions.md). FC는 문서 충돌, FD는 미결정 사항이며 적힌 선택지는 채택된 정책이 아니다.
- 원본 문서: [sources.md](docs/harness/sources.md). Notion URL은 확인 전까지 미확인으로 남긴다.
- BE API 스냅샷: [backend-api.md](docs/api/backend-api.md). 기준은 BE `develop` 코드다.
- 개발 서버 미리보기: `.claude/launch.json`(`footy-fe-dev`). Claude 데스크톱 앱이 이 설정으로 브라우저 미리보기를 연다.

## CI와 병합 보호

`.github/workflows/harness.yml`은 Ubuntu·Windows에서 하네스 회귀 테스트와 lint·build를 실행한다. PR은 실제 head 커밋을 검사하고, main/develop push 및 수동 실행은 baseline 검사를 수행한다. 두 플랫폼의 성공을 집계하는 검사 이름은 `harness`다. 원격에 반영된 뒤에만 실행된다.

이 저장소는 2026-10-21 기준 private이고 조직 플랜이 free라 브랜치 보호를 적용할 수 없다(GitHub API 403, FC-02). 그래서 "사람 승인 1명 + CI 통과" 병합 조건은 지금은 사람이 지켜야 하고, private 저장소의 Actions 실행 시간은 조직의 무료 사용량에서 차감된다. 저장소를 public으로 바꾸거나 플랜을 올린 뒤에는 BE와 같은 절차로 보호를 적용한다.

1. PR을 통한 병합과 사람 승인 최소 1명을 요구한다.
2. 필수 상태 검사로 `harness`를 등록하고 병합 전 최신 base 반영을 요구한다.
3. 관리자도 보호 규칙을 따르게 하고, 강제 push 및 브랜치 삭제를 허용하지 않는다.
4. 실제 테스트 PR에서 실패한 검사와 승인 없는 병합이 차단되는지 확인한다.
