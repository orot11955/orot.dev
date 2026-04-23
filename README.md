# OROT.DEV

`orot-web`과 `orot-api`를 루트에서 함께 관리하고 배포하는 모노레포입니다.  
개발은 각 앱 단위로 진행하고, 빌드와 배포는 루트 스크립트와 Docker Compose를 기준으로 실행합니다.

배포 URL: https://orot.dev

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
cp .env.development.example .env.development
cp .env.production.example .env.production
```

개발만 바로 시작할 때는 `.env.development`를 만들지 않아도 됩니다.
루트 실행 스크립트는 `.env.development`가 없으면 `.env.development.example`을 기본값으로 사용합니다.

2. 의존성 설치

```bash
yarn --cwd orot-api install
yarn --cwd orot-web install
```

각 앱은 독립적인 Yarn 패키지로 관리됩니다.  
`yarn.lock`은 루트가 아니라 `orot-api/yarn.lock`, `orot-web/yarn.lock`에 각각 생성되고, Docker 빌드도 이 구조를 기준으로 동작합니다.

## 개발

개발용 루트 환경변수 파일:

- [.env.development.example](/root/workbench/02_orot.dev_site/orot.dev/.env.development.example): 기본 개발 템플릿
- `.env.development`: 팀/개인 개발 기본값
- `.env.local`, `.env.development.local`: 로컬 오버라이드

루트에서 아래 명령으로 실행할 수 있습니다.

```bash
yarn dev
yarn dev:api
yarn dev:web
```

`yarn dev`는 `orot-api`와 `orot-web`을 동시에 실행합니다.
이 명령들은 루트 env 로더를 통해 같은 설정 집합을 web/api에 나눠서 주입합니다.

자주 쓰는 루트 명령:

```bash
yarn build
yarn build:api
yarn build:web
yarn lint
yarn db:migrate:deploy
yarn db:generate
yarn db:push
yarn db:seed
```

`yarn db:push`는 로컬에서 빠르게 스키마를 맞춰보는 용도로만 두고, 배포 경로에서는 사용하지 않습니다.  
운영/배포 기준 DB 반영은 항상 Prisma migration 파일을 커밋한 뒤 `prisma migrate deploy`로 진행합니다.

## 배포

배포용 루트 환경변수 파일:

- [.env.production.example](/root/workbench/02_orot.dev_site/orot.dev/.env.production.example): 운영/Compose 템플릿
- `.env.production`: 실제 운영 값

`docker` 스크립트는 `.env.production`을 기준으로 동작합니다.

루트 기준 통합 배포 절차입니다.

```bash
yarn docker:check
yarn docker:up
```

Docker 배포 진입점은 이제 `scripts/docker-stack.sh` 하나로 통일되어 있고,
`yarn docker:check`, `yarn docker:build`, `yarn docker:migrate`, `yarn docker:up`
모두 이 스크립트를 사용합니다.

`yarn docker:up`과 `yarn docker:deploy`는 같은 동작을 하며, 아래 순서로 배포를 진행합니다.

- Compose 설정 검증
- 앱 이미지 재빌드(`docker compose build --pull orot-api orot-web`)
- DB 기동 및 health check 대기
- Prisma migration 적용(`prisma migrate deploy`)
- 기존 `db push` 기반 운영 DB라 `_prisma_migrations`가 없으면, 현재 DB가 `schema.prisma`와 일치할 때에만 1회 baseline 자동 처리
- 선택형 seed 실행(`DB_SEED_ON_DEPLOY=true`일 때만)
- API/Web/Nginx 기동 후 health check 대기
- 실패 시 `docker compose ps`와 최근 서비스 로그를 자동 출력

`up` 단계에서는 더 이상 이미지를 다시 원격 pull 하지 않고, 빌드 단계에서만 base image를 최신화합니다.
그래서 방금 빌드한 로컬 이미지를 배포 직전에 다시 pull 하다가 생기던 불안정성을 줄였습니다.

패키지 버전이나 lockfile이 바뀐 경우에도 새 이미지를 다시 빌드한 뒤 올리므로, 의존성 변경이 배포에 반영됩니다.
DB 스키마 변경은 `orot-api/prisma/migrations`에 migration 파일이 함께 포함되어 있어야 정상 반영됩니다.

중지 및 로그 확인:

```bash
yarn docker:down
yarn docker:logs
yarn docker:migrate
```

배포 전에 아래 파일이 준비되어 있어야 합니다.

- 루트 `.env.production`
- `nginx/nginx.conf`

Compose로 올라가는 서비스:

- `db`: MariaDB
- `orot-api`: NestJS API
- `orot-web`: Next.js 앱
- `nginx`: 외부 진입 리버스 프록시

### Web-only 데모

포트폴리오용 데모는 API/DB 없이 Next.js 웹 컨테이너 하나만 띄울 수 있습니다.
기본 도메인 구도는 아래와 같습니다.

- 운영: `https://orot.dev`
- 데모: `https://demo.orot.dev`

데모 모드는 정적 초기 데이터와 브라우저 `localStorage`를 사용합니다.
에디터/스튜디오에서 글 수정, 상태 전환, 댓글 승인, 사진 공개 토글을 눌러도 운영 API나 DB에는 닿지 않습니다.

```bash
cp .env.demo.example .env.demo
yarn docker:demo-web:up
```

`.env.demo.example`의 기본 포트는 `DEMO_WEB_PORT=3001`입니다.
호스트의 앞단 프록시에서 `demo.orot.dev`를 이 포트로 넘기면 외부에는 표준 도메인만 보입니다.

