---
name: footy-git-workflow
description: FOOTY_FE의 이슈 생성, 브랜치 이름, 커밋 메시지, PR, 버전 규칙. 이슈를 만들거나 브랜치를 따거나 커밋·PR을 작성할 때 사용한다.
---

# FOOTY 이슈·브랜치·커밋·PR 규칙

출처: Notion `FOOTY > Github Commit 명세`. 이 사본은 FOOTY_BE `.claude/skills/footy-git-workflow/SKILL.md`(`develop` `ea0ce52`, BE 작성 2026-10-14)를 FE 저장소에 맞게 옮긴 것이며 Notion 원본과 직접 대조하지 않았다. 원본과 다르면 원본이 우선이다. 원본 URL·재검증 상태는 `docs/harness/sources.md`에서 확인한다.

## 개발 프로세스

1. 이슈 생성 — 기능 1개당 이 저장소(FOOTY_FE)에 이슈 1개, 성격에 맞는 라벨 지정
2. 이슈 기반 브랜치 생성
3. 이슈 범위의 기능 개발 완료
4. PR 또는 merge commit도 커밋 메시지 규칙을 따른다
5. 병합 조건: 리뷰어 최소 1명 approve, CI build success, 기존 테스트 실행. 새 테스트의 필수 여부는 AGENTS.md 및 FD-11(BE D-09)을 따른다
6. 병합 후 feature 브랜치 삭제
7. 이슈 close

이 저장소는 GitHub 브랜치 보호를 쓸 수 없어 5번이 자동으로 강제되지 않는다(`decisions.md` FC-02). 에이전트는 PR을 approve·merge하지 않는다.

## 라벨 (Notion 정의)

| Label | 의미 |
|---|---|
| `BUG` | 예기치 않은 문제, 의도하지 않은 동작 |
| `feature` | 새 기능 요청 |
| `DOCS` | 문서 추가·개선 |
| `Chore` | 자잘한 수정 |
| `Refactor` | 리팩토링 필요 |
| `프로젝트 설정` | 프로젝트 설정 필요 |
| `테스트 추가` | 새 테스트 요청 |

현재 FE 저장소에는 이 라벨이 없고 GitHub 기본 라벨만 있다(`decisions.md` FC-03). 라벨을 직접 만들지 말고 사람에게 알린다.

## 브랜치

```
feature/{issue number}_{todo}
hotfix/{issue number}_{todo}
```

예: `feature/12_login-page`. 이슈 번호는 이 저장소의 이슈 번호다. Notion은 "기본적으로 GitFlow"라고 하지만 FE 저장소에는 `main`만 있고 BE는 `develop`을 쓴다(`decisions.md` FC-01). PR의 base 브랜치가 정해지기 전에는 사람에게 확인한다.

## 커밋 메시지

```
CommitType :: (#issue number) Subject
```

| CommitType | 의미 |
|---|---|
| `📄 ::` | 파일 생성 및 구조 변경 |
| `⚡ ::` | 기능 업데이트 |
| `⚰️ ::` | 기능 삭제 |
| `🐛 ::` | 버그 수정 |
| `♻️ ::` | 코드 리팩토링 |
| `📝 ::` | 문서 작성 및 수정 |
| `⚙️ ::` | 프로젝트 세팅 |
| `🧪 ::` | 테스트 코드 추가 |
| `🚀 ::` | 새 버전 릴리즈 |
| `🔀 ::` | Merge or PR |

- `(#issue number)`: Notion 설명은 "merge commit이나 PR을 날릴 때만 사용"이지만, 같은 문서의 예시에는 일반 커밋에도 붙어 있다(`decisions.md` FC-04, BE C-04). 일반 커밋의 필수 여부는 아직 결정되지 않았다. 검사기는 두 형태를 허용하며, 이를 팀 정책 확정으로 해석하지 않는다. PR·merge에는 이슈 번호를 넣는다.
- Subject: 50자 이내, 명령형, 한국어, "~수정했다" 대신 "~수정", "Add~" 대신 "~추가"
- Notion 예시에는 `[MainPage]`처럼 대괄호 범위 표기가 있으나 형식 정의에는 없다(FC-04). 필수·금지를 임의로 정하지 않는다. 해당 선택이 필요한 작업에서는 이미 승인된 이슈·사용자 지시를 따르거나 관련 선택만 확인한다.

예:
```
🐛 :: 헤더가 안보이는 버그 수정
🔀 :: (#12) 로그인 화면 추가
📝 :: README 파일 수정
```

## PR 본문 템플릿

```markdown
## 연결 이슈
close #이슈번호

## 변경 사항
- 

## 검증
npm run harness 출력 붙이기
브라우저 확인: 확인한 흐름·화면 폭, 확인하지 못한 범위

## 확인이 필요한 점
- 문서 충돌·미결정 사항 (decisions.md 항목 번호)
```

## 버전 규칙

`X.Y.Z` = Major(전체 변경, API 깨짐) · Minor(기능 추가·수정) · Patch(버그·내부 보완). 표기 예: `01.01.09` → `1.1.9`. 현재 `package.json`의 `0.0.0`과 Notion의 시작 버전이 다르다(`decisions.md` FC-05). 버전은 사람이 올린다.

## 검증

```bash
npm run harness
```

브랜치 이름과 기준 ref/HEAD의 공통 조상 이후 커밋을 검사한다. 기본 기준은 `origin/main`이며 실제 PR 대상은 `npm run harness -- --base <ref>`로 지정한다. 이는 FC-01의 base 정책을 확정하지 않는다. 기준 ref 누락·얕은 이력은 실패, 빌드 생략·새 커밋 없음은 일부 검사(종료 코드 2)다.

타입·50자 제한·한국어 포함·🔀 타입의 이슈 번호는 자동 검사한다. 명령형, 이슈의 실제 존재, 변경 범위, 사람 승인과 PR 본문은 리뷰에서 확인한다. PR 제목도 위 커밋 형식과 이슈 번호를 따른다.
