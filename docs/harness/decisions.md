# 문서 충돌과 미결정 사항

에이전트는 이 문서의 `미결정`·`보고됨` 항목을 스스로 결정하지 않는다. 팀이 결정하면 상태를 `확정`으로 바꾸고 결정 내용, 날짜, 결정한 사람을 적는다. 그 뒤에만 에이전트가 그 결정을 따른다.

조사 기준(2026-10-21): `team-Gaeddong/FOOTY_FE` `main`(커밋 `6ca027d`), `team-Gaeddong/FOOTY_BE` `develop`(커밋 `ea0ce52`)의 코드·하네스 문서·이슈, GitHub API 조회. Notion·ERD Cloud 원본은 직접 확인하지 않았다(`sources.md`).

번호는 이 저장소의 충돌이 `FC-xx`, 미결정이 `FD-xx`다. 백엔드 저장소 항목은 `BE C-04`, `BE D-10`, 백엔드 이슈는 `BE 이슈 #13`처럼 적는다. 프론트·백엔드가 함께 정해야 하는 항목은 양쪽에 서로의 번호를 남긴다.

## 새 항목 보고 형식

```
### FC-xx 제목
- 상태: 보고됨
- 출처 A: (문서·위치) — 내용
- 출처 B: (문서·코드·위치) — 내용
- 영향: 어떤 작업이 막히는지
- 결정할 사람/시점:
```

작업 중 결정을 요청할 때:

```
[결정 필요] FD-05 토큰 저장 위치
- 이번 작업에서 필요한 이유: 로그인 후 access·refresh 토큰을 보관해야 함
- decisions.md의 현황: (요약)
- 선택지: A … / B …
```

## FC. 문서·코드 충돌

### FC-01 PR base 브랜치
- 상태: 보고됨
- 출처 A: BE `decisions.md` D-10 — PR base 미결정(`develop` 생성 / `main` 직행). BE `AGENTS.md` 2장 — 기본 브랜치 `main`
- 출처 B: GitHub 2026-10-21 조회 — BE 기본 브랜치는 `develop`이고 BE PR #4~#10은 모두 `develop` 대상. FE 저장소에는 `main`만 있음
- 영향: FE 기능 브랜치의 분기점과 PR 대상, 검사기의 `--base` 값. 검사기 기본값 `origin/main`은 결정이 아니다
- 결정할 사람/시점: 팀 / FE 첫 기능 PR 전

### FC-02 병합 조건을 GitHub에서 강제할 수 없음
- 상태: 보고됨
- 출처 A: Notion Github Commit 명세(BE 사본) — 병합 조건 "리뷰어 최소 1명 approve, CI build success"
- 출처 B: GitHub 2026-10-21 조회 — FE 저장소는 private, 조직 플랜은 free. 브랜치 보호 API가 `403 Upgrade to GitHub Pro or make this repository public to enable this feature.`를 반환. BE 저장소는 public
- 영향: 승인 없는 병합과 CI 실패 병합을 막을 수 없음. private 저장소의 Actions는 조직의 무료 사용 시간을 소모함
- 선택지: 저장소 public 전환 / 유료 플랜 / 규칙을 사람이 지키고 CI는 참고 신호로 운영
- 결정할 사람/시점: 팀(저장소 관리자) / FE 첫 PR 전

### FC-03 이슈 라벨
- 상태: 보고됨 (BE C-03과 같음)
- 출처 A: Notion — `BUG`, `feature`, `DOCS`, `Chore`, `Refactor`, `프로젝트 설정`, `테스트 추가`
- 출처 B: FE 저장소 2026-10-21 조회 — GitHub 기본 라벨(`bug`, `documentation`, `enhancement` 등)만 있음
- 영향: 이슈 규칙의 라벨을 붙일 수 없음. 에이전트는 라벨을 직접 만들지 않는다

### FC-04 커밋 메시지의 이슈 번호와 범위 표기
- 상태: 보고됨 (BE C-04와 같은 Notion 원본, 팀 공통)
- 내용: 형식 정의는 `CommitType :: (#issue number) Subject`이고 이슈 번호는 "merge commit이나 PR을 날릴 때만" 쓴다고 하지만, 예시는 일반 커밋에도 이슈 번호와 정의에 없는 `[범위]` 표기를 씀
- 영향: 일반 커밋의 이슈 번호 필수 여부. 검사기는 BE와 같이 두 형태를 모두 허용하고 `🔀`에만 이슈 번호를 요구한다. 이를 팀 정책 확정으로 해석하지 않는다

