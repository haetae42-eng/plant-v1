# 다른 AI에게 전달할 프롬프트 (복붙용)

아래를 그대로 붙여넣으면 현재 개발 맥락을 빠르게 이어갈 수 있습니다.

```text
프로젝트 경로: /Users/bagtaejun/Documents/haetae/new
현재 날짜 기준 문맥: 2026-03-10

이 프로젝트는 Phaser3 + TypeScript 기반 모바일 세로형 식물 방치 게임이다.
먼저 아래 문서를 읽고 현재 상태를 이해한 뒤 작업을 시작해라:
1) /Users/bagtaejun/Documents/haetae/new/docs/AI_HANDOFF.md
2) /Users/bagtaejun/Documents/haetae/new/docs/AI_WORKLOG_2026-03.md
3) /Users/bagtaejun/Documents/haetae/new/docs/AI_TASK_BOARD.md
4) /Users/bagtaejun/Documents/haetae/new/docs/DECISIONS.md
5) /Users/bagtaejun/Documents/haetae/new/docs/KNOWN_ISSUES.md
6) /Users/bagtaejun/Documents/haetae/new/docs/RUNBOOK.md

추가 참고 스펙:
- /Users/bagtaejun/Documents/haetae/new/docs/garden-tab-fixed-spec-ko.md

현재 핵심 구현 파일은 다음이다:
- /Users/bagtaejun/Documents/haetae/new/app/src/scenes/GardenGameScene.ts
- /Users/bagtaejun/Documents/haetae/new/app/src/domain/types.ts
- /Users/bagtaejun/Documents/haetae/new/app/src/domain/defaultSave.ts

개발 규칙:
- 기존 사용자 의사결정(DECISIONS.md)을 우선 준수한다.
- 정원 탭은 카툰 모드 고정이며, 도감 세트보상 루프를 깨지 말 것.
- 기능 변경 시 관련 문서(AI_HANDOFF.md, AI_TASK_BOARD.md, DECISIONS.md, KNOWN_ISSUES.md)도 같이 업데이트한다.
- 작업 후 최소한 typecheck 또는 build를 수행해 결과를 남긴다.

우선순위:
1) AI_TASK_BOARD.md 의 IN_PROGRESS/NEXT 항목 중 최상단부터 처리
2) 터치성/편집 안정성 회귀 테스트
3) 에셋 파이프라인 스타일 혼입 이슈 정리

작업 시작 전에:
- 현재 서버 상태를 확인하고(5174), 필요시 실행한다.
- 구현 전 관련 함수 검색(rg)으로 기존 플로우를 파악한다.

작업 완료 시 보고 형식:
- 변경 파일 목록
- 사용자 체감 변경점
- 테스트 실행 결과
- 남은 리스크/다음 작업 1~3개
```
