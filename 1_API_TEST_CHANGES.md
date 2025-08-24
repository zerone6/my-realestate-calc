# API Test 변경 이력 (2025-08-24)

이 문서는 오늘 작업분 기준으로 API Test 영역(백엔드 컨트롤러 · PCWeb ApiTestPage)의 호출 파라미터, 동작 로직, 소스 표기(source) 정책 변경 사항을 정리합니다.

## 변경 대상 파일 목록

- backend
  - `backend/src/main/java/com/realestate/calc/controller/MlitApiTestController.java`
- pcweb
  - `pcweb/src/components/ApiTestPage.tsx`

참고: UI에서 사용하는 계산 폼은 `MultiStepInputForm.tsx`로 개편되었으며, 이번 문서의 범위는 API Test와 MLIT 가격 데이터 호출에 한합니다.

---

## 0) 연도 범위(startYear/endYear) 지원 추가

요구사항: API-TEST에서 연도를 범위로 지정해(startYear, endYear) 해당 구간의 모든 연도를 조회·병합하여 보여준다. priceClassification 미지정 시 01/02 각각 범위 조회 후 병합하며, 서비스 모드에서 한 해라도 MLIT 사용 시 최종 source는 SERVICE=MLIT로 표시한다.

- 프런트(UI)
  - ApiTestPage에 startYear/endYear 셀렉터 추가
  - 범위가 지정되면 year 파라미터는 생략하여 백엔드가 범위 처리 경로를 타도록 구성
  - Full URL 미리보기도 동일 규칙 적용
- 백엔드(컨트롤러)
  - `getPrices(..., startYear, endYear, ...)` 파라미터 이미 존재
  - city/area/station 케이스별로 연도 범위를 순회하며 연도별 DB 확인 → 필요 시 MLIT 폴백 후 병합 반환
  - priceClassification 미지정(01/02 병합)에도 연도 범위 병합을 그대로 적용
- source 표기 규칙(범위 전반)
  - 범위 내 한 해라도 MLIT을 사용했다면 최종 `source`는 `SERVICE=MLIT`
  - 전 연도가 DB로 충족되면 `SERVICE=DB`

## 1) 서비스 모드(source) 표기 정책 정정

요구사항

- mode=service일 때 최종 응답의 `source`는 실제 조회 출처를 표시해야 함.
  - DB만 사용한 경우: `SERVICE=DB`
  - 처리 중 한 번이라도 MLIT 호출이 있었다면: `SERVICE=MLIT`
- priceClassification 미지정 시 01/02를 각각 조회·결합할 때도 위 원칙 동일 적용.

핵심 변경점 (MlitApiTestController)

- SERVICE 모드에서 DB 백필(backfill)만 수행하고 최종 JSON을 DB에서 렌더링하더라도, 처리 과정 중 MLIT을 사용했다면 `source`를 `SERVICE=MLIT`로 설정.
- boolean 플래그 기반의 사용 여부 추적:
  - `ensureCityQuarterForRange(...)` → boolean 반환(MLIT 사용 여부)
  - `ensureCityCompletenessForYear(...)` → boolean 반환(MLIT 사용 여부)
- 최종 바디에 일괄 반영:
  - `setServiceSource(body, usedMlit)`로 `SERVICE=MLIT` 또는 `SERVICE=DB` 지정
- 01/02 통합 경로:
  - 서브 응답의 `source`를 검사(`detectSubSource`)하여 하나라도 MLIT이면 `SERVICE=MLIT`로 지정
- 단일 연도/분기 케이스:
  - DB 히트 시 `rewriteServiceSourceBody(...)`로 `DB→SERVICE=DB`, `MLIT→SERVICE=MLIT` 재기입

관련 메서드 요약

- `detectSubSource(String body)`: 하위 응답의 source에서 DB/MLIT 판단
- `rewriteServiceSourceBody(String raw)`: 기존 source 값을 SERVICE=DB/MLIT로 변환
- `setServiceSource(String raw, boolean usedMlit)`: 처리 중 MLIT 사용 여부에 따라 최종 source 강제 지정

에러 처리/견고성

- JSON 파싱 실패 시 문자열 치환 fall-back을 두어 `source` 태그가 일관되게 설정되도록 처리

---

## 2) API Test Page 파라미터/동작 정리

대상 파일: `pcweb/src/components/ApiTestPage.tsx`

입력 파라미터(UI)

- API 선택: XIT001(가격 API), XIT002(행정구역 목록, 준비중)
- area(현, 2자리) / city(시구정촌, 5자리)
- station(선택, 6자리 역코드)
- year, priceClassification(01/02), quarter, language
- mode(service|mlit|db)

요청 구성

- `callApi()`에서 URLSearchParams로 필요한 값만 append
- endpoint: `/api/mlit/prices`
- 응답 텍스트 표시와 함께 상단에 `source` 뱃지 노출 (JSON parse 성공 시)
- `buildFullUrl()`으로 실제 요청 URL 미리보기 제공

서비스 모드 동작 확인 포인트

- priceClassification 미지정 시 컨트롤러 내부에서 01/02를 병합
- 병합 결과 또는 연도/분기 범위에서 일부라도 MLIT을 썼다면 `source: SERVICE=MLIT`
- 전 구간 DB로 충족되면 `source: SERVICE=DB`

사전/설정 사항

- 백엔드가 8080에서 기동 중이어야 함(현재 VS Code Task로 구동 가능)
- 프런트는 Vite dev 서버(5173/5174 등)에서 동작; 프록시/상대경로(`/api/...`)로 백엔드 접근

---

## 3) 기타 정리 및 품질 게이트

- 컴파일/린트
  - 백엔드: Spring Boot 빌드/기동 확인, 컨트롤러 컴파일 완료
  - 프런트: ApiTestPage 범위 기능 추가 후 조건식/URL 빌더 정리로 ESLint 경고 해결
- 주의사항
  - MLIT 호출은 외부 네트워크 의존; 서비스 모드에서는 DB 백필이 진행될 수 있음
  - DB 스키마는 MLIT 거래가격 레코드 저장 구조가 필요함(별도 문서 1_CASHING_EXEC.md 참고)
