# FOOTY_FE — AI 코딩 에이전트 지침

FOOTY는 축구 경기를 만들고, 참가 선수의 포지션·실력을 바탕으로 팀을 나누고, 경기 후 밸런스·MVP를 평가하는 서비스다. 이 저장소는 그 웹 프론트엔드다. 백엔드는 `team-Gaeddong/FOOTY_BE`다.

이 문서는 모든 작업에 항상 적용되는 규칙만 담는다. 작업별 절차는 아래 Skills를 읽고 따른다. Claude는 `.claude/skills`의 원본을, Codex는 같은 원본을 가리키는 `.agents/skills` 링크를 사용한다.

| 작업 | 먼저 읽을 파일 |
|---|---|
| 화면·기능 구현, API 연동 | `.claude/skills/footy-ui-implement/SKILL.md` |
| 코드 리뷰 | `.claude/skills/footy-code-review/SKILL.md` |
| 이슈·브랜치·커밋·PR | `.claude/skills/footy-git-workflow/SKILL.md` |

## 1. 기준 문서와 우선순위

| 영역 | 기준(Source of truth) | 저장소 안 사본 |
|---|---|---|
| 기능 목록·담당자·스프린트 | Notion `FOOTY > 기능`, `FOOTY > 스프린트 일정` | `.claude/skills/footy-ui-implement/references/feature-map.md` |
| API 계약(경로·요청·응답·에러 코드) | `FOOTY_BE` `develop` 브랜치 코드 | `docs/api/backend-api.md` |
| 인증·응답·에러 형식 결정 | `FOOTY_BE` `docs/harness/decisions.md` | 이 문서 3장 요약 |
| DB 스키마 | ERD Cloud `footy` 다이어그램 | `FOOTY_BE`의 `docs/erd/` (FE에는 사본 없음) |
| 이슈·브랜치·커밋·PR·버전 | Notion `FOOTY > Github Commit 명세` | `.claude/skills/footy-git-workflow/SKILL.md` |
| 화면 디자인 | Figma 디자인시스템 https://www.figma.com/design/lsFTFCIDZ41v462bQ5HOkA/FOOTY (FD-09) | `src/index.css`의 `--ds-*` 토큰 |
| 빌드·런타임 | 이 저장소의 `package.json`, `vite.config.js`, `eslint.config.js`, `src/` | — |
| 미결정 사항·문서 충돌 | 팀 결정 대기 | `docs/harness/decisions.md` |

- 저장소 안 사본은 작성 시점의 스냅샷이다. 사본과 원본(Notion, ERD Cloud, BE 코드)이 다르면 원본이 우선이고, 차이를 사람에게 보고한다.
- **문서끼리, 또는 문서와 코드가 충돌하면 에이전트가 임의로 하나를 고르지 않는다.** `docs/harness/decisions.md`의 형식으로 차이점을 보고하고, 그 결정에 의존하는 부분만 보류한다. 독립적인 검증·유지보수와 사용자가 이미 승인한 작업은 계속한다.
- `docs/harness/decisions.md`에서 상태가 `미결정`인 항목이 작업에 필요하면, 그 부분은 구현하지 않고 질문한다. 문서에 적힌 "현황·선택지"는 채택된 규칙이 아니다.
- 이 저장소의 결정 번호는 `FC-xx`(충돌)·`FD-xx`(미결정)다. 백엔드 저장소의 항목은 `BE D-05d`처럼 앞에 `BE`를 붙여 구분한다.

원본 URL·확인 범위·접근 불가 시 절차는 `docs/harness/sources.md`를 따른다. 사본의 작성 날짜를 원본 재검증 날짜로 해석하지 않는다.

## 2. 현재 확정된 기술 사실 (코드 기준)

- React(`^19.2.8`) + Vite(`^8.3.0`, Rolldown 기반). `@vitejs/plugin-react` 6과 React Compiler(`babel-plugin-react-compiler`를 `@rolldown/plugin-babel`의 `reactCompilerPreset()`으로 적용)
- JavaScript(JSX). TypeScript는 없다(FD-01)
- ESLint 10 flat config(`eslint.config.js`): `@eslint/js` recommended, `eslint-plugin-react-hooks` recommended(React Compiler 진단 포함), `eslint-plugin-react-refresh` vite. `scripts/**/*.mjs`는 Node 전역으로 검사한다
- 진입점: `index.html` → `src/main.jsx` → `src/App.jsx`(라우트). 폴더는 역할별 `src/{api,auth,components,pages}`(FD-02), 스타일은 CSS Modules(FD-08)
- 선언된 런타임 의존성은 `react`, `react-dom`, `react-router`(FD-03)다. 서버 통신은 fetch 래퍼(FD-04), 전역 상태는 Context(FD-07)이고 상태 관리·HTTP 클라이언트·스타일 라이브러리·테스트 도구·포매터는 없다
- 스크립트: `dev`, `build`, `lint`, `preview`, `harness`, `harness:test`. `test` 스크립트는 없다(FD-11)
- Node: `engines`·`.nvmrc`가 없다(FD-15). 의존성 요구 범위는 Node 22.13 이상 또는 24 이상이고, 작성 환경은 v24.14.1, CI는 Node 24다
- 원격 저장소: `team-Gaeddong/FOOTY_FE` (2026-10-21 조회: private, 기본 브랜치 `main`, 브랜치 보호 적용 불가 — FC-02)

