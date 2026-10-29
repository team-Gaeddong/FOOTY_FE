# 백엔드 API 스냅샷

출처: 공통·기존 API는 `team-Gaeddong/FOOTY_BE` `develop` 커밋 `ea0ce52`(2026-10-21)의 컨트롤러·DTO·서비스 예외·에러 코드·보안 설정. 경기 목록 API는 `db07e6b`(2026-10-23), 재경기 API와 생성 응답은 `5262aa9`(2026-10-28)의 컨트롤러·DTO·서비스·에러 코드를 대조했다. 결정 근거는 BE `docs/harness/decisions.md`다. 기준은 BE 코드이며, 이 문서와 다르면 BE 코드를 따르고 차이를 보고한다(AGENTS.md 1장). 연동 작업 전에는 아래 "다시 확인하는 방법"으로 최신 코드와 대조한다.

## 공통

- 서버 주소·프록시: 개발 중에는 Vite proxy `/api` → BE(FD-06 확정). 배포는 FD-16. 경로에 버전·`/api` 접두사가 없다(BE D-07). BE CORS는 미결정(BE D-15)
- 인증: `Authorization: Bearer {accessToken}`. 토큰이 없으면 `401 GLOBAL_401_1`, 잘못된·만료된·로그아웃한 토큰이면 `401 AUTH_401_2`·`AUTH_401_3`·`AUTH_401_5`
- 성공 응답: 래퍼 없이 DTO 그대로(BE D-03). 본문이 없는 성공은 `204`
- 에러 응답: `{"code": string, "message": string}` + HTTP 상태(BE D-04). `code`는 `{도메인}_{HTTP 상태}_{순번}`
- 요청 본문을 읽을 수 없거나(JSON 오류) `@Valid` 검증에 실패하면 `400 GLOBAL_400_1`
- 날짜·시간: BE `LocalDateTime`(시간대 오프셋 없음), 서비스 시각은 `Asia/Seoul` 기준이다. FE는 입력한 한국시간을 `YYYY-MM-DDTHH:mm:ss`로 보낸다
- 온보딩 미완료 회원은 `PATCH /members/me/onboarding`, `POST /auth/logout`, `DELETE /members/me` 외의 인증 API에서 `403 MEMBER_403_1`을 받는다. BE는 토큰이 아니라 DB의 온보딩 여부를 보므로 온보딩 직후 바로 풀린다. `POST /auth/token`·`POST /auth/reissue`는 인증 없이 열려 있다

## 로그인 흐름 (BE D-05a~e)

