# 원본 문서 등록부

2026-10-21 FE 하네스 구축 기준. "검증 상태"는 그날 실제로 확인한 범위다. 사본의 작성 날짜를 원본 재검증 날짜로 해석하지 않는다.

| 원본 | URL / 식별자 | 로컬 사본 | 검증 상태 |
|---|---|---|---|
| Notion FOOTY > 기능·스프린트 일정 | 미확인 | `.claude/skills/footy-ui-implement/references/feature-map.md` | FOOTY_BE의 사본(2026-10-14 작성)을 옮김. Notion 원본 미대조 |
| Notion FOOTY > Github Commit 명세 | 미확인 | `.claude/skills/footy-git-workflow/SKILL.md` | FOOTY_BE의 사본을 옮김. 원본 미대조, 원본 문구 충돌 FC-04 |
| Notion FOOTY > 1차 스크럼 회고록 | 미확인 | AGENTS.md 4장의 요구사항 정리 규칙 | FOOTY_BE `AGENTS.md` 기준, 원본 미대조 |
| ERD Cloud footy | https://www.erdcloud.com/d/e7RdzNfbJHXhjyKiu | FOOTY_BE `docs/erd/footy_erd.sql`, `docs/erd/constraints.md` | FE에는 사본 없음. BE `sources.md`에 2026-10-19 대조 기록 |
| FOOTY_BE 코드(API 계약) | https://github.com/team-Gaeddong/FOOTY_BE `develop` | `docs/api/backend-api.md` | 2026-10-21 `ea0ce52`의 컨트롤러·DTO·서비스 예외·에러 코드·보안 설정에서 작성 |
| FOOTY_BE 하네스 문서 | 같은 저장소의 `AGENTS.md`, `docs/harness/decisions.md` | AGENTS.md 3장 요약 | 2026-10-21 `ea0ce52` 기준. BE 문서의 일부 현황(기본 브랜치 `main`, README의 "API·DB 계층 없음")은 실제와 다름 → API는 BE 코드, 브랜치는 GitHub 조회를 우선 |
| GitHub FOOTY_FE | https://github.com/team-Gaeddong/FOOTY_FE | 로컬 Git 저장소 | 2026-10-21 API 조회: private, 기본 `main`, 브랜치 보호 불가(FC-02), workflow 0개, 기본 라벨만(FC-03) |
| 화면 디자인 | 미확인 (FD-09) | — | — |
| 참고: epl 프로토타입 | https://github.com/xo-rxs/epl | — | 기준 문서 아님(FC-06). 2026-10-21 `5477142` 확인 |

## 원본을 확인할 때

팀원이 실제 URL/페이지 ID를 제공하면 위 표에 기록한다. 이름만 보고 다른 페이지를 원본으로 선택하거나 URL을 만들어내지 않는다. 접근에 필요한 계정이나 토큰은 이 문서에 저장하지 않는다.

- Notion은 해당 기능의 입력·출력·예외·담당 범위를 대조한다.
- BE 코드는 연동할 컨트롤러·요청/응답 DTO·서비스 예외·에러 코드·보안 필터를 `develop`에서 대조한다(`docs/api/backend-api.md`의 "다시 확인하는 방법").
- 확인한 사람, 날짜, 원본 수정 시각/커밋, 대조 범위를 남긴다. 차이는 `decisions.md` 형식으로 보고한다.

## 접근할 수 없을 때

접근 실패와 사본의 검증 한계를 보고한다. 사본만으로 가능한 코드 점검·빌드·하네스 유지보수는 계속한다. 확인되지 않은 원본에 의존하는 기능·연동만 보류하고, 필요한 부분의 내보내기나 링크를 요청한다. 사본을 최신 원본으로 인증하지 않는다.
