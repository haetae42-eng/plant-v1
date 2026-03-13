# 실행 런북

프로젝트 경로: `/Users/bagtaejun/Documents/haetae/new`
기본 개발 포트: `5174`

## 1) 서버 실행/중지/상태

### 권장(프로젝트 제공 스크립트)
- 시작: `/Users/bagtaejun/Documents/haetae/new/start_server.command`
- 중지: `/Users/bagtaejun/Documents/haetae/new/stop_server.command`
- 상태: `/Users/bagtaejun/Documents/haetae/new/server_status.command`

### 터미널 직접 실행
```bash
cd /Users/bagtaejun/Documents/haetae/new
npm run dev --workspace app -- --host 0.0.0.0 --port 5174
```

### 포트 리스닝 확인
```bash
lsof -nP -iTCP:5174 -sTCP:LISTEN
```

## 2) 품질 체크 명령

```bash
cd /Users/bagtaejun/Documents/haetae/new
npm run typecheck --workspace app
npm run build --workspace app
npm run test --workspace app
```

## 3) 에셋 파이프라인

### 1회 동기화
```bash
cd /Users/bagtaejun/Documents/haetae/new
npm run assets:sync --workspace app
```

### 감시 모드
```bash
cd /Users/bagtaejun/Documents/haetae/new
npm run assets:watch --workspace app
```

### 결과 확인 파일
- 맵: `/Users/bagtaejun/Documents/haetae/new/app/src/generated/asset-pipeline-map.json`
- 최적화 이미지: `/Users/bagtaejun/Documents/haetae/new/app/public/assets/generated`

## 4) 주요 작업 진입점

- 메인 씬:
  - `/Users/bagtaejun/Documents/haetae/new/app/src/scenes/GardenGameScene.ts`
- 저장 스키마:
  - `/Users/bagtaejun/Documents/haetae/new/app/src/domain/types.ts`
  - `/Users/bagtaejun/Documents/haetae/new/app/src/domain/defaultSave.ts`
- 정원 스펙:
  - `/Users/bagtaejun/Documents/haetae/new/docs/garden-tab-fixed-spec-ko.md`

## 4-1) 정원 탭 빠른 운영 메모

- 기본:
  - 슬롯 탭 시 편집 모달 오픈
  - 모달에서 식물/화분 변경 후 `저장`
- 회수:
  - 정원 우상단 `비우기` 버튼으로 `비우기ON` 전환
  - 비울 슬롯 탭 시 즉시 회수
  - 다시 버튼 탭하면 `비우기`(OFF)

## 5) 디버깅 팁

### A. 변경이 반영되지 않는 경우
1. `assets:sync` 실행
2. 개발 서버 재시작
3. 브라우저 강력 새로고침

### B. 저장 데이터로 인해 화면이 이상한 경우
브라우저 `localStorage`의 `haetae.idle-garden.save.v2`를 삭제 후 재접속

### C. 편집 모달 이상 동작 확인
- 슬롯 탭 시 `openDecorSlotEditModal()` 진입 여부 확인
- `isOpeningDecorSlotEditModal` 가드 상태 확인
- A2(장미) 슬롯에서 렌더 예외 로그 확인

### D. 탭 활성화 색상 이상
- `renderNav()`에서 `activePrimaryTab` 계산/전달 확인

## 6) 배포 전 체크(필수)

1. 테스트 강제값 재유입 여부 점검(코인/해금 강제 코드 없음)
2. 출석 광고 SDK 실제 연동
3. QA 회귀 체크리스트 재수행
4. 빌드 경고/오류 0 확인

## 7) 새 AI 인수인계 시 전달 문서(6개)

1. `/Users/bagtaejun/Documents/haetae/new/docs/AI_HANDOFF.md`
2. `/Users/bagtaejun/Documents/haetae/new/docs/AI_WORKLOG_2026-03.md`
3. `/Users/bagtaejun/Documents/haetae/new/docs/AI_TASK_BOARD.md`
4. `/Users/bagtaejun/Documents/haetae/new/docs/DECISIONS.md`
5. `/Users/bagtaejun/Documents/haetae/new/docs/KNOWN_ISSUES.md`
6. `/Users/bagtaejun/Documents/haetae/new/docs/RUNBOOK.md`
