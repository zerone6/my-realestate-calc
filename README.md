# 부동산 수익 계산기

부동산 투자 수익을 계산하는 풀스택 웹 애플리케이션입니다. Spring Boot 백엔드와 React 프론트엔드로 구성되어 있으며, Docker Compose를 통해 배포됩니다.

## 프로젝트 구조

```
my-realestate-calc/
├── backend/              # Spring Boot API 서버
│   ├── src/main/java/com/realestate/calc/
│   │   ├── controller/   # REST API 컨트롤러
│   │   ├── service/      # 비즈니스 로직
│   │   └── dto/          # 데이터 전송 객체
│   ├── Dockerfile        # 백엔드 Docker 설정
│   └── pom.xml           # Maven 설정
├── pcweb/                # React 프론트엔드
│   ├── src/
│   │   ├── components/   # React 컴포넌트
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile        # 프론트엔드 Docker 설정
│   └── package.json
├── shared/               # 공통 모듈 (TypeScript)
│   ├── api/              # API 클라이언트
│   ├── types/            # 타입 정의
│   ├── utils/            # 유틸리티 함수
│   └── data/             # 공통 데이터
├── nginx/                # Nginx 설정
├── docker-compose.yml    # Docker Compose 설정
├── .github/workflows/    # GitHub Actions 배포 설정
│   └── deploy.yml        # 자동 배포 워크플로우
└── README.md
```

## 기술 스택

### 백엔드
- **Spring Boot 3.2.0** - REST API 서버
- **Java 17** - 프로그래밍 언어
- **Maven** - 빌드 도구

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링

### 배포 및 인프라
- **Docker & Docker Compose** - 컨테이너화
- **Nginx** - 리버스 프록시 및 정적 파일 서빙
- **GitHub Actions** - CI/CD 자동화

## 로컬 개발 환경 설정

### 1. 사전 요구사항
- Java 17+
- Node.js 18+
- Maven 3.8+

### 2. VS Code 확장 프로그램 (권장)
- Extension Pack for Java
- Spring Boot Dashboard
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### 3. 실행 방법

#### VS Code 태스크 사용 (권장)
```bash
# 프로젝트 열기
code .

# Ctrl+Shift+P → "Tasks: Run Task" → "Start Backend Server"
# Ctrl+Shift+P → "Tasks: Run Task" → "Start PCWeb Dev Server"
```

#### 터미널에서 직접 실행
```bash
# 백엔드 서버 (포트 8080)
cd backend
mvn spring-boot:run

# 프론트엔드 서버 (포트 5173)
cd pcweb
npm install
npm run dev
```

## 배포

### GitHub Actions 자동 배포

메인 브랜치에 푸시하면 자동으로 원격 서버에 배포됩니다.

#### 배포 트리거
- `backend/**`, `pcweb/**`, `shared/**`, `nginx/**`, `docker-compose.yml` 파일 변경 시

#### 배포 과정
1. **파일 복사**: 소스 코드를 원격 서버로 전송
2. **Docker DNS 설정**: 네트워크 안정성을 위한 DNS 구성
3. **컨테이너 재빌드**: Docker Compose를 통한 전체 스택 재구성
4. **상태 확인**: 배포 완료 후 컨테이너 상태 검증

#### 배포 설정 파일
```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]
    paths: ['backend/**', 'pcweb/**', 'shared/**', 'nginx/**', 'docker-compose.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
      - name: Copy application to server
      - name: Deploy on remote server
```

### 수동 배포 (Docker Compose)

```bash
# 서버에서 직접 실행
cd ~/app
docker compose down --remove-orphans
docker compose up -d --build
```

## 기본값 설정

### 입력 필드 기본값

#### 1단계: 물건 정보
- **물건 이름**: "네리마"
- **건물가격**: 매입가격의 25%
- **수익 관련 항목 그룹화**:
  - 상단: 표면 이익율, 입주율
  - 하단: 월세 수익, 연간 수익

#### 2단계: 제비용 자동 계산
- **중개수수료**: `(매매가격 × 3%) + 6만엔 + 소비세(합계금액의 10%)`
- **등기비**: 
  - 소유권 이전 등기: 구매 금액의 0.4%
  - 저당권 설정 등기: 구매 금액의 0.4%
  - 추가 등기비: +10만엔

