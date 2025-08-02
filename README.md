# 부동산 수익 계산기

부동산 투자 수익을 계산하는 웹 애플리케이션입니다. 재사용 가능한 공통 모듈과 UI가 분리된 아키텍처로 구성되어 있습니다.

## 프로젝트 구조

```
my-realestate-calc/
├── shared/            # 공통 유틸리티 및 타입 정의
│   ├── api/          # API 클라이언트
│   ├── types/        # TypeScript 타입 정의
│   ├── utils/        # 유틸리티 함수들
│   ├── data/         # 공통 데이터
│   └── package.json
├── pcweb/            # PC 웹 클라이언트 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/          # Spring Boot 서버
│   ├── src/main/java/com/realestate/calc/
│   │   ├── controller/
│   │   ├── service/
│   │   └── dto/
│   └── pom.xml
├── .vscode/          # VS Code 설정
│   ├── launch.json   # 디버깅 설정
│   ├── tasks.json    # 태스크 설정
│   └── settings.json # 프로젝트 설정
└── README.md
```

## 기술 스택

### Shared (공통 모듈)

- TypeScript
- 순수 함수형 유틸리티
- API 클라이언트

### PCWeb (PC 웹 클라이언트)

- React 18
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Spring Boot 3.2.0
- Java 17
- Maven

## 개발 환경 설정

### 1. VS Code 확장 프로그램 설치

VS Code에서 다음 확장 프로그램들을 설치하세요:

- **Extension Pack for Java** (vscjava.vscode-java-pack)
- **Spring Boot Dashboard** (vscjava.vscode-spring-boot-dashboard)
- **Spring Initializr** (vscjava.vscode-spring-initializr)
- **Maven for Java** (vscjava.vscode-maven)
- **TypeScript and JavaScript Language Features** (ms-vscode.vscode-typescript-next)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **Prettier** (esbenp.prettier-vscode)

### 2. Java 환경 설정

- Java 17 이상이 설치되어 있어야 합니다
- JAVA_HOME 환경변수가 설정되어 있어야 합니다

## 실행 방법

### 방법 1: VS Code 태스크 사용 (권장)

1. **VS Code에서 프로젝트 열기**

   ```bash
   code .
   ```

2. **백엔드 서버 시작**

   - `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)로 명령 팔레트 열기
   - "Tasks: Run Task" 선택
   - "Start Backend Server" 선택

3. **PCWeb 클라이언트 시작**

   - `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)로 명령 팔레트 열기
   - "Tasks: Run Task" 선택
   - "Start PCWeb Dev Server" 선택

4. **또는 전체 스택 동시 시작**

   - `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)로 명령 팔레트 열기
   - "Tasks: Run Task" 선택
   - "Start Full Stack Development" 선택

5. **서버 중지**

   - "Stop Full Stack Development" 선택하여 모든 서버 중지

### 방법 2: 터미널에서 실행

#### 1. 백엔드 서버 실행

```bash
cd backend
mvn spring-boot:run
```

백엔드 서버는 `http://localhost:8080`에서 실행됩니다.

#### 2. PCWeb 클라이언트 실행

```bash
cd pcweb
npm install  # 최초 1회만
npm run dev
```

PCWeb 클라이언트는 `http://localhost:5173`에서 실행됩니다.

## 아키텍처 개요

### Shared 모듈

- **API 클라이언트**: 백엔드와의 통신 담당
- **타입 정의**: TypeScript 인터페이스 및 타입
- **유틸리티 함수**: 폼 검증, 데이터 변환, 월세 계산 등
- **공통 데이터**: 필드 설명, 상수 등

### PCWeb 클라이언트

- React 기반 웹 인터페이스
- Shared 모듈을 사용하여 비즈니스 로직 재사용
- Tailwind CSS를 이용한 반응형 디자인

### 백엔드 서버

- Spring Boot REST API
- 계산 로직 처리
- 상환 스케줄 생성

## API 엔드포인트

### POST /api/calculation/calculate

부동산 수익을 계산합니다.

**요청 예시:**

```json
{
  "name": "테스트 아파트",
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

## 디버깅 팁

### 백엔드 디버깅

- 브레이크포인트를 설정하려면 Java 파일의 라인 번호 옆을 클릭
- `F5`로 디버깅 시작
- `F10`으로 한 줄씩 실행
- `F11`로 함수 내부로 진입
- `Shift+F11`로 함수에서 나가기

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