의존성 추가, 언어 전환, 폴더 구조, 라우팅·상태 관리·서버 통신·스타일링 방식은 팀 결정 사항이다(`decisions.md` FD-01~FD-10). 확정된 항목(FD-02~FD-08)은 그 결정을 따르고, 그 밖의 결정 전에는 추가하지 않는다.

## 3. 도메인과 백엔드 연동 규칙

- 도메인(BE `AGENTS.md` 3장 기준): 로그인은 Google OAuth만 쓰고, 첫 로그인 뒤 온보딩(닉네임 입력)을 마쳐야 가입이 끝난다. 경기 생성자가 파티장이다. 비회원 선수를 허용한다. 포지션은 `GK`·`DF`·`MF`·`FW`이며 복수 선택과 우선순위를 가진다. 다시 짜기는 라인업 버전 증가, 팀 확정은 확정 플래그다. 회원 탈퇴·경기 삭제는 소프트 삭제다. 한 경기에서 회원당 밸런스 평가 1건, MVP 투표 1건이다.
- API 계약의 기준은 BE 코드다. 엔드포인트·필드·에러 코드를 지어내지 않는다. 필요한 API가 BE에 없거나 `docs/api/backend-api.md`와 BE 코드가 다르면 그 연동은 멈추고 보고한다. BE보다 먼저 화면을 만들 때의 목(mock) 데이터는 FD-14 결정 전에는 쓰지 않는다.
- BE에서 확정된 공통 계약(세부는 `docs/api/backend-api.md`):
  - 경로에 버전·`/api` 접두사가 없다(BE D-07). 예: `POST /auth/token`
  - 성공 응답은 래퍼 없이 리소스를 그대로 주고, 성공 여부는 HTTP 상태 코드로 표현한다(BE D-03)
  - 에러 응답은 `{"code": "AUTH_401_1", "message": "..."}`이고 HTTP 상태와 함께 온다(BE D-04). 분기는 상태 코드와 `code`로 하고 `message` 문구에 의존하지 않는다
  - 인증 헤더는 `Authorization: Bearer {accessToken}`다. access 30분, refresh 14일이며 refresh는 재발급할 때마다 회전한다(BE D-05a·D-05d)
  - 로그인: 브라우저를 BE의 `/oauth2/authorization/google`로 이동 → BE가 `OAUTH_REDIRECT_URI`로 `?code={1회용 코드}`(1분) 또는 `?error=login_failed`를 붙여 돌려보냄 → `POST /auth/token`으로 토큰 교환 → 응답의 `onboarded`가 `false`면 온보딩 화면(BE D-05d·D-05e)
  - 온보딩을 마치지 않은 회원은 온보딩·로그아웃·탈퇴·토큰 재발급 외의 API에서 `403 MEMBER_403_1`을 받는다. 닉네임은 앞뒤 공백을 제거한 뒤 2~10자이고 중복을 허용한다(BE D-05e)
- 토큰 저장(FD-05: access 메모리·refresh localStorage)과 개발 중 API 주소(FD-06: Vite proxy `/api`)는 확정이다. 날짜·시간대(FD-12)와 배포 주소(FD-16)는 미결정이므로 이 결정에 의존하는 코드는 쓰지 않는다.
- 파티장 전용 동작(공지 작성, 팀 확정, 경기 삭제 등)은 FE에서 버튼 노출만 조절하고, 권한 판단은 BE 응답(403 등)을 따른다. 노출 조건이 기능 문서에 없으면 질문한다.

## 4. 항상 지킬 규칙