1. 브라우저를 `{BE 주소}/oauth2/authorization/google`로 이동한다(fetch가 아닌 페이지 이동). Google 콜백(`/login/oauth2/code/google`)은 Spring Security가 처리한다
2. BE가 `OAUTH_REDIRECT_URI`(BE 환경변수, FE 콜백 주소)로 리다이렉트한다. 토큰은 URL에 싣지 않는다
   - 성공: `?code={1회용 코드}` — 1분 동안 한 번만 교환할 수 있다
   - 실패: `?error=login_failed` — Google 로그인 실패와, Google 로그인은 됐지만 BE의 회원 저장·코드 발급이 실패한 경우 모두 같은 값(BE #11)
3. `POST /auth/token` `{ "code" }` → `200 TokenResponse`
4. `onboarded`가 `false`면 온보딩 화면으로 보낸다(`TokenResponse` 주석). 온보딩 완료는 `PATCH /members/me/onboarding`, 이어서 선호 포지션은 `PUT /members/me/positions`
5. access가 만료되면(30분) `POST /auth/reissue` `{ "refreshToken" }` → 새 `TokenResponse`. refresh는 회전되어 이전 값은 다시 쓸 수 없다. 같은 refresh로 동시에 보내면 하나만 성공하고 나머지는 `401 AUTH_401_4`이므로, 재발급은 한 번에 하나만 보낸다(FE `refreshSession`이 동시 요청을 하나로 합침)
6. 로그아웃은 `POST /auth/logout` → `204`. BE가 refresh를 지우고 access를 남은 만료 시간 동안 블랙리스트에 둔다

탈퇴한 회원이 같은 Google 계정으로 다시 로그인하면 계정이 복구된다(BE D-05d).

## 엔드포인트

| 메서드·경로 | 인증 | 요청 | 성공 | 이 API의 에러 | BE 이슈 |
|---|---|---|---|---|---|
| `GET /oauth2/authorization/google` | 없음(페이지 이동) | — | 302 → 콜백 `?code=` | 콜백 `?error=login_failed` | #5 |
| `POST /auth/token` | 없음 | `{ code }` | 200 `TokenResponse` | `GLOBAL_400_1`(빈 값), `AUTH_401_1`(없음·만료·사용됨·탈퇴 회원) | #5 |
| `POST /auth/reissue` | 없음 | `{ refreshToken }` | 200 `TokenResponse` | `GLOBAL_400_1`(빈 값), `AUTH_401_4`(저장된 값과 다름·탈퇴 회원), 토큰 자체 오류는 `AUTH_401_x` | #5 |
| `POST /auth/logout` | Bearer | — | 204 | 인증 에러 | #5 |
| `PATCH /members/me/onboarding` | Bearer | `{ nickname }` | 204 | `MEMBER_400_1`, `MEMBER_404_1`(회원 없음·탈퇴), `MEMBER_409_1` | #3 |
| `PUT /members/me/positions` | Bearer + 온보딩 | `{ positions }` | 204 | `MEMBER_400_2`, `GLOBAL_400_1`(없는 포지션 값), `MEMBER_403_1`, `MEMBER_404_1` | #16 |
| `DELETE /members/me` | Bearer | — | 204 | `MEMBER_404_1` | #3 |
| `GET /members/me` | Bearer + 온보딩 | — | 200 `MyProfileResponse` | `MEMBER_403_1`, `MEMBER_404_1` | #1 |
| `POST /games` | Bearer + 온보딩 | `CreateGameRequest` | 201 `CreateGameResponse` | `GLOBAL_400_1`(형식·필수·길이), `GAME_400_2`(정원), `GAME_400_4`(팀 수), `GAME_400_3`(일시), `MEMBER_404_1`(없는·탈퇴 회원), `MEMBER_403_1` | #2, #22 |
| `GET /games` | Bearer + 온보딩 | `page`(0부터, 기본 0), `size`(1~100, 기본 20) 쿼리 | 200 `ListGamesResponse` | `GLOBAL_400_1`(잘못된 페이지·크기), 인증·온보딩 에러 | #14 |
| `POST /games/{gameId}/rematch` | Bearer + 온보딩, 원본 파티장 | `{ playDate }` | 201 `CreateGameResponse` | `GLOBAL_400_1`, `GAME_400_3`, `GAME_403_1`, `GAME_404_1`, `GAME_409_2`, 인증·온보딩 에러 | #30 |
| `POST /games/{gameId}/lineups` | Bearer + 온보딩, 파티장 | — | 201 `LineupResponse` | `GAME_403_1`, `GAME_404_1`, `LINEUP_409_1`(이미 있음), `LINEUP_409_2`(실력 미입력 선수), `LINEUP_409_3`(선수 2명 미만), 인증·온보딩 에러 | #40, #42 |

닉네임 검증(BE `MemberService`): 앞뒤 공백을 `strip()`으로 지운 뒤 **코드 포인트 수**로 2~10자, 중복 허용. FE에서 같은 규칙으로 미리 검사하려면 `[...nickname.trim()].length`처럼 코드 포인트로 센다.

## 요청·응답 본문

`TokenResponse`

| 필드 | 타입 | 설명 |
|---|---|---|
| `accessToken` | string | |
| `refreshToken` | string | |
| `onboarded` | boolean | `false`면 온보딩 필요 |

`UpdatePositionsRequest`(회원), `UpdatePlayerPositionsRequest`(경기별 선수)

| 필드 | 타입 | 규칙 |
|---|---|---|
| `positions` | string[] | `GK`·`DF`·`MF`·`FW` 중 1~4개, 중복 없음. 순서가 우선순위 |

`MyProfileResponse`

| 필드 | 타입 | 설명 |
|---|---|---|
| `memberId` | number | |
| `email` | string | |
| `nickname` | string | |
| `rating` | number | BE `BigDecimal` |
| `onboarded` | boolean | |
| `positions` | `{ position, priority }[]` | `position`은 `GK`·`DF`·`MF`·`FW` 중 하나, `priority`는 1부터(오름차순 정렬). 선호 포지션이 없으면 빈 배열 |

`CreateGameRequest`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `title` | string | 필수, 공백만은 불가, 100자 이하 (`GLOBAL_400_1`) |
| `playDate` | string(`LocalDateTime`) | 필수, 현재(`Asia/Seoul`) 이후 (`GAME_400_3`) |
| `location` | string | 필수, 공백만은 불가, 200자 이하 (`GLOBAL_400_1`) |
| `maxPlayers` | number | 필수, 2~30 (`GAME_400_2`) |
| `teamCount` | number | 선택, 없으면 2. 2 이상이고 `maxPlayers` 이하 (`GAME_400_4`) |

`RematchGameRequest`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `playDate` | string(`LocalDateTime`) | 필수, 현재(`Asia/Seoul`) 이후 |

`CreateGameResponse` (`POST /games`, `POST /games/{gameId}/rematch`)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | number | |
| `hostId` | number | 파티장(경기 생성자) |
| `title`, `playDate`, `location`, `maxPlayers`, `teamCount` | | 요청과 같은 뜻. 재경기는 원본에서 복사(`playDate`만 새 값) |
| `status` | string | `RECRUITING`·`CONFIRMED`·`FINISHED` 중 하나 |
| `createdAt` | string(`LocalDateTime`) | |

`RematchGameRequest`: `{ "playDate": "2026-11-01T10:00:00" }`. `playDate`는 필수이며 한국시간 기준 현재 이후여야 한다. 삭제되지 않은 `FINISHED` 경기의 원본 파티장만 호출할 수 있다. 제목·장소·최대 인원·팀 수를 복사한 새 `RECRUITING` 경기를 만들고, 원본 경기와 참가 선수 목록은 그대로 둔다. 원본 경기 ID를 저장하는 컬럼은 없다.

`ListGamesResponse` (`GET /games`)

| 필드 | 타입 | 설명 |
|---|---|---|
| `games` | `GameSummaryResponse[]` | 삭제되지 않은 모든 경기. 지난 경기 포함, `playDate`·`id` 오름차순 |
| `page` | number | 현재 페이지(0부터) |
| `size` | number | 페이지 크기 |
| `totalElements` | number | 전체 경기 수 |
| `totalPages` | number | 전체 페이지 수. 경기가 없으면 0 |

`GameSummaryResponse`: `id`, `hostId`, `title`, `playDate`, `location`, `maxPlayers`, `teamCount`, `status`. `status`는 `RECRUITING`·`CONFIRMED`·`FINISHED` 중 하나다.

`LineupResponse` (`POST /games/{gameId}/lineups`, BE `37d2efc` 대조, BE D-21·D-22)

| 필드 | 타입 | 설명 |
|---|---|---|
| `lineupId` | number | |
| `version` | number | 처음 짜면 1. 다시 짜기 때 증가 |
| `method` | string | `AI`·`ALGORITHM`·`MANUAL`. 현재 팀 짜기는 `ALGORITHM` |
| `isConfirmed` | boolean | 팀 확정 여부. 만들 때 `false` |
| `teams` | `{ teamId, name, totalSkill, members }[]` | 항상 2팀(`A팀`·`B팀`). `game.teamCount`는 아직 무시(BE D-21 미결정). `totalSkill`은 후보를 뺀 실력 합계 |
| `teams[].members` | `{ gamePlayerId, name, skillLevel, position, isSubstitute }[]` | `position`은 1순위 희망 포지션, 없으면 `FW`. 실력 순으로 앞의 `maxPlayers`명이 선발이고 나머지는 `isSubstitute: true` |

라인업 조회 API는 없다. 이미 짠 경기(`LINEUP_409_1`)의 팀 구성은 FE에서 다시 볼 수 없다.

## 에러 코드

| code | HTTP | message |
|---|---|---|
| `GLOBAL_400_1` | 400 | 요청 값이 올바르지 않습니다. |
| `GLOBAL_401_1` | 401 | 인증이 필요합니다. |
| `GLOBAL_404_1` | 404 | 요청한 경로를 찾을 수 없습니다. |
| `GLOBAL_405_1` | 405 | 지원하지 않는 HTTP 메서드입니다. |
| `GLOBAL_415_1` | 415 | 지원하지 않는 Content-Type입니다. |
| `GLOBAL_500_1` | 500 | 서버 오류가 발생했습니다. |
| `AUTH_401_1` | 401 | 로그인 코드가 유효하지 않거나 만료되었습니다. |
| `AUTH_401_2` | 401 | 유효하지 않은 토큰입니다. |
| `AUTH_401_3` | 401 | 만료된 토큰입니다. |
| `AUTH_401_4` | 401 | refresh 토큰이 유효하지 않습니다. 다시 로그인해 주세요. |
| `AUTH_401_5` | 401 | 로그아웃한 토큰입니다. |
| `MEMBER_400_1` | 400 | 닉네임은 앞뒤 공백을 제외하고 2~10자여야 합니다. |
| `MEMBER_400_2` | 400 | 포지션은 GK·DF·MF·FW 중 1~4개를 중복 없이 골라야 합니다. |
| `MEMBER_403_1` | 403 | 온보딩을 마친 뒤 이용할 수 있습니다. |
| `MEMBER_404_1` | 404 | 회원을 찾을 수 없습니다. (회원이 없거나 탈퇴한 경우, BE D-16) |
| `MEMBER_409_1` | 409 | 이미 온보딩을 마친 회원입니다. |
| `GAME_400_3` | 400 | 경기 일시는 현재 이후여야 합니다. |
| `GAME_403_1` | 403 | 파티장만 할 수 있습니다. |
| `GAME_404_1` | 404 | 경기를 찾을 수 없습니다. |
| `GAME_409_2` | 409 | 종료된 경기만 재경기를 만들 수 있습니다. |
| `LINEUP_409_1` | 409 | 이미 팀을 짠 경기입니다. |
| `LINEUP_409_2` | 409 | 실력 점수가 없는 선수가 있습니다. |
| `LINEUP_409_3` | 409 | 팀을 짜려면 선수가 2명 이상이어야 합니다. |

- 경기 생성 검증용으로 먼저 공유된 번호가 있었다면 바뀌었다: 최대 인원 `GAME_400_1` → `GAME_400_2`, 팀 수 `GAME_400_2` → `GAME_400_4`. `GAME_400_1`은 실력 매기기의 선수 중복에만 쓴다(BE PR #35 안내)
- 화면에는 BE `message`를 그대로 보여주지 않고 FE가 `code`별 문구를 정한다(FD-04). 분기는 `code`로 한다

## BE 결정과 `develop` 코드의 차이

2026-10-28 BE PR #35(`0a6c46f`)로 BE 이슈 #11·#12·#22·#23의 코드가 `develop`에 복구되어, FC-08에서 보고한 차이는 없다. 쌓은 PR은 병합 커밋이 `develop`의 조상인지 아래 방법으로 확인한다.

## 다시 확인하는 방법

```bash
# FOOTY_BE 로컬 사본이 있으면(경로는 각자 다름)
git -C ../FOOTY_BE fetch origin
git -C ../FOOTY_BE log -1 --format='%h %cs %s' origin/develop
git -C ../FOOTY_BE diff --stat 0a6c46f origin/develop -- src/main/java
git -C ../FOOTY_BE grep -n -E "@(Get|Post|Put|Patch|Delete|Request)Mapping" origin/develop -- src/main/java
git -C ../FOOTY_BE grep -n -E '"[A-Z]+_[0-9]+_[0-9]+"' origin/develop -- src/main/java

# 쌓은 PR이 develop에 들어갔는지(병합 커밋이 develop의 조상인지)
gh pr view {PR번호} -R team-Gaeddong/FOOTY_BE --json baseRefName,mergeCommit

# 로컬 사본이 없으면 GitHub에서 파일 단위로
gh api -H "Accept: application/vnd.github.raw" "repos/team-Gaeddong/FOOTY_BE/contents/{경로}?ref=develop"
```

BE에 새 API가 생기거나 위 내용과 다르면 이 문서를 고치고 기준 커밋을 갱신한다. 이 문서만 고치는 변경도 이슈·PR 규칙을 따른다.
