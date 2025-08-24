## 목표

municipalities_ja.json 파일 기반의 행정구역 캐시를 파일이 아닌 Postgres(+PostGIS)에 영속화하고, 이후 조회에 대한 캐싱 구조(애플리케이션/DB 레벨)를 구성한다. 또한 최신 업데이트 일자를 보관하여 주기적 갱신 시점 판단에 활용한다.

## 현 진행 상태(2025-08-24)

- DB(PostgreSQL 16 + PostGIS) 컨테이너 기동 및 스키마 생성 완료
- 서비스 동작 정책 반영:
  - 서버 기동 시 DB(prefecture, municipality)가 모두 비어있는 경우에만 XIT002 API 호출로 초기 적재 수행
  - 이후부터는 스케줄러로 매월 1일 새벽(기본 03:00 JST) 자동 갱신
  - prefecture 이름(일본어) 매핑을 사용해 name 컬럼 보강(upsert)

## 전제

- 현재 로컬에 최신 municipalities_ja.json 파일이 존재함: `backend/data/mlit/municipalities_ja.json`
- Spring Boot 백엔드 기준.
- 실제 실행은 여기서 하지 않고, 구체적인 작업 순서만 문서화한다.

---

## 1) DB 설치/준비

1. Postgres + PostGIS 설치
   - macOS (Homebrew):
     - brew install postgresql@16 postgis
     - initdb 및 pg_ctl 로컬 클러스터 생성/기동 (또는 docker-compose 사용)
   - Docker (권장):
     - docker run -d --name realestate-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=realestate -p 5432:5432 postgis/postgis:16-3.4
2. 접속 확인
   - psql -h localhost -U postgres -d realestate
3. 애플리케이션용 DB/계정 분리(옵션)
   - CREATE ROLE realestate_user WITH LOGIN PASSWORD '...';
   - GRANT CONNECT ON DATABASE realestate TO realestate_user;
   - 필요 시 전용 스키마 생성: CREATE SCHEMA realestate AUTHORIZATION realestate_user;

## 2) 스키마 설계

municipalities_ja.json 구조: "도도부현 코드(2자리)" → [ { id(5자리), name(문자열) }, ... ]

권장 테이블 구조 (정규화 + 인덱스):

- prefecture (도도부현)
  - code CHAR(2) PK
  - name TEXT NULL
    - 비고: JSON에는 상위 명칭이 없으므로 보강 필요. 현재 임포터에서 일본어 명칭을 내장 매핑으로 upsert하여 채움(2025-08-24 반영). 향후 다국어(name_ko, name_en 등) 확장 또는 별도 참조 테이블로 리팩터 가능.
  - updated_at TIMESTAMPTZ NOT NULL (레코드 갱신 시각)
- municipality (시/구/정/촌)
  - id CHAR(5) PK
  - name TEXT NOT NULL
  - prefecture_code CHAR(2) NOT NULL REFERENCES prefecture(code) ON UPDATE CASCADE ON DELETE CASCADE
  - geom GEOMETRY(Point, 4326) NULL (옵션: 향후 공간 검색 대비)
  - updated_at TIMESTAMPTZ NOT NULL

인덱스:

- municipality(prefecture_code)
- municipality USING GIST(geom) (PostGIS 설치 시, 추후 공간쿼리 예정일 경우)

최신 업데이트 메타 테이블:

- mlit_cache_meta
  - key TEXT PRIMARY KEY (예: 'municipalities_ja')
  - last_refreshed TIMESTAMPTZ NOT NULL
  - source TEXT NULL (예: 'XIT002 ja')

DDL 예시(실행은 나중에):

```
CREATE TABLE IF NOT EXISTS prefecture (
  code CHAR(2) PRIMARY KEY,
  name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS municipality (
  id CHAR(5) PRIMARY KEY,
  name TEXT NOT NULL,
  prefecture_code CHAR(2) NOT NULL REFERENCES prefecture(code) ON UPDATE CASCADE ON DELETE CASCADE,
  geom geometry(Point, 4326),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_municipality_pref ON municipality(prefecture_code);

CREATE TABLE IF NOT EXISTS mlit_cache_meta (
  key TEXT PRIMARY KEY,
  last_refreshed TIMESTAMPTZ NOT NULL,
  source TEXT
);
```

