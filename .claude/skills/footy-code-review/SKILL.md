---
name: footy-code-review
description: FOOTY_FE의 PR이나 로컬 변경을 팀 규칙·BE API 계약·Notion 기능 기준으로 리뷰하는 절차와 보고 형식. 코드 리뷰, PR 점검, 병합 전 확인을 요청받았을 때 사용한다.
---

# FOOTY FE 코드 리뷰 워크플로

에이전트 리뷰는 참고 의견이다. Notion 규칙상 병합에는 사람 리뷰어 1명 이상의 approve가 필요하고, 에이전트는 PR을 approve·merge하지 않는다. PR에 코멘트를 남기는 것도 사람이 요청했을 때만 한다.

## 1. 대상 파악

```bash
gh pr view <번호> --json number,title,body,headRefName,baseRefName,files
gh pr diff <번호>
# 로컬 변경이면 실제 base를 기준으로 커밋·미커밋 변경 모두 확인
git diff origin/main...HEAD
git diff
git diff --cached
git status --short
```

- 연결 이슈와 Notion 기능을 확인한다(`footy-ui-implement/references/feature-map.md`).
- API 연동이 있으면 `docs/api/backend-api.md`와 BE `develop` 코드를 대조한다.
- PR 브랜치를 체크아웃해 검증을 직접 돌린다. 리뷰하는 동안 코드를 고치지 않는다.

## 2. 검증 실행

```bash
npm ci   # package-lock.json이 바뀌었거나 node_modules가 다를 때
npm run harness -- --base origin/main
```

base는 실제 PR 대상에 맞춘다. 커밋 전 로컬 감사는 `npm run harness -- --mode baseline`으로 lint·build를 검증하고 브랜치·커밋 검증 미완료를 명시한다. 하네스 변경이면 `npm run harness:test`도 실행한다. detached HEAD에서는 실제 PR head를 checkout한 뒤 `--head <head SHA> --branch <원본 브랜치>`를 전달한다. 인자를 임의로 바꿔 검사를 우회하지 않는다.

화면 변경이면 개발 서버(`.claude/launch.json`의 `footy-fe-dev`)를 띄워 바뀐 흐름을 직접 조작하고, 콘솔 에러와 모바일 폭(375px)을 확인한다.

결과(모드, 기준 ref, 종료 코드, 통과/실패/일부 검사와 실패 출력, 브라우저 확인 범위)를 리뷰 맨 앞에 적는다. baseline 통과·종료 코드 2는 변경 완료 증거가 아니다.

## 3. 점검 항목

| # | 항목 | 기준 |
|---|---|---|
| R1 | 범위 | 변경이 연결 이슈의 기능 하나에 머무는가 |
| R2 | API 계약 | 경로·메서드·요청/응답 필드·상태 코드·에러 `code`가 BE 코드(`docs/api/backend-api.md` 스냅샷과 BE `develop`)와 같은가. BE에 없는 엔드포인트·필드를 가정하지 않았는가 |
| R3 | 미결정 사항 | `decisions.md`에서 `미결정`인 항목(의존성 추가, 언어, 폴더 구조, 라우팅, 상태 관리, 스타일링, 토큰 저장, API 주소 등)을 코드가 임의로 정하지 않았는가 |
| R4 | 확정 규칙 | `확정` 항목과 BE 확정 결정(BE D-03·D-04·D-05a~e·D-07)을 따르는가 |
| R5 | 정확성·화면 상태 | 요구사항의 입력·출력·예외가 구현과 맞는가. 로딩·빈 목록·에러·권한 없음 상태, 중복 제출, 소프트 삭제된 대상 처리. 입력 검증이 BE 규칙과 같은가(예: 닉네임 코드 포인트 2~10자) |
| R6 | 인증 흐름·권한 | 비로그인·온보딩 미완료(`onboarded=false`, `MEMBER_403_1`)·토큰 만료(`/auth/reissue`)·로그인 실패(`?error=login_failed`)를 처리하는가. 파티장 전용 UI의 노출 조건이 문서와 같고, 최종 권한 판단을 BE에 맡기는가 |
| R7 | 보안 | 비밀 값이 코드·`VITE_` 환경변수·커밋에 없음. 토큰·로그인 코드가 콘솔·로그·에러 메시지에 남지 않음. 사용자 입력을 `dangerouslySetInnerHTML`로 렌더링하지 않음 |
| R8 | 검증·린트 | `npm run harness` 결과, 브라우저 확인, 기존 테스트 실행. `eslint-disable`로 규칙(React Compiler 진단 포함)을 끄지 않았는가. FD-11 확정 전 새 테스트 누락은 권고이며 미검증 범위를 보고한다. 사용자·이슈가 필수로 요구한 테스트 누락은 완료 불가 |
| R9 | Git 규칙 | 브랜치 이름, 커밋 메시지, PR 본문이 `footy-git-workflow`를 따르는가 |

## 4. 보고 형식

```markdown
## 검증
harness: 모드 / 기준 ref / 종료 코드 / 통과·실패·일부 검사 (출력)
브라우저: 확인한 흐름·화면 폭 / 확인하지 못한 범위

## 발견 사항
| 심각도 | 위치 | 항목 | 내용 | 근거 |
|---|---|---|---|---|
| 차단 | src/.../LoginCallback.jsx:42 | R7 | 1회용 로그인 코드를 console.log로 출력 | AGENTS.md 4장 |

## 문서·코드 충돌
- (decisions.md 형식, 없으면 "없음")

## 결론
병합 가능 / 수정 필요 / 결정 필요
```

심각도
- **차단**: 잘못된 동작, 보안 문제, API 계약 불일치, lint·build·테스트 실패, 명시적으로 요구된 테스트 누락, 미결정 사항 임의 결정
- **수정 권고**: 동작은 맞지만 보완이 필요함(빠진 화면 상태, 선택 테스트 누락 등). 자동 검사 실패는 변경 제출 전에 해결
- **참고**: 취향이나 개선 제안. 3개 이하로 제한

추측으로 결함을 만들지 않는다. 각 발견 사항은 코드 위치와 재현 조건 또는 문서 근거를 함께 적는다.

## 완료 조건

- [ ] `npm run harness`를 실제로 실행하고 결과를 적었다
- [ ] 화면 변경이면 브라우저 확인 범위를 적었다
- [ ] R1~R9를 모두 확인했다
- [ ] 발견 사항마다 위치와 근거가 있다
- [ ] 충돌은 결정하지 않고 보고했다
