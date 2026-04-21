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
cp .env.example .env
```

2. 프라이빗 패키지 토큰이 필요하면 `.npmrc.example`을 참고해 루트 `.npmrc`를 준비

3. 의존성 설치

```bash
yarn --cwd orot-api install
yarn --cwd orot-web install
```

각 앱은 독립적인 Yarn 패키지로 관리됩니다.  
`yarn.lock`은 루트가 아니라 `orot-api/yarn.lock`, `orot-web/yarn.lock`에 각각 생성되고, Docker 빌드도 이 구조를 기준으로 동작합니다.

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
yarn db:migrate:deploy
yarn db:generate
yarn db:push
yarn db:seed
```

`yarn db:push`는 로컬에서 빠르게 스키마를 맞춰보는 용도로만 두고, 배포 경로에서는 사용하지 않습니다.  
운영/배포 기준 DB 반영은 항상 Prisma migration 파일을 커밋한 뒤 `prisma migrate deploy`로 진행합니다.

## 배포

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

- 루트 `.env`
- 루트 `.npmrc`
- `nginx/nginx.conf`

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
- `DB_SEED_ON_DEPLOY`: 배포 시 `prisma db seed` 실행 여부
- `DB_AUTO_BASELINE_LEGACY`: 기존 Prisma 이력 없는 운영 DB를 첫 배포 때 자동 baseline 할지 여부
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: 인증 토큰 시크릿
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`: Next.js 클라이언트에 노출되는 공개 URL
- `HTTP_LOGGING`, `LOG_LEVEL`, `WEB_LOG_LEVEL`, `LOG_PRETTY`, `SLOW_QUERY_MS`: API/Web 서버 로그 제어
- `CLIENT_ERROR_LOGGING`, `NEXT_PUBLIC_CLIENT_ERROR_LOGGING`: 브라우저 오류 수집 제어

단독 개발 시 참고할 값:

- `orot-api/.env`의 `DATABASE_URL`은 로컬 DB를 직접 바라봅니다.
- `orot-web/.env.local`의 `INTERNAL_API_ORIGIN`은 Next.js dev rewrite 대상 API origin을 바꿀 때만 사용합니다.

## 메모

- 루트 `package.json`은 공통 실행 스크립트 진입점 역할을 담당합니다.
- Docker 이미지는 저장소 루트를 빌드 컨텍스트로 사용합니다.
- API 컨테이너는 더 이상 기동 시점에 `prisma db push`를 수행하지 않습니다.
- 기존 운영 DB가 `db push` 시절에 만들어졌다면, 첫 `docker:up` 시 baseline 자동화가 한 번 동작할 수 있습니다.
- DB 변경이 있을 때는 `orot-api/prisma/schema.prisma`와 함께 migration 파일도 커밋해야 배포에 반영됩니다.
- 기존 앱별 Git 히스토리는 `.repo-history/`에 별도로 보관되어 있습니다.