## 3) Spring 설정

1. application.properties (또는 secrets.properties) 연결
   - spring.datasource.url=jdbc:postgresql://localhost:5432/realestate
   - spring.datasource.username=realestate_user (또는 postgres)
   - spring.datasource.password=...
   - spring.jpa.hibernate.ddl-auto=validate (초기엔 update 사용 가능하나 운영은 validate 권장)
   - spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
   - (선택) spring.flyway.enabled=true (환경 호환 버전으로 운영 적용)
   - 스케줄러/동기화 설정(예):
     - mlit.sync.cron=0 0 3 1 \* \* (매월 1일 03:00 JST)
     - mlit.sync.language=ja
2. 의존성
   - PostgreSQL 드라이버: org.postgresql:postgresql
   - JPA: spring-boot-starter-data-jpa
   - PostGIS(선택): org.hibernate:hibernate-spatial
3. 마이그레이션 도구 권장
   - Flyway or Liquibase로 위 DDL을 관리 (src/main/resources/db/migration/V1\_\_init.sql 등).

## 4) 초기 적재 및 정기 갱신

1. 서버 기동 시 초기 적재(1회성)

- 조건: prefecture, municipality 두 테이블 모두 건수가 0인 경우에만 실행
- 동작: XIT002 API를 prefecture 01~47까지 호출하여 DB upsert
- 보강: prefecture 일본어명 매핑 적용(name upsert)
- 메타: mlit_cache_meta(key='municipalities_ja', last_refreshed=now(), source='XIT002 {language}')

2. 월 1회 스케줄 갱신

- cron: 기본 0 0 3 1 \* \* (JST). 설정 파일에서 변경 가능
- 동작: XIT002 API 전체를 다시 조회 후 upsert (차등 갱신은 추후 최적화 가능)
- 보강/메타: 초기 적재와 동일

3. 성능 고려

- batch upsert 또는 jdbcTemplate batchUpdate
- API 호출 간 소폭 sleep으로 속도 제한 배려

## 5) 조회 API/캐싱 전략

1. API 설계
   - GET /api/mlit/municipalities?pref={code}
     - DB에서 municipality WHERE prefecture_code=? ORDER BY id ASC
     - 응답: { status: 'ok', data: [ {id,name}, ... ] }
   - GET /api/mlit/prefectures
     - prefecture 목록 제공 (name 보강 시 함께 반환)
2. 애플리케이션 캐시
   - Caffeine 또는 Spring Cache 사용
   - 캐시키: prefecture_code
   - TTL: 예) 24h 또는 mlit_cache_meta.last_refreshed 기반 무효화
3. DB 캐시/인덱스
   - municipality(prefecture_code) 인덱스로 빠른 필터링 보장
   - (선택) 자주 쓰는 조합에 Materialized View 구성

## 6) 갱신 정책

1. 갱신 트리거
   - 수동: /api/admin/mlit-cache/refresh 호출 시 DB 재적재
   - 자동: 스케줄러(예: 매주 일요일 새벽)로 XIT002 호출 후 DB 업서트
2. 차등 갱신
   - pref 단위 비교 후, 변경된 pref만 부분 업서트
3. 최신성 판단
   - mlit_cache_meta.last_refreshed 비교
   - API 실패/타임아웃 시 기존 데이터 유지

## 7) 마이그레이션 실행 순서(로컬)

1. Postgres(+PostGIS) 컨테이너 기동 또는 로컬 설치 완료
2. DB, 사용자, 스키마 준비
3. Flyway/Liquibase로 스키마 생성 실행
4. Spring Boot datasource 설정 적용
5. 서버 기동 시 DB가 비어있다면 자동 초기 적재(파일 임포트 없이 API 호출)
6. 월 1회 스케줄 갱신 자동화
7. 프론트/백엔드가 DB 기반 조회 API로 동작하도록 전환

