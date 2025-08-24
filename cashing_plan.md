# 부동산 거래 데이터 수집 · DB 설계 · 운영 계획

## 0. 시작 전 공통 (요건 · 계약 · 보안)
- 데이터 계약: XIT002/XPT001 응답 스키마, 필드 정의서, 단위/좌표계(WGS84), Null 규칙.
- 쿼터/레이트리밋: 초/분/시간당 요청 상한, 동시성, 재시도 정책(백오프+jitter).
- 비밀 관리: .env → Vault/Parameter Store, 키 로테이션 계획.
- 로깅/모니터링: 수집 성공률, 지연, 실패 이유, 경고 임계치(Slack/Pager).

---

## 1. 저장용 DB 설계 및 구축
**권장:** 트랜잭션 + 지오 쿼리 → Postgres(+PostGIS) + Redis 캐시(72h)

- 스키마 (핵심)
  - `prefectures(pref_code PK, name_ja, …)`
  - `municipalities(city_id PK, pref_code FK, name_ja, name_ko, is_ward, geom(point/centroid), geohash7, UNIQUE(pref_code, name_ja))`
  - `transactions(tx_id BIGSERIAL PK, provider_tx_id UNIQUE, city_id FK, year SMALLINT, quarter SMALLINT, trade_date, price, price_per_m2, floor_area, build_year, lat, lon, geog GEOGRAPHY(Point), raw_json JSONB, valid_from, valid_to, is_current)`
  - `ingest_jobs(job_id PK, year, quarter, city_id, status, started_at, finished_at, try_count, error_text)`
  - `ingest_batches(batch_id PK, job_id FK, page, status, …)` (페이지네이션 대비)
- 인덱스/파티셔닝
  - 파티션: `transactions`를 `year` 또는 `year,quarter`로 RANGE 파티션.
  - 인덱스: `city_id,year,quarter`, `GIST(geog)`, `btree(provider_tx_id)`, `btree(geohash7)`.
- 정합성/증분
  - SCD2 또는 upsert: `provider_tx_id + quarter`를 자연키로 `ON CONFLICT DO UPDATE`.
- 마이그레이션
  - DDL 관리: Flyway/Prisma/Liquibase. 스테이징→본번 이관.

---

## 2. XIT002?area=13 시구정촌 코드 취득
- 클라이언트
  - 타임아웃/재시도(지수 백오프, 최대 N회), 429/5xx 처리, ETag/If-None-Match 활용 가능 시 사용.
- 검증/시드
  - 응답 검증, 도쿄 23구 개수 확인.
  - 제공된 JSON을 시드 마스터로 사용하고, API 값과 diff 알림.
- 적재
  - `municipalities` upsert (이름 변경 대응), 삭제 코드는 소프트 삭제.

---

## 3. 23구 × 4분기 = 92회 요청 (큐 + 레이트리밋)
- 작업 큐
  - `jobs`: (year, quarter, city_id)를 키로 생성.
  - 워커 풀 동시성, 토큰 버킷 방식 적용.
- 요청 단위
  - 페이지네이션/커서 대응, GZip/HTTP2 사용.
- 장애 대응
  - 429/5xx 시 재시도, DLQ 분리, 초과 시 알림.
- 메트릭
  - 요청 수, 성공률, p95 지연, 에러 코드 분포.

---

## 4. 응답 처리 → DB 적재 + 72h 캐시
- 스트리밍 처리
  - NDJSON/SSE 단위 처리, 부분 JSON 보정, UTF-8/압축 처리.
  - 스키마 검증, 단위 변환(㎡·엔).
- 적재 전략
  - 스테이징에 Bulk INSERT → UPSERT.
  - 자연키: `provider_tx_id` 또는 `(city_id, external_id, quarter)`.
- 증분 배치
  - 주 1회: JSONB hash로 변경 탐지, diff 업데이트, valid_to 갱신.
- 캐시
  - Redis 키: `v1:view:bbox:filters:year:quarter`, TTL=72h.
  - 증분 배치 완료 시 해당 키 무효화.
- 데이터 품질
  - 이상치 감지, 좌표 범위 검증, 경고 리포트.

---

## 5. 사용자 화면 (XPT001 기반 지도)
- 지도 미리보기
  - API: `GET /points?bbox&zoom&filters&year&quarter`.
  - DB: `ST_Intersects(geog, bbox)`, 줌 임계값 이하에서는 집계.
- 리스트/다운로드
  - 서버 페이징/정렬, CSV/Parquet 출력은 비동기 잡으로 실행 후 서명 URL 제공.
  - 최대 레코드 제한, 샘플 모드 제공.
- UX
  - CDN 캐시, ETag/If-Modified-Since.
  - 프리셋 검색, 빈 결과 시 메시지 처리.
- 국제화
  - 통화/단위 표준화, 한/일 병기.

---

## 6. 운영·거버넌스
- 백업/복구: 연도 단위 백업, PITR 지원.
- 보안: IP 제한, WAF, 입력 검증, 사용자별 쿼터.
- 라이선스/출처: 약관 기반 출처 표기, 가공 여부 표시.
- 테스트: 스키마 회귀 테스트, 카나리아 수집, 성능 시험.
- 비용: 인덱스/캐시 최적화.

---

## 구현 팁
- Idempotency: 요청 해시를 `jobs.request_key`로 저장.
- 정밀도: 금액 NUMERIC(14,0), 면적 NUMERIC(10,2).
- 지오 성능: GIST(geog) 인덱스 + geohash7.
- 캐시 키: 파라미터 순서·소수점 자릿수 정규화.
- 관측성: 도시×분기 단위 성공률/지연 모니터링.

