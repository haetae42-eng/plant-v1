# Haetae Idle Garden (HTML5)

Phaser 3 + TypeScript 기반의 세로형 시간 방치 식물 수집/정원 꾸미기 게임입니다.

## 워크스페이스 구조

- `app`: Phaser 3 클라이언트 (정원/도감/상점/설정)
- `shared`: 기존 공용 타입 패키지(유지)
- `functions`: 기존 Firebase Functions 패키지(유지)
- `docs`: 앱인토스 제출/QA/메타데이터 문서

## 앱 핵심 기능(v1)

- 정원 12슬롯(3x4), 씨앗 심기/성장/수확
- 식물 12종 수집 도감
- 화분 9종, 배경 4종 코스메틱 해금
- 오프라인 진행 최대 8시간 누적
- 기기 시간 역행 시 오프라인 진행 차단
- 로컬 저장 자동(디바운스) + 수동 저장

## 빠른 시작

1. 의존성 설치

```bash
npm install
```

2. 개발 서버 실행

```bash
npm run dev --workspace app
```

3. 타입 검사

```bash
npm run typecheck --workspace app
```

4. 프로덕션 빌드

```bash
npm run build --workspace app
```

## 테스트

```bash
npm run test --workspace app
```

## 출시 관련 문서

- 앱인토스 제출 체크리스트: `/Users/bagtaejun/Documents/haetae/new/docs/appintos-submission-checklist.md`
- 스토어 메타데이터(국문): `/Users/bagtaejun/Documents/haetae/new/docs/store-metadata-ko.md`
- 회귀 QA 체크리스트: `/Users/bagtaejun/Documents/haetae/new/docs/qa-regression-checklist.md`
