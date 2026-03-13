# 에셋 파이프라인

## 목적
- 이미지 파일만 폴더에 넣으면 앱에서 바로 사용할 수 있게 준비합니다.
- `app/scripts/assets-pipeline.mjs`가 경로 맵 생성 + 최적화 파일 생성을 담당합니다.

## 기본 동작
- `npm run dev --workspace app` 또는 루트에서 `npm run dev` 실행 시 파이프라인 감시 모드가 같이 실행됩니다.
- 개발 서버 실행 중 이미지 파일을 추가/교체하면 파이프라인이 자동 재실행되어 반영됩니다.
- 생성 결과:
  - 최적화 이미지: `app/public/assets/generated/...`
  - 경로 맵: `app/src/generated/asset-pipeline-map.json`

## 이미지 넣는 위치
- 화분: `app/public/assets/pots`
- 식물: `app/public/assets/plants/flower`, `app/public/assets/plants/foliage plant`, `app/public/assets/plants/fleshy plant`
- 홈 새싹 4단계: `app/public/assets/ui/sprout`

## 파일명 규칙 권장
- 식물은 가능한 `plant_종ID.png` 또는 한글 식물명 파일명 사용.
- 화분은 가능한 `pot_clay`, `pot_white`, `pot_yellow`, `pot_green`, `pot_silver/sliver` 계열 파일명 사용.
- 홈 새싹은 `stage_1.png` ~ `stage_4.png` 권장.

## 수동 실행
- 1회 동기화: `npm run assets:sync --workspace app`
- 감시 모드: `npm run assets:watch --workspace app`

## 비고
- 현재 환경에서 `cwebp`가 없으면 PNG 최적화본만 생성됩니다.
- `cwebp` 설치 후 자동으로 WebP까지 생성/사용됩니다.