### FC-05 버전 시작값
- 상태: 보고됨 (BE C-05와 같음)
- 출처 A: Notion — "모든 버전은 01.00.00에서 시작"
- 출처 B: `package.json` — `"version": "0.0.0"`
- 영향: 릴리즈 커밋(`🚀 ::`)과 태그 버전. 버전은 사람이 올린다

### FC-06 epl 프로토타입의 참고 범위
- 상태: 보고됨
- 출처 A: `xo-rxs/epl` — 같은 도메인(경기 모집, Snake Draft 팀 배정, dnd-kit 전술 배치도, html2canvas 이미지 저장, 별점 리뷰)의 React 프로토타입. 서버 없이 LocalStorage에 저장하고 URLSearchParams로 화면을 바꾼다. 학년(1~4), 실력 점수(1~10), 실력·매너 별점(1~5)을 쓴다
- 출처 B: FOOTY ERD·BE 코드 — 서버 API와 DB(`game_player.skill_level`, `balance_review`, `mvp_vote`, `member.rating` 등)가 기준이고 학년 개념이 없음
- 영향: epl의 코드·데이터 구조를 그대로 가져오면 BE 계약과 어긋남. UI·알고리즘을 어디까지 참고·이식할지 정해야 함. 결정 전에는 epl을 기준 문서로 쓰지 않는다
- 결정할 사람/시점: 팀 / epl 코드를 처음 가져오기 전

### FC-07 기존 커밋 형식
- 상태: 참고
- FE 커밋 `fb1d578 Initial commit`, `6ca027d setting: Initial commit`은 커밋 규칙 형식이 아니다. 규칙 도입 전 커밋으로 보고 검사 대상에서 제외한다(검사기는 지정한 base와 HEAD의 공통 조상 이후 커밋만 검사). 이력을 재작성하지 않는다

