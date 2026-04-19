# OROT.DEV

`orot-web`과 `orot-api`를 루트에서 함께 관리하고 배포하는 모노레포입니다.  
개발은 각 앱 단위로 진행하고, 빌드와 배포는 루트 스크립트와 Docker Compose를 기준으로 실행합니다.

## 구성

- `orot-web`: Next.js 기반 프론트엔드
- `orot-api`: NestJS + Prisma 기반 API
- `nginx`: 리버스 프록시 설정
- `docker-compose.yml`: 통합 배포 진입점

## 요구 사항

- Node.js `22+`
- Yarn `1.22.22`
- Docker / Docker Compose

## 시작하기

1. 환경변수 파일 준비

```bash
cp .env.example .env
```

2. 프라이빗 패키지 토큰이 필요하면 `.npmrc.example`을 참고해 루트 `.npmrc`를 준비

3. 의존성 설치

```bash
yarn --cwd orot-api install
yarn --cwd orot-web install
```

## 개발

각 앱은 루트에서 아래 명령으로 실행할 수 있습니다.

```bash
yarn dev:api
yarn dev:web
```

자주 쓰는 루트 명령:

```bash
yarn build
yarn build:api
yarn build:web
yarn lint
yarn db:generate
yarn db:push
yarn db:seed
```

## 배포

루트 기준 통합 배포 절차입니다.

```bash
yarn docker:check
yarn docker:build
yarn docker:up
```

중지 및 로그 확인:

```bash
yarn docker:down
yarn docker:logs
```

Compose로 올라가는 서비스:

- `db`: MariaDB
- `orot-api`: NestJS API
- `orot-web`: Next.js 앱
- `nginx`: 외부 진입 리버스 프록시

## 환경변수

환경변수는 실행 방식에 따라 파일이 다릅니다.

- 루트 `.env`: Docker Compose 통합 실행용. 시작점은 [.env.example](/root/workbench/02_orot.dev_site/orot.dev/.env.example)입니다.
- `orot-api/.env`: API 단독 개발용. 시작점은 [orot-api/.env.example](/root/workbench/02_orot.dev_site/orot.dev/orot-api/.env.example)입니다.
- `orot-web/.env.local`: Web 단독 개발용. 시작점은 [orot-web/.env.local.example](/root/workbench/02_orot.dev_site/orot.dev/orot-web/.env.local.example)입니다.
- `.env.compose`: 선택형 Compose 프리셋입니다. 자동 로드되지 않으므로 필요할 때만 `docker compose --env-file .env.compose ...`로 사용합니다.

루트 `.env`의 주요 그룹:

- `SITE_URL`, `WEB_ORIGIN`, `HTTP_PORT`: 대표 도메인, API CORS origin, 외부 노출 포트
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `MARIADB_ROOT_PASSWORD`: MariaDB 및 API 연결 정보
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: 인증 토큰 시크릿
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`: Next.js 클라이언트에 노출되는 공개 URL
- `HTTP_LOGGING`, `LOG_LEVEL`, `WEB_LOG_LEVEL`, `LOG_PRETTY`, `SLOW_QUERY_MS`: API/Web 서버 로그 제어
- `CLIENT_ERROR_LOGGING`, `NEXT_PUBLIC_CLIENT_ERROR_LOGGING`: 브라우저 오류 수집 제어

단독 개발 시 참고할 값:

- `orot-api/.env`의 `DATABASE_URL`은 로컬 DB를 직접 바라봅니다.
- `orot-web/.env.local`의 `INTERNAL_API_ORIGIN`은 Next.js dev rewrite 대상 API origin을 바꿀 때만 사용합니다.

## 메모

- 루트 `package.json`이 워크스페이스와 공통 실행 스크립트 진입점 역할을 담당합니다.
- 기존 앱별 Git 히스토리는 `.repo-history/`에 별도로 보관되어 있습니다.