#### 3단계: 유지비 자동 계산
- **고정자산세**:
  - 건물: `(건물가격 × 70% - 1200만엔) × 3%`
  - 토지: `((매입가격 - 건물가격) × 70% × 50%) × 3%`
  - 합계: 건물 + 토지 고정자산세
- **관리비**: 매달 임대료의 5%
- **수선비**: 매달 임대료의 5%

### 자동 계산 공식

#### 제비용 합계
```
중개수수료 + 등기비 + 부동산취득세 + 인지세 + 론수수료 + 조사비 + 기타비용
```

#### 자기자금
```
매입가격 - 대출금액 + 제비용합계
```

#### 총 매입비용
```
매입가격 + 제비용합계
```

## API 문서

### POST /api/calculation/calculate
부동산 투자 수익률을 계산합니다.

**요청 예시:**
```json
{
  "name": "네리마",
  "price": 5000,
  "loan": 4000,
  "rate": 2.5,
  "term": 35,
  "rent": 300000,
  "occupancyRate": 95,
  "expense": 500000,
  "startDate": "2024-01-01",
  "rentFixedPeriod": 1,
  "rentAdjustmentInterval": 1,
  "rentAdjustmentRate": 0
}
```

**응답 예시:**
```json
{
  "monthlyPayment": "142998",
  "yearlyIncome": "3420000",
  "yearlyCost": "2215976",
  "yearlyProfit": "1204024",
  "yieldPercent": "2.4",
  "grossYield": "6.8",
  "repaymentSchedule": [...]
}
```

### GET /api/calculation/health
서버 상태를 확인합니다.

## 아키텍처 특징

### 마이크로서비스 구조
- **백엔드**: 비즈니스 로직 및 계산 처리
- **프론트엔드**: 사용자 인터페이스
- **공통 모듈**: 재사용 가능한 타입 및 유틸리티

### 컨테이너화
- 각 서비스별 독립적인 Docker 이미지
- Docker Compose를 통한 오케스트레이션
- Nginx를 통한 라우팅 및 로드 밸런싱

### CI/CD 파이프라인
- GitHub Actions를 통한 자동화된 배포
- 코드 변경 시 자동 빌드 및 배포
- 배포 실패 시 자동 재시도 로직

### 프론트엔드 디버깅

- 브라우저 개발자 도구 사용
- React Developer Tools 확장 프로그램 설치 권장
- VS Code에서 TypeScript 디버깅 가능

## 문제 해결

### 포트 충돌

- 포트 8080이 사용 중인 경우: `lsof -ti:8080 | xargs kill -9`
- 포트 5173이 사용 중인 경우: Vite가 자동으로 다른 포트 사용

### Java 관련 문제

- Java 버전 확인: `java -version`
- JAVA_HOME 설정 확인: `echo $JAVA_HOME`
- Maven 캐시 정리: `mvn clean`

### 프론트엔드 관련 문제

- node_modules 재설치: `rm -rf node_modules && npm install`
- Vite 캐시 정리: `npm run dev -- --force`

## 주요 기능

1. **부동산 수익 계산**

   - 월 상환금 계산
   - 연간 수익/지출 계산
   - 수익률 계산 (GRY, NRY)

2. **상환 일정표**

   - 월별 상환 일정 생성
   - 원금/이자 분리 표시
   - 대출 잔액 추적

3. **계산 결과 저장**
   - 로컬 스토리지에 계산 결과 저장
   - 저장된 계산 결과 불러오기
   - 계산 결과 삭제

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

---

## 🚀 최근 업데이트 (2025년 8월 2일)

### ✅ 표면 수익률 계산 정확성 개선

**문제점**: 입력폼에 표면 수익률 6%를 입력했는데 계산 결과에 6.2%가 표시되는 불일치 문제

**해결 방법**:
- 백엔드 `CalculationService.java`에 `totalPurchaseCost` 필드 추가
- 프론트엔드에서 총 매입 비용(매입가 + 제비용) 계산하여 백엔드로 전달
- 표면 수익률 계산 공식을 `매입가` 기준에서 `총 매입 비용` 기준으로 변경
- 결과: 6% 입력 시 정확히 6.0% 출력 확인

**변경된 파일**:
```
backend/src/main/java/com/realestate/calc/dto/CalculationRequest.java
backend/src/main/java/com/realestate/calc/service/CalculationService.java
shared/types/RealEstateForm.ts
shared/utils/formUtils.ts
```