- 작업은 Notion 기능 1개 = 이 저장소의 GitHub 이슈 1개 단위로 한다. 이슈 번호 없이 기능 브랜치를 만들지 않는다.
- 브랜치: `feature/{이슈번호}_{할일}`, 긴급 수정은 `hotfix/{이슈번호}_{할일}`
- 커밋 메시지: `{CommitType} :: {Subject}` (형식 세부와 미결정 부분은 git-workflow 스킬 참고)
- Subject는 한국어, 명령형, 50자 이내, "어떻게"보다 "무엇을/왜"
- `main`에 직접 커밋·푸시하지 않는다. 병합은 PR로만 하고, 사람 리뷰어 최소 1명의 승인이 필요하다. 에이전트 리뷰는 승인으로 치지 않는다. 이 저장소는 GitHub에서 이 규칙을 강제할 수 없으므로(FC-02) 에이전트가 스스로 지킨다.
- 비밀 값(토큰, OAuth 클라이언트 시크릿, 서버 접속 정보)을 코드나 커밋에 넣지 않는다. `VITE_`로 시작하는 환경변수는 빌드 결과에 그대로 들어가 누구나 볼 수 있으므로 비밀 값을 넣지 않는다. 개인 로컬 값은 git에서 제외되는 `.env.local`에 둔다.
- 토큰과 1회용 로그인 코드를 콘솔·로그·에러 메시지에 남기지 않는다.
- 사용자 입력(닉네임, 공지, 투표 문항 등)을 `dangerouslySetInnerHTML`로 렌더링하지 않는다.
- 린트 규칙을 `eslint-disable`로 끄지 않는다. 꼭 필요하면 이유를 PR에 적고 사람의 확인을 받는다.
- 요구사항을 정리할 때는 입력, 출력, 예외 상황, 레퍼런스를 함께 적는다(1차 스크럼 회고록의 프롬프트 설계 규칙). 화면이면 로딩·빈 목록·에러·권한 없음 상태도 적는다.

## 5. 검증 명령

```bash
npm run harness                        # 변경 검사: 브랜치 + 커밋 + lint·build(·test)
npm run harness -- --mode baseline     # 현재 코드 점검; 변경 완료 증거 아님
npm run harness:test                   # 하네스 변경 시 회귀 검사
```

- 검사기(`scripts/harness/check.mjs`)는 BE `scripts/harness/check.sh`와 같은 브랜치·커밋 규칙과 종료 코드를 Node로 구현했다. Bash·Python 없이 Windows·macOS·Linux에서 돈다. npm으로 옵션을 넘길 때는 `--` 뒤에 적는다.
- 빌드 단계는 `npm run lint` → `npm run build` → (`test` 스크립트가 있으면) `npm run test`다. 2026-10-21 기준 lint·build는 통과한다. 의존성이 `package-lock.json`과 다르면 먼저 `npm ci`를 실행한다.
- 종료 코드 0은 명시한 모드의 통과, 1은 실패, 2는 일부 검사다. `--skip-build` 또는 변경 커밋 0개는 완료 증거가 아니다. 기준 ref 누락·얕은 이력은 실패다.
- 화면을 바꿨으면 브라우저에서 확인한다. 개발 서버 설정은 `.claude/launch.json`(`footy-fe-dev`, 5173 포트, 사용 중이면 다른 포트)이다. 바뀐 흐름을 직접 조작하고, 콘솔 에러가 없는지, 모바일 폭(375px)에서 깨지지 않는지 본다. 확인하지 못한 범위는 보고한다.
- `.github/workflows/harness.yml`은 PR 변경 검사와 기본 브랜치 baseline 검사를 Ubuntu·Windows에서 수행한다. 원격에 반영된 뒤에만 실행되며, 이 저장소에서는 브랜치 보호로 필수 검사를 강제할 수 없다(FC-02).

## 6. 완료 조건 (모든 작업 공통)

1. 변경을 커밋·PR로 제출할 때 `npm run harness`의 change 모드가 통과한다. 커밋 전 로컬 수정·감사는 baseline 결과와 미검증 브랜치·커밋 항목을 구분해 보고하며 제출 완료로 표현하지 않는다. 하네스 변경이면 회귀 검사도 통과해야 한다.
2. 화면 변경은 브라우저에서 확인했거나, 확인하지 못한 범위를 보고했다.
3. 변경이 연결된 이슈 범위를 벗어나지 않는다.
4. 의존성·폴더 구조·언어·API 계약 가정을 바꾸지 않았거나, 바꿨다면 사람이 승인한 결정(`decisions.md`의 `확정` 항목)을 근거로 적었다.
5. 작업 중 발견한 문서 충돌·미결정 사항을 `decisions.md` 형식으로 보고했다.
6. PR 본문에 이슈 번호, 변경 요약, 검증 명령 출력, 남은 질문을 적었다.