### FC-08 BE 결정·이슈 종료와 BE `develop` 코드 불일치
- 상태: 보고됨(2026-10-28)
- 출처 A: BE `decisions.md` D-14(경기 생성 정책)·D-16(회원 없음 `MEMBER_404_1` 통일) 확정, BE 이슈 #11·#12·#22·#23 종료
- 출처 B: BE `develop` `5262aa9` — 그 PR(#26~#29)이 쌓은 PR로 열려 `develop`이 아닌 기능 브랜치(`feature/13_team-decisions` 등)에 병합되어 코드가 없음. `POST /games`는 정원·팀 수·과거 날짜를 검사하지 않고, 회원 없음에 `401 GLOBAL_401_1`을 줌
- 영향: 경기 생성 화면의 검증·에러 처리, 로그인 실패 처리(BE #11). FE 문서(`backend-api.md`)는 `develop` 코드 기준으로 적고 "반영 대기"로 표시함. FE도 같은 일이 있었음(FE PR #6 → `feature/3_login-logout`, 복구 PR로 처리)
- 결정할 사람/시점: BE 담당 / BE 쪽 `develop` 재병합. 쌓은 PR은 아래 PR이 병합되고 그 브랜치가 지워져 base가 바뀐 뒤 병합하는 규칙이 필요한지 팀 확인

## FD. 미결정 사항

"현황·선택지"는 결정을 돕기 위한 정리이며 채택된 규칙이 아니다.

| ID | 항목 | 상태 | 막히는 작업 | 현황·선택지 |
|---|---|---|---|---|
| FD-01 | 언어(JavaScript·TypeScript) | 미결정 | 첫 화면 구현 | 현재 JavaScript(JSX). Vite 템플릿 README는 TypeScript와 타입 기반 lint를 권장. 화면이 늘수록 전환 비용이 커짐 |
| FD-02 | 폴더 구조 | 확정(2026-10-26, 김태균) | — | **역할별**: `src/api`(BE 호출), `src/auth`(토큰·로그인 상태), `src/components`(공통 UI), `src/pages`(화면). 필요할 때 `src/hooks` 추가 |
| FD-03 | 라우팅 | 확정(2026-10-26, 김태균) | — | **react-router 7**(`BrowserRouter`). 로그인 콜백 경로는 `/login/callback`이고 BE `OAUTH_REDIRECT_URI`는 개발 중 `http://localhost:5173/login/callback` |
| FD-04 | 서버 통신·에러 처리 | 확정(2026-10-26, 김태균) | — | **네이티브 fetch 래퍼**(`src/api/client.js`), 서버 상태 도구 없음. 실패는 `ApiError(status, code, message)`로 던지고 `code`로 분기. 인증 API가 401이면 `POST /auth/reissue`(동시 요청 1회로 합침) 후 한 번 재시도, 재발급 실패면 로그아웃 상태로 전환. 화면 문구는 FE가 `code`별로 정하고 BE `message`를 그대로 보여주지 않는다 |
| FD-05 | 토큰 저장 위치 | 확정(2026-10-26, 김태균) | — | **access는 메모리, refresh는 localStorage**(`footy.refreshToken`). 새로고침하면 refresh로 재발급. XSS 시 refresh 노출 위험은 감수 |
| FD-06 | API 주소·CORS·프록시 | 확정(2026-10-26, 김태균) — 개발 환경만. 배포는 FD-16 | — | **Vite proxy**: `/api/*`를 접두사를 떼고 BE(기본 `http://localhost:8080`, `.env.local`의 `FOOTY_BE_ORIGIN`으로 변경)로 전달. 같은 origin이라 BE CORS 불필요. `VITE_API_BASE_URL`(기본 `/api`)로 호출 주소를 바꿀 수 있음 |
| FD-07 | 전역 상태 관리 | 확정(2026-10-26, 김태균) | — | **React state·Context만**. 로그인 상태는 `AuthProvider` |
| FD-08 | 스타일링·디자인 토큰 | 확정(2026-10-26, 김태균) | — | **CSS Modules** + `src/index.css`의 `:root` CSS 변수(색·간격·모서리). 다크 모드는 지원하지 않음. 모바일(375px) 우선, 콘텐츠 최대 폭 420px |
| FD-09 | 디자인 원본 | 미확인 | 화면 레이아웃·문구 | Figma 등 디자인 파일의 존재 여부와 URL(`sources.md`) |
| FD-10 | 코드 포매터 | 미결정 (BE D-08 포매터도 미결정) | 모든 코드 | Prettier 사용 여부·설정, 커밋 훅 |
| FD-11 | 테스트 도구·필수 여부 | 미결정 (BE D-09와 함께) | 테스트 작성 | `test` 스크립트 없음. 검사기는 `test` 스크립트가 생기면 자동 실행한다(대화형 watch 모드가 아니어야 함). 단위(Vitest·Testing Library 등)·E2E(Playwright 등) 선택 |
| FD-12 | 날짜·시간 형식과 시간대 | 미결정 | 경기 생성, 일정 조회 | BE는 `LocalDateTime`(시간대 오프셋 없음)으로 주고받고, 현재 시각 비교는 `Asia/Seoul`(`ClockConfig`, `5262aa9`). FE 입력·표시 시간대 |
| FD-13 | 경기 생성 입력 정책 | BE D-14로 확정(2026-10-26, 김태균) — BE `develop` 코드 미반영(FC-08) | 경기 생성 화면 | BE D-14: `maxPlayers` 2~30, `teamCount` 2 이상·`maxPlayers` 이하(생략 시 2), 과거 `playDate` 거부(`GAME_400_x`), 파티장 자동 참가. `develop` 코드는 아직 제목·장소 필수·길이, 정원 양수만 검사. 에러 코드는 BE 코드에 생긴 뒤 연동 |
| FD-14 | BE 미구현 API의 목 사용 | 미결정 | BE보다 먼저 만드는 화면 | 목 데이터·MSW 사용 여부, 목 응답 필드의 근거(BE DTO가 정해지기 전에 필드를 지어내지 않기) |
| FD-15 | Node 버전 고정 | 미결정 | CI, 팀 개발 환경 | `engines`·`.nvmrc` 없음. 의존성 요구 범위(Vite 8, ESLint 10, `@rolldown/plugin-babel`)는 Node 22.13 이상 또는 24 이상. 작성 환경 v24.14.1, CI는 임시로 Node 24 |
| FD-16 | 배포 | 미결정 | 배포 준비(9주차), 운영 콜백 URI | 배포 대상, 환경별 API 주소 |
