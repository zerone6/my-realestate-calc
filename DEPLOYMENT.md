# 부동산 계산기 배포 가이드

## 목차
1. [환경변수 설정](#환경변수-설정)
2. [로컬 개발 환경](#로컬-개발-환경)
3. [프로덕션 배포](#프로덕션-배포)
4. [GHCR 이미지 사용](#ghcr-이미지-사용)

---

## 환경변수 설정

### 1. .env 파일이란?

`.env` 파일은 환경변수를 관리하는 파일입니다. 민감한 정보(DB 비밀번호, API 키 등)를 코드에 하드코딩하지 않고 별도로 관리할 수 있습니다.

**장점:**
- 보안: 민감한 정보를 Git에 커밋하지 않음
- 환경별 설정: 개발/프로덕션 환경을 쉽게 전환
- 관리 용이: 한 곳에서 모든 설정 관리

### 2. .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성합니다:

```bash
cd /Users/seonpillhwang/GitHub/homegroup/my-realestate-calc
cp .env.example .env
nano .env  # 또는 vi, code 등 원하는 에디터 사용
```

### 3. .env 파일 내용 작성

#### 개발 서버용 (.env)
```env
# GitHub Repository
GITHUB_REPOSITORY=homegroup/my-realestate-calc

# Database Configuration (개발 서버)
DB_URL=jdbc:postgresql://192.168.50.88:5432/realestate
DB_USERNAME=realestate_user
DB_PASSWORD=dev_password_here

# Spring Profile
SPRING_PROFILES_ACTIVE=dev
```

#### 프로덕션 서버용 (.env)
```env
# GitHub Repository
GITHUB_REPOSITORY=homegroup/my-realestate-calc

# Database Configuration (프로덕션 서버)
DB_URL=jdbc:postgresql://192.168.50.100:5432/realestate
DB_USERNAME=realestate_user
DB_PASSWORD=strong_production_password

# Spring Profile
SPRING_PROFILES_ACTIVE=prod
```

### 4. 환경변수 설명

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `GITHUB_REPOSITORY` | GitHub 저장소 경로 | `homegroup/my-realestate-calc` |
| `DB_URL` | PostgreSQL 연결 URL | `jdbc:postgresql://localhost:5432/dbname` |
| `DB_USERNAME` | 데이터베이스 사용자명 | `postgres` 또는 `realestate_user` |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | `your_secure_password` |
| `SPRING_PROFILES_ACTIVE` | Spring Boot 프로파일 | `dev` 또는 `prod` |

---

## 로컬 개발 환경

### 기존 방식 (docker-compose.yml)
개발 서버에서는 기존 `docker-compose.yml` 사용:

```bash
# 로컬에서 빌드하고 실행
docker-compose up -d --build
```

이 방식은:
- 로컬에서 직접 코드를 빌드
- 개발 중인 코드 즉시 반영
- `.env` 파일 자동으로 읽음

---

## 프로덕션 배포

### GHCR 이미지 사용 방식 (docker-compose.prod.yml)

프로덕션 환경에서는 미리 빌드된 GHCR 이미지를 사용:

#### 1. .env 파일 준비
```bash
# 프로덕션 서버에 접속
ssh user@production-server

# 프로젝트 디렉토리로 이동
cd ~/my-realestate-calc

# .env 파일 생성
nano .env
```

#### 2. .env 파일 작성 (프로덕션용)
```env
GITHUB_REPOSITORY=homegroup/my-realestate-calc
DB_URL=jdbc:postgresql://your-prod-db-server:5432/realestate
DB_USERNAME=realestate_user
DB_PASSWORD=your_production_password
SPRING_PROFILES_ACTIVE=prod
```

#### 3. Docker Compose로 실행
```bash
# GHCR 이미지 pull 및 실행
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

#### 4. 업데이트 배포
```bash
# 새 이미지 다운로드
docker-compose -f docker-compose.prod.yml pull

# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml up -d

# 이전 이미지 정리
docker image prune -f
```

---

## GHCR 이미지 사용

### 1. GitHub Actions 자동 빌드

`main` 또는 `master` 브랜치에 push하면 자동으로:
1. Backend 이미지 빌드
2. Frontend 이미지 빌드
3. GHCR에 push

이미지 경로:
- Backend: `ghcr.io/homegroup/my-realestate-calc/backend:latest`
- Frontend: `ghcr.io/homegroup/my-realestate-calc/frontend:latest`

### 2. 로컬에서 GHCR 이미지 테스트

```bash
# GitHub 로그인 (처음 한 번만)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# .env 파일 준비
cp .env.example .env
nano .env  # 값 수정

# 이미지 pull 및 실행
docker-compose -f docker-compose.prod.yml up -d
```

---

## 접속 URL

배포 후 다음 URL로 접속 가능:

- **Frontend**: `http://your-domain/realestate/`
- **Backend API**: `http://your-domain/api/`
- **Health Check**: `http://your-domain/health`

---

## 트러블슈팅

### 1. .env 파일이 적용되지 않을 때
```bash
# .env 파일 위치 확인
ls -la .env

# docker-compose.prod.yml과 같은 디렉토리에 있어야 함
pwd
```

### 2. 데이터베이스 연결 실패
```bash
# PostgreSQL 연결 테스트
docker run --rm -it postgres:15 psql $DB_URL

# Backend 로그 확인
docker-compose -f docker-compose.prod.yml logs backend
```

### 3. GHCR 이미지 pull 실패
```bash
# GitHub 로그인 확인
docker login ghcr.io

# 이미지 수동 pull
docker pull ghcr.io/homegroup/my-realestate-calc/backend:latest
docker pull ghcr.io/homegroup/my-realestate-calc/frontend:latest
```

### 4. 환경변수 확인
```bash
# 실행 중인 컨테이너의 환경변수 확인
docker exec realestate-backend env | grep DB
```

---

## 보안 주의사항

⚠️ **중요**: `.env` 파일을 절대 Git에 커밋하지 마세요!

- ✅ `.env.example`은 커밋 가능 (실제 값 제외)
- ❌ `.env`는 `.gitignore`에 포함되어 있음
- 🔐 프로덕션 비밀번호는 강력하게 설정
- 🔑 각 환경마다 다른 비밀번호 사용

---

## 요약

### 개발 환경
```bash
# 1. .env 파일 생성
cp .env.example .env

# 2. 값 수정
nano .env

# 3. 로컬 빌드 실행
docker-compose up -d --build
```

### 프로덕션 환경
```bash
# 1. .env 파일 생성
cp .env.example .env

# 2. 프로덕션 값 수정
nano .env

# 3. GHCR 이미지 실행
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```
