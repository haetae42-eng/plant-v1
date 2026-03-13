# AI 작업 보드

최종 업데이트: 2026-03-13

상태 기준:
- `DONE`: 구현 완료
- `IN_PROGRESS`: 구현 중/부분 완료
- `NEXT`: 다음 우선순위
- `BLOCKED`: 외부 의존

## 핵심 보드

| ID | 상태 | 작업 | 완료 조건 | 주요 파일 |
|---|---|---|---|---|
| G-001 | DONE | 정원 탭 카툰 고정 + 픽셀 경로 비활성 | 정원에서 픽셀 분기 없이 카툰 렌더만 사용 | `app/src/scenes/GardenGameScene.ts` |
| G-002 | DONE | 정원 2-3-2 계단형 배치 정리 | A/B/C열 슬롯 좌표 및 히트영역 정상 동작 | `app/src/scenes/GardenGameScene.ts` |
| G-003 | DONE | 슬롯 탭 기반 편집 모달 | 슬롯 탭 시 모달 오픈, 식물/화분 변경 후 저장 가능 | `app/src/scenes/GardenGameScene.ts` |
| G-004 | DONE | 장미(A2) 모달 렌더 오류 수정 | A2 편집 시 버튼/미리보기 정상 표시 | `app/src/scenes/GardenGameScene.ts` |
| G-005 | DONE | 정원 편집 터치 입력 안정화 | 식물/화분 `<`,`>` 버튼 터치 시 즉시 반응하고 값 변경 정상 | `app/src/scenes/GardenGameScene.ts` |
| G-006 | DONE | 저장 피드백 단순화 | 저장 성공은 `저장 완료`, 실패는 짧은 이유 문구만 표시 | `app/src/scenes/GardenGameScene.ts` |
| G-007 | DONE | 빈 슬롯 UX 보강 | 빈 슬롯에 상태별 가이드 문구/아이콘 표시 | `app/src/scenes/GardenGameScene.ts` |
| G-008 | DONE | 비우기 모드 도입 | 상단 `비우기` 토글 + 슬롯 탭 즉시 회수 동작 | `app/src/scenes/GardenGameScene.ts` |
| C-001 | DONE | 도감 카테고리 재편(꽃/식물/세트보상) | 세트보상 탭 포함, 페이지/카드 렌더 정상 | `app/src/scenes/GardenGameScene.ts` |
| C-002 | DONE | 세트보상 수령 기능 | 완성 세트 수령 시 코인+랜덤씨앗 지급 | `app/src/scenes/GardenGameScene.ts` |
| C-003 | DONE | 수령 가능 빨간점 표시 | 하단 도감 탭 + 세트 카드 버튼 우상단 표시 | `app/src/scenes/GardenGameScene.ts` |
| A-001 | DONE | 초반 7일 해금 보상 명확화 | 출석 카드/요약 영역에서 해금 보상 표시 및 지급 | `app/src/scenes/GardenGameScene.ts` |
| A-003 | DONE | 출석 해금 보상 명세 단일화 | 해금 문구를 실제 지급 필드(seed/gem/coin/pot/bg)에서만 생성 | `app/src/scenes/GardenGameScene.ts` |
| H-001 | DONE | 수확/개화 연출 강화 | 개화완료/수확 시 시각적 보상 연출 재생 | `app/src/scenes/GardenGameScene.ts` |
| G-010 | DONE | 정원 편집 회귀 점검 | 빌드/테스트 통과 + 주요 편집 흐름 동작 확인 | `app/src/scenes/GardenGameScene.ts` |
| G-013 | DONE | 정원 편집 저장 버튼 조건화 | 저장 가능할 때만 버튼 활성 + 불가 사유 표시 | `app/src/scenes/GardenGameScene.ts` |
| G-012 | DONE | 정원 편집 미세 UX | 비우기ON 시 회수 슬롯 강조(붉은 테두리/배지) + 안내 문구 간결화 | `app/src/scenes/GardenGameScene.ts` |
| A-002 | IN_PROGRESS | 출석 카드 해금 문구 가독성 개선 | 카드 내 해금 라벨/아이콘/보상 텍스트 겹침 제거 | `app/src/scenes/GardenGameScene.ts` |
| S-001 | DONE | 저장 안정성 강화 | 30초 주기 자동저장 + 탭 전환 즉시저장 + 복구 세이브 1개 유지 | `app/src/scenes/GardenGameScene.ts`, `app/src/services/saveRepository.ts` |
| S-002 | DONE | 플레이테스트용 세이브 분리/초기화 | 저장 키 `v2` 적용 + 테스트 강제 로직 제거 + 기본 발견 목록 초기화 | `app/src/domain/constants.ts`, `app/src/domain/defaultSave.ts`, `app/src/scenes/GardenGameScene.ts` |
| C-004 | DONE | 세트카드 필요 종 문구 명확화 | `필요 :` 전체 종 노출 + 3종/다음줄 포맷 고정 | `app/src/scenes/GardenGameScene.ts` |
| G-011 | NEXT | 정원 카툰 식물 아트 확장 | 우선 식물군(데이지/몬스테라 등) 카툰 통일 | `app/src/scenes/GardenGameScene.ts`, `app/public/assets/plants/*` |
| ASSET-001 | NEXT | 에셋 매핑 우선순위 조정 | 픽셀 파일이 일반 탭 기본 소스로 선택되지 않게 수정 | `app/scripts/assets-pipeline.mjs` |
| MON-001 | BLOCKED | 출석 보상형 광고 SDK 연동 | 광고 성공 콜백 기반 출석 지급 | `app/src/scenes/GardenGameScene.ts` |
| RELEASE-001 | DONE | 테스트 플래그 정리 | 테스트용 코인/해금 강제 로직 제거 및 플레이테스트 기본 상태 복구 | `app/src/scenes/GardenGameScene.ts`, `app/src/domain/defaultSave.ts` |

## 다음 스프린트 추천(짧게)
1. `G-011` 카툰 아트 확장
2. `ASSET-001`로 스타일 혼입 리스크 제거
3. `MON-001` + `RELEASE-001` 출시 준비