## 8) 롤백/백업

1. 마이그레이션 전 DB 덤프: pg_dump -Fc -h localhost -U postgres -d realestate -f backup.dump
2. 문제 발생 시 restore: pg_restore -c -d realestate -h localhost -U postgres backup.dump

## 9) 추후 과제

- prefecture 이름 소스 확정 및 보강 로직 반영
- 공간 정보(geom) 채우기: MLIT 다른 API 또는 외부 데이터셋으로 중심점/경계 수집
- XIT001 등 다른 API 결과에 대해서도 결과 캐싱/히스토리 테이블 설계 검토

---

## 부록) 운영 메모

- 파일 기반 임시 임포트는 실제 서비스에서 사용하지 않음. 모든 적재/갱신은 XIT002 API를 통해 수행.
- cron, language 등은 설정 파일로 관리하여 환경별 조정 가능.

---

## 추가: XIT001(거래가격) 결과 저장 구조와 테스트

MLIT 거래가격(XIT001) 응답을 DB에 저장하는 테이블과 인제스트 로직을 추가했습니다.

- 테이블 개요
  - mlit_price_query_log: 요청 파라미터와 결과 요약, 원본 JSON 저장
  - mlit_price_record: 개별 거래 레코드 저장 (숫자형 파싱 필드 포함)

스키마(요약):

- mlit_price_query_log(
  id BIGSERIAL PK,
  area VARCHAR(4), city VARCHAR(8), station VARCHAR(16), year VARCHAR(8),
  price_classification VARCHAR(4), quarter VARCHAR(4), language VARCHAR(8),
  requested_at TIMESTAMPTZ DEFAULT now(), status TEXT, record_count INT, raw_json JSONB
  )
- mlit_price_record(
  id BIGSERIAL PK, query_id BIGINT FK → mlit_price_query_log(id) ON DELETE CASCADE,
  municipality_code, prefecture, municipality, district_name, price_category, type, region,
  trade_price_int BIGINT, price_per_unit_int BIGINT, unit_price_int BIGINT,
  floor_plan, area_num NUMERIC, land_shape, frontage, total_floor_area_num NUMERIC,
  building_year, structure, use, purpose, direction, classification, breadth,
  city_planning, coverage_ratio, floor_area_ratio, period, renovation, remarks,
  created_at TIMESTAMPTZ DEFAULT now()
  )

엔드포인트 연동:

- GET /api/mlit/prices 호출 시 응답을 그대로 반환하면서 DB에 동시에 저장합니다.
- 저장 결과는 응답 헤더로 확인 가능:
  - X-MLIT-Ingest-Query-Id, X-MLIT-Ingest-Count, X-MLIT-Ingest-Status

테스트 예시:

- 요청: http://127.0.0.1:8080/api/mlit/prices?city=13219&year=2024&priceClassification=02&quarter=2&language=ja
- 확인 쿼리:
  - SELECT id, area, city, year, price_classification, quarter, language, status, record_count FROM mlit_price_query_log ORDER BY id DESC LIMIT 3;
  - SELECT COUNT(\*) FROM mlit_price_record WHERE query_id = <위 id>;

메모:

- 동일 파라미터 중복 호출 시 중복 저장됩니다(후속 dedup/머지 정책은 별도 설계 필요).

### 가격 API 사용 정책(분할 수집)

- area(도도부현)만 전달된 경우, 해당 도도부현에 속한 모든 시구정촌 목록을 DB에서 조회한 뒤,
  각 시구정촌별로 quarter=1..4를 나눠 총 4회씩 XIT001을 호출하여 결과를 DB에 저장하고, 응답은 모두 합쳐서 반환합니다.
- city 또는 station이 명시된 경우에는 기존과 동일하게 단일 호출 + 저장을 수행합니다.
