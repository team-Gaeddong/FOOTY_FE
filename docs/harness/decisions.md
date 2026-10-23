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

## FD. 미결정 사항

"현황·선택지"는 결정을 돕기 위한 정리이며 채택된 규칙이 아니다.

| ID | 항목 | 상태 | 막히는 작업 | 현황·선택지 |
|---|---|---|---|---|
| FD-01 | 언어(JavaScript·TypeScript) | 미결정 | 첫 화면 구현 | 현재 JavaScript(JSX). Vite 템플릿 README는 TypeScript와 타입 기반 lint를 권장. 화면이 늘수록 전환 비용이 커짐 |
| FD-02 | 폴더 구조 | 미결정 | 모든 화면 | 현재 `src/App.jsx` 하나. 예: 역할별(`pages`, `components`, `hooks`, `api`) / 도메인별(BE처럼 `auth`, `member`, `game` …) |
| FD-03 | 라우팅 | 미결정 | 모든 화면, 로그인 콜백 | 라우터 없음. 라이브러리와 URL 규칙. 로그인 콜백 경로는 BE 환경변수 `OAUTH_REDIRECT_URI`와 맞아야 함(FD-06) |
| FD-04 | 서버 통신·에러 처리 | 미결정 | 모든 API 연동 | HTTP 클라이언트(fetch·axios 등), 서버 상태 도구(TanStack Query 등) 사용 여부, `{code, message}` 공통 처리, access 만료 시 `POST /auth/reissue` 후 재시도 규칙 |
| FD-05 | 토큰 저장 위치 | 미결정 | 로그인, 이후 모든 API | BE는 토큰을 JSON 본문으로 줌(쿠키 아님). 메모리·localStorage·sessionStorage 등. XSS 노출과 새로고침 유지의 맞교환. HttpOnly 쿠키 방식은 BE 변경이 필요(BE D-05 범위) |
| FD-06 | API 주소·CORS·프록시 | 미결정 (BE 이슈 #13) | 모든 API 연동, 로그인 | BE `SecurityConfig`에 CORS 설정 없음. 개발 중 Vite `server.proxy`로 같은 origin을 만들지 BE에 CORS를 열지, 배포 구조, 환경변수 이름(예: `VITE_API_BASE_URL`), `OAUTH_REDIRECT_URI` 값 |
| FD-07 | 전역 상태 관리 | 미결정 | 로그인 사용자 공유 등 | React state·Context만 / 상태 관리 라이브러리 |
| FD-08 | 스타일링·디자인 토큰 | 미결정 | 모든 화면 | 현재 템플릿의 일반 CSS(`index.css`, `App.css`, `prefers-color-scheme`로 라이트·다크 자동 전환). CSS Modules·Tailwind·CSS-in-JS 등, 색·간격 토큰, 다크 모드 지원 여부 |
| FD-09 | 디자인 원본 | 미확인 | 화면 레이아웃·문구 | Figma 등 디자인 파일의 존재 여부와 URL(`sources.md`) |
| FD-10 | 코드 포매터 | 미결정 (BE D-08 포매터도 미결정) | 모든 코드 | Prettier 사용 여부·설정, 커밋 훅 |
| FD-11 | 테스트 도구·필수 여부 | 미결정 (BE D-09와 함께) | 테스트 작성 | `test` 스크립트 없음. 검사기는 `test` 스크립트가 생기면 자동 실행한다(대화형 watch 모드가 아니어야 함). 단위(Vitest·Testing Library 등)·E2E(Playwright 등) 선택 |
| FD-12 | 날짜·시간 형식과 시간대 | 미결정 (BE 이슈 #13) | 경기 생성, 일정 조회 | BE는 `LocalDateTime`(시간대 오프셋 없음)으로 주고받고 서버 시간대 기준은 결정 대기. FE 입력·표시 시간대 |
| FD-13 | 경기 생성 입력 정책 | 미결정 (BE 이슈 #13) | 경기 생성 화면 | BE 현재 검증: 제목 필수 100자 이하, 장소 필수 200자 이하, 정원 양수, 팀 수 기본 2. 팀 수 범위·과거 날짜 허용·정원 상한은 미결정 |
| FD-14 | BE 미구현 API의 목 사용 | 미결정 | BE보다 먼저 만드는 화면 | 목 데이터·MSW 사용 여부, 목 응답 필드의 근거(BE DTO가 정해지기 전에 필드를 지어내지 않기) |
| FD-15 | Node 버전 고정 | 미결정 | CI, 팀 개발 환경 | `engines`·`.nvmrc` 없음. 의존성 요구 범위(Vite 8, ESLint 10, `@rolldown/plugin-babel`)는 Node 22.13 이상 또는 24 이상. 작성 환경 v24.14.1, CI는 임시로 Node 24 |
| FD-16 | 배포 | 미결정 | 배포 준비(9주차), 운영 콜백 URI | 배포 대상, 환경별 API 주소 |