### ✅ 멀티스텝 입력 폼 UI 대규성

**기존**: 단일 페이지에 모든 입력 필드가 4개 블록으로 배치

**변경**: 4단계 멀티스텝 네비게이션 구조로 재설계

**새로운 구조**:
1. **물건 정보**: 매입가, 자기자금, 표면이익률, 월세수익, 구조, 내용연수, 건물면적, 건물가격, 입주율
2. **제비용**: 중개수수료, 등기비, 부동산취득세, 인지세, 론수수료, 조사비, 기타비용 + 제비용 합계 표시
3. **유지비**: 월세 고정기간/조정 설정, 고정자산세, 관리비/관리비율, 수선비/수선비율, 보험료, 기타경비
4. **대출 정보**: 금리, 대출기간, 시작일 + 대출금액 자동 계산 표시

**주요 기능**:
- **PC**: 이전/다음 버튼으로 네비게이션
- **모바일**: 터치 스와이프로 좌우 이동
- **직접 이동**: 상단 스텝 인디케이터 클릭으로 원하는 단계로 바로 이동
- **실시간 계산**: 제비용 합계, 총 매입 비용, 대출 금액 등 자동 계산
- **데이터 유지**: 스텝 간 이동 시에도 입력 데이터 보존

**새로 생성된 파일**:
```
pcweb/src/components/MultiStepInputForm.tsx
pcweb/src/hooks/useFormHandlers.ts
```

### ✅ 랜딩 페이지 추가

**새로운 진입점**: localhost:5173 접속 시 랜딩 페이지 표시

**랜딩 페이지 구성**:
- **메인 타이틀**: "부동산 정보 관리" 중앙 배치
- **부제목**: "부동산 투자를 위한 종합 관리 플랫폼"
- **3개 기능 버튼**:
  1. **비용 계산기** (🧮): 기존 멀티스텝 계산기로 이동 (활성화)
  2. **수익 분석** (📊): 준비 중 상태
  3. **포트폴리오** (📈): 준비 중 상태

**반응형 디자인**:
- **PC**: 3열 그리드 배치
- **모바일**: 1열 세로 배치
- **호버 효과**: 마우스 오버 시 확대 및 그림자 효과
- **그라데이션 배경**: 시각적 효과 개선

**라우팅 시스템**:
- `/`: 랜딩 페이지
- `/calculator`: 멀티스텝 계산기

**새로 생성된 파일**:
```
pcweb/src/components/LandingPage.tsx
pcweb/src/components/CalculatorApp.tsx (기존 App.tsx에서 분리)
```

**추가된 의존성**:
```
pcweb/package.json: react-router-dom 추가
```

### 🔧 코드 구조 개선

**복잡도 관리**:
- 복잡한 `handleInputChange` 함수를 작은 단위 함수들로 분리
- `useFormHandlers.ts` 훅으로 폼 처리 로직 모듈화
- TypeScript 타입 안정성 개선

**접근성 개선**:
- 라벨 클릭 시 툴팁 표시 기능 유지
- 키보드 네비게이션 지원
- 시각적 피드백 개선

### 📱 사용자 경험 개선

**입력 편의성**:
- 단계별로 집중할 수 있는 입력 환경
- 실시간 계산 결과 표시 (제비용 합계, 총 매입 비용 등)
- 진행 상황을 한눈에 볼 수 있는 스텝 인디케이터

**네비게이션**:
- 모바일 환경에서 직관적인 스와이프 제스처
- PC 환경에서 명확한 버튼 네비게이션
- 랜딩 페이지에서 기능별 명확한 진입점

**데이터 관리**:
- 기존 저장/불러오기 기능 모두 유지
- 스텝 간 이동 시에도 입력 데이터 손실 없음
- 계산 완료 후 결과로 자동 스크롤

### 🎯 향후 확장 계획

랜딩 페이지의 준비 중인 기능들:
1. **수익 분석**: 다양한 시나리오 분석, 그래프 시각화
2. **포트폴리오**: 여러 부동산 관리, 수익 통계

현재 구조는 이러한 기능들을 쉽게 추가할 수 있도록 확장 가능하게 설계되었습니다.

---

## 🚀 배포 가이드

### 자동 배포 (GitHub Actions)

이 프로젝트는 GitHub Actions를 통한 자동 배포를 지원합니다.

#### 배포 워크플로우