도메인은 고정값이 아니며 `.env.demo`에서 바꿀 수 있습니다.
바꿀 때는 `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `WEB_IMAGE_REMOTE_PATTERNS`를 함께 맞춥니다.

데모 로그인 기본값:

```text
demo / demo1234
```

자주 쓰는 데모 명령:

```bash
yarn docker:demo-web:up
yarn docker:demo-web:logs
yarn docker:demo-web:down
```

## 환경변수

환경변수는 이제 루트에서만 관리합니다. 앱 폴더 안의 env 파일은 더 이상 기준 경로가 아닙니다.

루트 로더 우선순위:

- 개발: `.env.development` 또는 `.env.development.example`
- 공통 로컬 오버라이드: `.env.local`
- 모드별 로컬 오버라이드: `.env.development.local`, `.env.production.local`
- 마지막 우선순위: 현재 셸 환경변수

### Development

- 개발 기본 템플릿: [.env.development.example](/root/workbench/02_orot.dev_site/orot.dev/.env.development.example)
- 루트 스크립트 `yarn dev`, `yarn dev:web`, `yarn dev:api`, `yarn db:*`는 모두 이 루트 개발 env 체계를 사용합니다.

개발 기준 규칙:

- 브라우저는 항상 `NEXT_PUBLIC_API_URL=/api` 같은 same-origin 경로를 쓰는 쪽이 안전합니다.
- Next.js 서버 프록시 대상은 `INTERNAL_API_ORIGIN`으로 분리합니다. 개발 기본값은 `http://localhost:4000`입니다.
- API CORS 대상은 루트 `WEB_ORIGIN`으로 관리합니다. 예: `http://localhost:3000,http://forge.home:3000`
- `WEB_PORT`, `API_PORT`는 루트 실행기에서 각 앱의 `PORT`로 매핑됩니다.

### Production / Compose

- 루트 `.env.production`
- 시작 템플릿은 [.env.production.example](/root/workbench/02_orot.dev_site/orot.dev/.env.production.example)입니다.
- `.env.compose`
  선택형 Compose 프리셋입니다. 자동 로드되지 않으므로 필요할 때만 `docker compose --env-file .env.compose ...`로 사용합니다.

운영/Compose 기준 규칙:

- `NEXT_PUBLIC_API_URL=/api`
- `INTERNAL_API_ORIGIN=http://orot-api:4000`
- `WEB_ORIGIN=https://orot.dev` 같은 외부 공개 origin 사용
- `API_COOKIE_SECURE=true`
- Compose 스택은 내부 포트 `orot-web:3000`, `orot-api:4000`을 기준으로 nginx와 healthcheck가 연결됩니다.

루트 env의 주요 그룹:

- 공통: `SITE_URL`, `WEB_ORIGIN`, `TZ`, `LOG_LEVEL`, `LOG_PRETTY`
- Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `INTERNAL_API_ORIGIN`, `WEB_LOG_LEVEL`, `WEB_LOG_PRETTY`, `WEB_SERVER_API_TIMEOUT_MS`, `WEB_IMAGE_REMOTE_PATTERNS`, `NEXT_PUBLIC_CLIENT_ERROR_LOGGING`, `CLIENT_ERROR_LOGGING`, `WEB_PORT`
- API: `API_DATABASE_URL`, `API_HTTP_LOGGING`, `API_LOG_LEVEL`, `API_LOG_PRETTY`, `API_REQUEST_BODY_LIMIT`, `API_SLOW_QUERY_MS`, `API_STUDIO_*`, `API_JWT_*`, `API_COOKIE_*`, `API_PORT`
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `MARIADB_ROOT_PASSWORD`: MariaDB 및 API 연결 정보
- `DB_SEED_ON_DEPLOY`: 배포 시 `prisma db seed` 실행 여부
- `NEXT_PUBLIC_DEMO_MODE`: web-only 데모 데이터/localStorage 모드 활성화 여부
- `DEMO_WEB_PORT`: web-only 데모 컨테이너의 호스트 노출 포트
- `DB_AUTO_BASELINE_LEGACY`: 기존 Prisma 이력 없는 운영 DB를 첫 배포 때 자동 baseline 할지 여부
- `HTTP_PORT`: nginx 외부 노출 포트

### 빠른 기준표

- 로컬 Next dev가 로컬 API를 붙을 때: `NEXT_PUBLIC_API_URL=/api`, `INTERNAL_API_ORIGIN=http://localhost:4000`
- Docker Compose 안의 Next가 API 컨테이너를 붙을 때: `NEXT_PUBLIC_API_URL=/api`, `INTERNAL_API_ORIGIN=http://orot-api:4000`
- 브라우저가 절대 URL `http://localhost:4000`을 직접 쓰게 만드는 설정은 `forge.home:3000`처럼 다른 호스트명으로 접속할 때 엇갈릴 수 있습니다.
- 루트 실행기는 `API_DATABASE_URL -> DATABASE_URL`, `API_JWT_* -> JWT_*`, `WEB_PORT/API_PORT -> PORT`처럼 앱별 런타임 키로 매핑해 줍니다.

## 메모

- 루트 `package.json`은 공통 실행 스크립트 진입점 역할을 담당합니다.
- Docker 이미지는 저장소 루트를 빌드 컨텍스트로 사용합니다.
- 앱 의존성은 공개 npm registry 기준으로 잠겨 있어 루트 `.npmrc` 없이 설치/배포할 수 있습니다.
- API 컨테이너는 더 이상 기동 시점에 `prisma db push`를 수행하지 않습니다.
- 기존 운영 DB가 `db push` 시절에 만들어졌다면, 첫 `docker:up` 시 baseline 자동화가 한 번 동작할 수 있습니다.
- DB 변경이 있을 때는 `orot-api/prisma/schema.prisma`와 함께 migration 파일도 커밋해야 배포에 반영됩니다.
- 기존 앱별 Git 히스토리는 `.repo-history/`에 별도로 보관되어 있습니다.
