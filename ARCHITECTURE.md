# 부동산 계산기 마이크로서비스 아키텍처

## 아키텍처 개요

### 3-Tier 마이크로서비스 구조

```
[외부 요청 :80]
       ↓
[API Gateway - Nginx]
       ├─→ /realestate/ → [Frontend Service]
       └─→ /api/        → [Backend Service]
                               ↓
                         [PostgreSQL DB]
```

## 서비스 구성

### 1. **API Gateway** (독립 컨테이너)
- **역할**: 단일 진입점, 라우팅 전담
- **이미지**: `ghcr.io/homegroup/my-realestate-calc/gateway:latest`
- **포트**: 80 (외부 노출)
- **책임**:
  - 요청 라우팅
  - 로드 밸런싱 준비
  - 향후 인증/권한 처리
  - Rate limiting 가능

**라우팅 규칙**:
```
/realestate/  → Frontend Service (정적 파일)
/api/         → Backend Service (REST API)
/health       → Gateway 헬스체크
```

### 2. **Frontend Service** (정적 파일 서빙)
- **역할**: React 애플리케이션 정적 파일만 서빙
- **이미지**: `ghcr.io/homegroup/my-realestate-calc/frontend:latest`
- **포트**: 80 (내부 네트워크만)
- **책임**:
  - Vite 빌드된 정적 파일 서빙
  - SPA 라우팅 (try_files)
  - 정적 자산 캐싱

**중요**:
- API 프록시 없음 (Gateway가 담당)
- Backend 위치를 몰라도 됨
- 독립적으로 스케일 가능

### 3. **Backend Service** (API 전담)
- **역할**: REST API 제공
- **이미지**: `ghcr.io/homegroup/my-realestate-calc/backend:latest`
- **포트**: 8080 (내부 네트워크만)
- **책임**:
  - 비즈니스 로직
  - 데이터베이스 연동
  - API 엔드포인트 제공

**중요**:
- Frontend를 알 필요 없음
- 독립적으로 스케일 가능
- 데이터베이스만 의존

## 마이크로서비스 원칙

### ✅ 관심사의 분리 (Separation of Concerns)
- **Gateway**: 라우팅만
- **Frontend**: 정적 파일만
- **Backend**: API만

### ✅ 독립 배포 (Independent Deployment)
각 서비스는 독립적으로:
- 빌드
- 배포
- 스케일링
- 롤백

### ✅ Loose Coupling
- Frontend는 Backend 위치를 모름
- Backend는 Frontend 존재를 모름
- Gateway만 라우팅 정보 보유

### ✅ 확장성 (Scalability)
```bash
# Frontend만 스케일
docker-compose -f docker-compose.prod.yml up -d --scale frontend=3

# Backend만 스케일
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

## 컨테이너 네트워크

### 내부 네트워크 (app-network)
```
gateway:80 (외부 노출)
  ↓
frontend:80 (내부만)
backend:8080 (내부만)
```

**보안**:
- Frontend, Backend는 외부에서 직접 접근 불가
- 모든 요청은 Gateway를 통해서만 가능

## 데이터 흐름

### 1. 정적 파일 요청
```
사용자 → Gateway:80/realestate/
       → Frontend:80/
       → HTML/JS/CSS 응답
```

### 2. API 요청
```
브라우저 → Gateway:80/api/calculation
         → Backend:8080/api/calculation
         → PostgreSQL 조회
         → JSON 응답
```

## 배포 전략

### GHCR 이미지 저장소
각 서비스는 독립적인 이미지:
```
ghcr.io/homegroup/my-realestate-calc/gateway:latest
ghcr.io/homegroup/my-realestate-calc/frontend:latest
ghcr.io/homegroup/my-realestate-calc/backend:latest
```

### CI/CD 파이프라인
GitHub Actions가 3개 이미지를 병렬 빌드:
1. `build-and-push-gateway`
2. `build-and-push-frontend`
3. `build-and-push-backend`

### 롤링 업데이트
```bash
# 특정 서비스만 업데이트
docker pull ghcr.io/homegroup/my-realestate-calc/frontend:latest
docker-compose -f docker-compose.prod.yml up -d frontend
```

## 모니터링

### Health Checks
각 서비스는 독립적인 헬스체크:
```
Gateway:   http://localhost/health
Frontend:  http://frontend:80/
Backend:   http://backend:8080/api/health
```

### 로그 확인
```bash
# 개별 서비스 로그
docker logs realestate-gateway
docker logs realestate-frontend
docker logs realestate-backend

# 전체 로그
docker-compose -f docker-compose.prod.yml logs -f
```

## 이전 구조와의 비교

### ❌ 이전 구조 (모놀리식)
```
[Frontend Container]
  ├─ Nginx (정적 파일 + API 프록시)
  └─ Backend로 프록시
```
**문제점**:
- Frontend가 Backend 위치 알아야 함
- Tight coupling
- 스케일링 시 nginx 설정 복제

### ✅ 현재 구조 (마이크로서비스)
```
[Gateway] → [Frontend] (정적 파일만)
          → [Backend] (API만)
```
**장점**:
- 독립적 스케일링
- Loose coupling
- 중앙 집중식 라우팅 관리

## 향후 확장 가능성

### 1. 서비스 추가
```
[Gateway]
  ├─→ /realestate/  → Frontend
  ├─→ /api/         → Backend
  ├─→ /admin/       → Admin Service (새로 추가)
  └─→ /mobile-api/  → Mobile API Service (새로 추가)
```

### 2. 로드 밸런싱
```nginx
upstream backend {
    server backend-1:8080;
    server backend-2:8080;
    server backend-3:8080;
}
```

### 3. API 버저닝
```
/api/v1/  → Backend v1
/api/v2/  → Backend v2 (새 버전)
```

### 4. 인증 레이어
Gateway에 JWT 검증 추가:
```nginx
location /api/ {
    auth_request /auth;
    proxy_pass http://backend/api/;
}
```

## 요약

이 아키텍처는 진정한 **마이크로서비스** 원칙을 따릅니다:

1. **독립성**: 각 서비스는 독립적으로 동작
2. **확장성**: 개별 서비스 스케일링 가능
3. **유지보수**: 한 서비스 변경이 다른 서비스에 영향 없음
4. **단일 책임**: 각 서비스는 하나의 역할만 수행
