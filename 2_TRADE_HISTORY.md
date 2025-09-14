# 거래 검색 화면 요약 (2025-08-24)

이 문서는 PCWeb의 “거래 검색” 화면(TradeSearchPage)의 기능, 요청/응답 파라미터, 필터링, 페이징 동작을 정리합니다.

대상 파일: `pcweb/src/components/TradeSearchPage.tsx`

---

## 화면 개요

- 상단 필터
  - 도도부현(pref) 선택 → 시/구/정/촌(city) 선택
  - 역 코드(station, 선택)
  - 시작/종료 연도 (startYear/endYear)
  - 가격 구분(01: 取引価格, 02: 成約価格)
- 검색 버튼 클릭 시 서버 목록 API 호출 → 결과 테이블 표시
- 페이지당 개수 변경, 페이지 이동 지원
- 결과 상단에 서버 `source` 뱃지 표시(DB/MLIT/SERVICE=\*)
- 표 하단 페이지네이션 제공
- 각 행 클릭 시 상세 모달(모든 필드 키/값 렌더링)

## 서버 API

- 목록: `/api/mlit/prices/list`
  - Query parameters
    - area, city, station
    - startYear, endYear: 숫자 범위 (클라이언트에서 유효 범위 정규화하여 전달)
    - priceClassification: 01/02 중 선택(없으면 전체)
    - quarter/prefecture/municipality/districtName: 클라이언트 필터를 서버로도 전달하여 페이지네이션 정합성 확보
    - page, size: 페이징
  - Response(ListResponse)
    - status, source, page, size, total, items[]
    - items 필수 필드: id, year, quarter, prefecture, municipality, districtName, priceClassification/Label
- 파셋: `/api/mlit/prices/facets`
  - Query parameters
    - area, city, station
    - startYear, endYear
    - priceClassification
  - Response
    - years[], quarters[], prefectures[], municipalities[], districts[]
- 상세: `/api/mlit/prices/detail/{id}`

주의: 실제 백엔드 구현은 `MlitPriceSearchController`와 `MlitPriceQueryService`에서 처리하며, DB 스키마(mlit_price_record 등) 기반입니다.

## 클라이언트 동작

- Pref 변경 시 city 옵션 재조정(선택 무효화 방지)
- 검색 실행 시 fetchList()
  - 전달 파라미터 구성 시 연도 범위 정규화(min/max) 적용
  - 리스트 수준 필터(fYear/fQuarter/fPrefecture/fMunicipality/fDistrict/fPriceClass) 사용 시 page=0 초기화
- Facet 재계산(fetchFacets)
  - 상단 스코프 변경(pref/city/station/연도범위/가격구분)에 반응
  - 각 facet 세트 정렬 후 상태 반영
- 렌더링
  - 총 건수/소스/표시건수·필터 UI 노출
  - 테이블: 연도/분기/현/시구정촌/District/가격구분
  - 상세 모달: LABELS 매핑으로 한국어 라벨 노출, 값은 JSON.stringify로 간단 표현

## 사전/설정 사항

- 백엔드 서버 실행 필요(8080)
- 프론트 Dev 서버 실행 필요(5173/5174)
- `/api/mlit/municipalities-grouped` 엔드포인트로 행정구역 캐시 로드 필요(초기 1회)

## 최근 변경점 요약

- 리스트 레벨 필터 분리: 요청 파라미터에 quarter 등 세부 필터를 선택적으로 포함시켜 서버 페이징 정합성 보완
- 가격 구분 라벨 정규화: `priceClassificationLabel`가 없을 때 클라이언트에서 01→ 取引価格, 02→ 成約価格 표시
- Facet 정렬 및 UX 개선: 로딩 인디케이터, 필터 초기화 버튼 추가

## 향후 개선 아이디어

- 상세 모달의 주요 수치(거래가/단가/면적 등)를 테이블 상단에 요약카드로 재구성
- CSV/Excel 내보내기
- URL 쿼리 동기화(필터 공유)
