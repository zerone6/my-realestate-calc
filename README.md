# 부동산 수익 계산기

부동산 투자 수익을 계산하는 웹 애플리케이션입니다. 클라이언트-서버 아키텍처로 구성되어 있으며, 계산 로직은 서버에서 처리합니다.

## 프로젝트 구조

```
my-realestate-calc/
├── frontend/          # React + TypeScript + Vite 클라이언트
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── backend/           # Spring Boot 서버
│   ├── src/main/java/com/realestate/calc/
│   │   ├── controller/
│   │   ├── service/
│   │   └── dto/
│   └── pom.xml
├── .vscode/           # VS Code 설정
│   ├── launch.json    # 디버깅 설정
│   ├── tasks.json     # 태스크 설정
│   └── settings.json  # 프로젝트 설정
└── README.md
```

## 기술 스택

### Frontend

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

### 방법 1: VS Code 디버깅 (권장)

1. **VS Code에서 프로젝트 열기**

   ```bash
   code .
   ```

2. **백엔드 서버 디버깅 시작**

   - `F5` 키를 누르거나
   - `Ctrl+Shift+D` (또는 `Cmd+Shift+D`)로 디버깅 패널 열기
   - "Debug Spring Boot Application" 선택 후 실행

3. **프론트엔드 개발 서버 시작**

   - `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)로 명령 팔레트 열기
   - "Tasks: Run Task" 선택
   - "Start Frontend Dev Server" 선택

4. **또는 전체 스택 동시 시작/중지 (디버깅 없이 실행)**

   - `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)로 명령 팔레트 열기
   - "Tasks: Run Task" 선택
   - "Start Full Stack Development" 선택 → 백엔드와 프론트엔드 서버가 동시에 실행됩니다.
   - 서버를 모두 중단하려면 같은 방법으로 "Stop Full Stack Development"를 선택하세요.

   > **참고:**
   >
   > - "Start Full Stack Development"는 디버깅 없이 두 서버를 동시에 실행합니다.
   > - "Stop Full Stack Development"는 두 서버를 모두 종료합니다.
   > - 디버깅 모드에서 중지(Stop) 버튼을 누르면 백엔드만 중단되며, 프론트엔드는 별도로 중단해야 합니다.
   > - 디버깅 없이 실행할 때는 반드시 "Stop Full Stack Development"로 서버를 종료하세요.

### 방법 2: 터미널에서 실행

#### 1. 백엔드 서버 실행

```bash
cd backend
mvn spring-boot:run
```

백엔드 서버는 `http://localhost:8080`에서 실행됩니다.

#### 2. 프론트엔드 클라이언트 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:5173` (또는 다른 사용 가능한 포트)에서 실행됩니다.

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
  "expense": 500000,
  "startDate": "2024-01-01"
}
```

**응답 예시:**

```json
{
  "monthlyPayment": "142998",
  "yearlyIncome": "3600000",
  "yearlyCost": "1073120",
  "yearlyProfit": "2526880",
  "yieldPercent": "5.05",
  "grossYield": "7.20",
  "schedule": [...]
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