1. **deploy-backend.yml**: `backend/` 경로 변경 시 백엔드만 배포
2. **deploy-frontend.yml**: `pcweb/` 또는 `shared/` 경로 변경 시 프론트엔드 배포  
3. **deploy-nginx.yml**: `nginx/` 경로 변경 시 Nginx 설정 배포
4. **deploy-full-stack.yml**: `main` 브랜치 푸시 시 전체 스택 배포

#### 배포 서버 설정

**필수 사전 요구사항:**
- Ubuntu 서버 (Docker 및 Docker Compose 설치)
- SSH 키 기반 인증 설정
- GitHub Secrets에 `DEPLOY_KEY` 등록

**서버 구조:**
```
~/app/
├── backend/           # Spring Boot 백엔드
├── pcweb/            # React 프론트엔드  
├── shared/           # 공통 모듈
├── nginx/            # Nginx 설정
└── docker-compose.yml # 전체 스택 설정
```

#### 배포 프로세스

1. **코드 변경 후 push**
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **GitHub Actions 자동 실행**
   - 변경된 경로에 따라 해당 워크플로우 실행
   - SCP로 파일 전송
   - Docker 컨테이너 재빌드 및 재시작

3. **배포 확인**
   - 웹사이트: `http://mirainest.asuscomm.com`
   - API: `http://mirainest.asuscomm.com/api`

### 수동 배포

서버에 직접 접속하여 배포할 경우:

```bash
# 서버 접속
ssh zerone6@mirainest.asuscomm.com

# 앱 디렉토리로 이동
cd ~/app

# 전체 스택 재배포
docker compose down
docker compose build --no-cache
docker compose up -d

# 개별 서비스 재배포 (예: 프론트엔드만)
cd ~/app/pcweb
docker compose down
docker compose build --no-cache  
docker compose up -d
```

### 환경 설정

#### 프로덕션 환경 변수

**pcweb/.env.production:**
```env
NODE_ENV=production
VITE_API_BASE_URL=/api
VITE_APP_TITLE=부동산 정보 관리
```

#### Nginx 설정

- **루트 경로** (`/`): React 앱 (랜딩 페이지 + 계산기)
- **API 경로** (`/api`): Spring Boot 백엔드
- **React Router 지원**: SPA 라우팅을 위한 fallback 설정

#### Docker 네트워크

모든 서비스는 `app-network`를 통해 통신:
- `backend:8080` ← Spring Boot 
- `pcweb:80` ← React + Nginx
- `nginx:80` ← 리버스 프록시

### 트러블슈팅

#### 배포 실패 시 확인사항

1. **GitHub Actions 로그 확인**
   - Repository → Actions 탭에서 실행 결과 확인

2. **서버 로그 확인**
   ```bash
   # 전체 컨테이너 상태
   docker compose ps
   
   # 특정 서비스 로그
   docker compose logs backend
   docker compose logs pcweb  
   docker compose logs nginx
   ```

3. **네트워크 연결 확인**
   ```bash
   # 컨테이너 간 통신 테스트
   docker exec nginx ping backend
   docker exec nginx ping pcweb
   ```

4. **포트 충돌 확인**
   ```bash
   # 사용 중인 포트 확인
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8080
   ```

#### 일반적인 문제 해결

**빌드 실패:**
- Docker 이미지 캐시 정리: `docker system prune -f`
- 개별 이미지 재빌드: `docker compose build --no-cache [service]`
- 네트워크 문제: `docker network create app-network`

**Backend 빌드 오류:**
- Maven 의존성 문제: Dockerfile에서 멀티스테이지 빌드 사용
- JAR 파일 없음: 빌드 스테이지에서 Maven 실행 확인

**Frontend 빌드 오류:**
- Shared 모듈 참조 실패: 루트 컨텍스트에서 빌드
- Node.js 의존성 문제: `npm install` 순서 확인

**Nginx 설정 오류:**
- 설정 파일 구문 확인: `docker exec nginx nginx -t`
- 로그 확인: `docker compose logs nginx`

**API 연결 실패:**
- 백엔드 헬스체크: `curl http://localhost:8080/api/calculation/health`
- 네트워크 설정 확인: `docker network ls`
- 컨테이너 간 통신: `docker exec nginx ping backend`

**Docker Compose 버전 경고:**
- `version` 속성은 최신 Docker Compose에서 더 이상 필요하지 않음
- 모든 docker-compose.yml에서 version 라인 제거됨
