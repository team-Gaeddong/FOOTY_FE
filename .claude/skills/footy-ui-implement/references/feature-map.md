# 기능 ↔ 스프린트 ↔ BE API 매핑

스냅샷: Notion `FOOTY > 기능`, `FOOTY > 스프린트 일정`. FOOTY_BE `.claude/skills/footy-api-implement/references/feature-map.md`(BE 작성 2026-10-14)를 옮기고, BE `develop` `0a6c46f`(2026-10-28)에 있는 API를 덧붙였다. Notion 원본과 직접 대조하지 않았다. 원본이 바뀌었으면 원본을 따른다. 원본 URL·재검증 범위는 `docs/harness/sources.md`를 확인한다.

- 기능 이름과 담당자는 스프린트 일정 기준이다. 기능 페이지의 이름과 다른 항목이 있다(BE C-07).
- 담당은 Notion 값 그대로이며 FE 작업 담당까지 뜻하는지는 확인되지 않았다. FE 이슈 담당은 사람에게 확인한다.
- "Notion 설명"은 기능 페이지 본문 그대로다. 비어 있으면 설명이 없는 것이다.
- 주차는 전체 9주 기준이다(Sprint 1 = 1~2주, Sprint 2 = 3~4주, Sprint 3 = 5~6주, Sprint 4 = 7~8주, 마무리 = 9주).
- "BE API"가 "없음"이면 BE에 아직 엔드포인트가 없다. 연동 전에 BE 진행을 확인하고, 목 데이터는 FD-14를 따른다. 요청·응답 세부는 `docs/api/backend-api.md`에 있다.

| 기능 | 스프린트 | 주차 | 담당 | 주요 테이블 | BE API (`0a6c46f`) | Notion 설명 |
|---|---|---|---|---|---|---|
| 요구사항 정리 및 공통 구조 설계 | Sprint 1 | 1 | 다함께 | — | — | |
| 로그인 / 로그아웃 | Sprint 1 | 1 | 김태균 | member | `GET /oauth2/authorization/google`, `POST /auth/token`, `POST /auth/reissue`, `POST /auth/logout` | |
| 회원가입 / 탈퇴 | Sprint 1 | 1 | 김태균 | member | `PATCH /members/me/onboarding`, `DELETE /members/me` | |
| 내 프로필 조회 | Sprint 1 | 1 | 곽효오 | member, member_position | `GET /members/me` | |
| 경기 생성 | Sprint 1 | 1~2 | 안세하 | game | `POST /games` | |
| 경기 일정 조회 / 목록 | Sprint 1 | 2 | 안세하 | game | `GET /games` | |
| 선수 등록 | Sprint 1 | 2 | 전재준 | game_player | `POST /games/{gameId}/players`(비회원 선수) | 이름/닉네임, 포지션, 실력 등을 등록 |
| 매치 참여 기능 | Sprint 2 | 3 | 김태균 | game_player | 없음 | |
| 포지션 복수 선택 | Sprint 2 | 3 | 김태균 | member_position, player_position | `PUT /members/me/positions` | 우선 순위 정하기 |
| 포지션 설정 | Sprint 2 | 3 | 안세하 | player_position | `PUT /games/{gameId}/players/{gamePlayerId}/positions` | GK / DF / MF / FW, 복수 선택 가능 |
| 선수 실력 매기기 | Sprint 2 | 3 | 곽효오 | game_player.skill_level | `PATCH /games/{gameId}/players/skill-levels` | |
| 후보 선수 지정 | Sprint 2 | 3 | 곽효오 | game_player.is_substitute | 없음 | 18명이 넘을 경우 실력 차이를 고려해서 공평하게 정해짐 |
| AI/알고리즘 팀 짜기 | Sprint 2 | 4 | 곽효오 | lineup, team, team_member | 없음 | |
| 드래그 앤 드롭 전술 배치도 | Sprint 3 | 5 | 김태균 | team.formation, team_member.pos_x, pos_y | `GET`·`PUT /games/{gameId}/teams/{teamId}/tactic` (BE #46) | 좌표는 퍼센트 0~100. 이름 붙인 전술 저장은 범위 밖(BE D-23) |
| 팀 확정 | Sprint 3 | 5 | 안세하 | lineup.is_confirmed | 없음 | |
| 다시 짜기 | Sprint 3 | 5~6 | 안세하 | lineup.version | 없음 | 마음에 안 들면 조건 유지하고 재배정 |
| 경기 저장 | Sprint 3 | 6 | 안세하 | lineup, (결과 컬럼 없음) | 없음 | 해당 날짜의 팀 구성과 경기 결과 저장 |
| 전술 배치도 이미지 저장 | Sprint 3 | 6 | 전재준 | lineup.image_url | 없음 | |
| 경기 상세 조회 | Sprint 3 | 6 | 곽효오 | game 외 다수 | `GET /games/{gameId}` (BE #54, `8d2b767`) | |
| 경기 이후 밸런스 작성 | Sprint 4 | 7 | 곽효오 | balance_review | 없음 | |
| 경기 MVP | Sprint 4 | 7 | 곽효오 | mvp_vote | 없음 | 경기 끝나고 오늘의 MVP 선택하게 하기 |
| 밸런스 취합 및 점수 계산 | Sprint 4 | 7 | 곽효오 | balance_review, member.rating | 없음 | |
| 파티장 공지 작성 / 조회 | Sprint 4 | 7 | 전재준 | notice | 없음 | |
| 각종 의견 투표 생성 | Sprint 4 | 7 | 전재준 | poll, poll_option, poll_answer | 없음 | |
| 경기 삭제 | Sprint 4 | 8 | 전재준 | game.is_deleted | 없음 | |
| 악성 유저 신고 | Sprint 4 | 8 | 김태균 | report | 없음 | |
| 전체 기능 연동 테스트 | 마무리 | 9 | — | — | — | |
| 최종 버그 수정 및 배포 준비 | 마무리 | 9 | — | — | — | |

- 재경기 생성 `POST /games/{gameId}/rematch`(BE 이슈 #30, D-18)는 BE에 있지만 대응하는 Notion 기능 행이 없다. 어느 기능에 속하는지 사람에게 확인한다("다시 짜기"는 라인업 재배정이라 다르다).
- "경기 저장"의 경기 결과(스코어·승패)는 ERD에 저장 구조가 없다(BE C-06).
- 채택하지 않은 기능: "전술 배치도 자동 생성"(재준) — 사유 "위 팀짜기 기능과 겹침 이슈". 구현하지 않는다.
