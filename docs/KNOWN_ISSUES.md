# 알려진 이슈 / 기술 부채

최종 업데이트: 2026-03-13

## 1) 출석 광고 SDK 미연동 (출시 전 필수)
- 상태: `OPEN`
- 위치: `app/src/scenes/GardenGameScene.ts` (`requestAttendanceRewardAdThenClaim`)
- 내용:
  - 현재는 광고 성공 콜백 대신 즉시 `claimAttendanceReward()` 호출
- 대응:
  - SDK 연동 후 성공 콜백에서만 지급

## 2) 테스트 플래그/테스트 세이브 분리
- 상태: `CLOSED`
- 위치:
  - `app/src/scenes/GardenGameScene.ts`
  - `app/src/domain/defaultSave.ts`
  - `app/src/domain/constants.ts`
- 내용:
  - 테스트 강제 코인/해금 플래그 제거
  - 임시 발견 강제(히아신스) 제거
  - 저장 키 `haetae.idle-garden.save.v2`로 분리해 기존 테스트 세이브 비적용
- 영향:
  - 플레이 테스트에서 실제 초반 경제/해금 흐름 검증 가능

## 3) 에셋 파이프라인 소스 규칙 단일화
- 상태: `CLOSED`
- 위치:
  - `app/scripts/assets-pipeline.mjs`
  - `app/src/generated/asset-pipeline-map.json`
- 내용:
  - `garden-hires` 의존 경로를 제거하고 `assets/plants/...` 단일 소스로 통일
  - 정원 탭과 도감 탭이 동일 식물 이미지 소스를 사용하도록 정리

## 4) 식물 메타 대비 실제 에셋 누락
- 상태: `OPEN`
- 위치:
  - 메타: `app/src/content/plants.ts`
  - 맵: `app/src/generated/asset-pipeline-map.json`
- 내용:
  - 식물 메타 61종 중 파이프라인 매칭 53종
  - 누락 8종은 런타임 활성 목록에서 제외됨
- 영향:
  - 도감/세트 구성이 실제 의도와 달라질 수 있음
- 대응:
  - 누락 에셋 보강 후 `assets:sync` 재생성

## 5) 메인 씬 단일 파일 과대화
- 상태: `OPEN`
- 위치: `app/src/scenes/GardenGameScene.ts` (~10k lines)
- 내용:
  - 홈/정원/도감/상점/출석/모달/UI/이펙트가 한 파일에 집중
- 영향:
  - 회귀 위험 증가, AI 인수인계 난이도 상승
- 대응:
  - 탭별 모듈 분리(`home`, `decorate`, `collection`, `attendance`, `shop`)
  - 렌더/상태/액션 레이어 분리

## 6) 기본 Vite 포트와 운영 포트 불일치
- 상태: `OPEN`
- 위치:
  - `app/vite.config.ts` 기본 `5173`
  - 운영 스크립트는 `5174`
- 영향:
  - 환경 전환 시 혼동 가능
- 대응:
  - 문서 기준 통일 또는 설정값 정합화

## 7) 비우기 모드 오조작 방지 UX 부족
- 상태: `OPEN`
- 위치: `app/src/scenes/GardenGameScene.ts` (`toggleDecorClearMode`, 슬롯 탭 회수 처리)
- 내용:
  - `비우기ON`에서 슬롯 탭 즉시 회수되며, 확인 모달/되돌리기 버튼이 없음
- 영향:
  - 빠른 회수는 가능하지만 실수 탭 시 복구 동선이 길어질 수 있음
- 대응:
  - 옵션 A: 1회 되돌리기(Undo) 토스트
  - 옵션 B: 연속 회수 전용 확인 토글(설정값)
