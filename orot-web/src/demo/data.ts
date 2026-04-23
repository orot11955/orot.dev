import type {
  Category,
  Comment,
  GalleryItem,
  Post,
  PostStatus,
  PublicSettings,
  Series,
  StudioSettings,
} from '@/types';

export interface DemoStore {
  posts: Post[];
  categories: Category[];
  series: Series[];
  gallery: GalleryItem[];
  comments: Comment[];
  settings: StudioSettings;
  dailyVisits: Array<{ date: string; count: number }>;
  nextIds: {
    post: number;
    category: number;
    series: number;
    gallery: number;
    comment: number;
  };
}

const asset = (name: string) => `/demo-media/${name}.svg`;

function iso(daysOffset: number, hour = 9): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateKey(daysOffset: number): string {
  return iso(daysOffset).slice(0, 10);
}

function categorySummary(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

function seriesSummary(series: Series) {
  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
  };
}

function markdown(input: {
  title: string;
  intro: string;
  bullets: string[];
  code?: string;
  closing: string;
}) {
  const bulletList = input.bullets.map((item) => `- ${item}`).join('\n');
  const codeBlock = input.code
    ? `\n\n## 코드 스케치\n\n~~~ts\n${input.code.trim()}\n~~~`
    : '';

  return `# ${input.title}

${input.intro}

## 데모 포인트

${bulletList}${codeBlock}

## 운영 메모

${input.closing}
`;
}

const categories: Category[] = [
  {
    id: 1,
    name: 'Frontend',
    slug: 'frontend',
    description: 'Next.js, React, UI 상태와 사용자 경험',
    sortOrder: 10,
    createdAt: iso(-40),
    updatedAt: iso(-3),
    _count: { posts: 0 },
  },
  {
    id: 2,
    name: 'Backend',
    slug: 'backend',
    description: 'NestJS, Prisma, 인증과 데이터 모델링',
    sortOrder: 20,
    createdAt: iso(-40),
    updatedAt: iso(-3),
    _count: { posts: 0 },
  },
  {
    id: 3,
    name: 'Studio',
    slug: 'studio',
    description: '콘텐츠 운영 도구와 관리자 화면 설계',
    sortOrder: 30,
    createdAt: iso(-40),
    updatedAt: iso(-3),
    _count: { posts: 0 },
  },
  {
    id: 4,
    name: 'DevOps',
    slug: 'devops',
    description: '배포, Docker Compose, 운영 자동화',
    sortOrder: 40,
    createdAt: iso(-40),
    updatedAt: iso(-3),
    _count: { posts: 0 },
  },
  {
    id: 5,
    name: 'Essay',
    slug: 'essay',
    description: '개인 사이트를 운영하며 남긴 짧은 회고',
    sortOrder: 50,
    createdAt: iso(-40),
    updatedAt: iso(-3),
    _count: { posts: 0 },
  },
];

const series: Series[] = [
  {
    id: 1,
    title: 'CMS Build Log',
    slug: 'cms-build-log',
    description: '개인 사이트를 글쓰기 도구와 운영 콘솔까지 갖춘 CMS로 확장한 기록입니다.',
    coverImage: asset('demo-series'),
    createdAt: iso(-35),
    updatedAt: iso(-2),
    _count: { posts: 0 },
    posts: [],
  },
  {
    id: 2,
    title: 'Editor Notes',
    slug: 'editor-notes',
    description: '마크다운 에디터, 자동저장, 이미지 업로드 경험을 다듬는 과정입니다.',
    coverImage: asset('demo-series'),
    createdAt: iso(-28),
    updatedAt: iso(-2),
    _count: { posts: 0 },
    posts: [],
  },
  {
    id: 3,
    title: 'Studio Operations',
    slug: 'studio-operations',
    description: '발행, 예약, 댓글 승인, 지표 확인을 하나의 흐름으로 묶는 운영 설계입니다.',
    coverImage: asset('demo-series'),
    createdAt: iso(-20),
    updatedAt: iso(-2),
    _count: { posts: 0 },
    posts: [],
  },
];

function createPost(input: {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: PostStatus;
  categoryId: number;
  seriesId?: number;
  seriesOrder?: number;
  tags: string[];
  viewCount: number;
  createdDaysAgo: number;
  publishedDaysAgo?: number;
  scheduledDaysAhead?: number;
  content: string;
}): Post {
  const category = categories.find((item) => item.id === input.categoryId);
  const linkedSeries = series.find((item) => item.id === input.seriesId);
  const publishedAt =
    input.publishedDaysAgo !== undefined ? iso(-input.publishedDaysAgo) : null;

  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    content: input.content,
    excerpt: input.excerpt,
    coverImage: asset('demo-cover'),
    status: input.status,
    viewCount: input.viewCount,
    metaTitle: input.title,
    metaDesc: input.excerpt,
    tags: input.tags.join(','),
    scheduledAt:
      input.scheduledDaysAhead !== undefined
        ? iso(input.scheduledDaysAhead)
        : null,
    publishedAt,
    createdAt: iso(-input.createdDaysAgo),
    updatedAt:
      input.status === 'UPDATED' ? iso(-1, 15) : iso(-Math.min(input.createdDaysAgo, 2), 16),
    seriesId: linkedSeries?.id ?? null,
    seriesOrder: input.seriesOrder ?? null,
    categoryId: category?.id ?? null,
    category: category ? categorySummary(category) : null,
    series: linkedSeries ? seriesSummary(linkedSeries) : null,
  };
}

const posts: Post[] = [
  createPost({
    id: 1,
    title: 'Next.js 공개 사이트와 Studio 영역을 함께 운영하기',
    slug: 'nextjs-public-studio-architecture',
    excerpt: '공개 페이지, 에디터, 관리자 콘솔이 같은 제품처럼 느껴지도록 라우팅과 데이터 흐름을 정리했습니다.',
    status: 'PUBLISHED',
    categoryId: 1,
    seriesId: 1,
    seriesOrder: 1,
    tags: ['nextjs', 'architecture', 'cms'],
    viewCount: 1842,
    createdDaysAgo: 34,
    publishedDaysAgo: 28,
    content: markdown({
      title: 'Next.js 공개 사이트와 Studio 영역을 함께 운영하기',
      intro:
        '개인 사이트를 단순한 블로그가 아니라 작성, 검토, 발행, 운영까지 이어지는 제품으로 만들기 위해 라우트의 책임을 나누었습니다.',
      bullets: [
        '공개 사이트는 SEO와 읽기 경험을 우선합니다.',
        '에디터는 빠른 작성과 자동저장을 담당합니다.',
        '스튜디오는 상태 전환, 예약, 댓글, 설정을 관리합니다.',
      ],
      code: `
type Area = 'public' | 'editor' | 'studio';

const visibleStatuses = {
  public: ['PUBLISHED'],
  editor: ['DRAFT', 'COMPLETED', 'REVIEW', 'UPDATED'],
  studio: ['REVIEW', 'UPDATED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'],
};
      `,
      closing:
        '데모에서는 이 분리가 그대로 체험 동선이 됩니다. 방문자는 결과물을 보고, demo 계정으로 운영 흐름을 눌러볼 수 있습니다.',
    }),
  }),
  createPost({
    id: 2,
    title: '마크다운 에디터 자동저장 설계기',
    slug: 'markdown-editor-autosave-design',
    excerpt: '입력 중인 내용을 잃지 않으면서도 서버 요청을 과하게 만들지 않는 자동저장 전략입니다.',
    status: 'PUBLISHED',
    categoryId: 1,
    seriesId: 2,
    seriesOrder: 1,
    tags: ['editor', 'autosave', 'react'],
    viewCount: 1630,
    createdDaysAgo: 30,
    publishedDaysAgo: 24,
    content: markdown({
      title: '마크다운 에디터 자동저장 설계기',
      intro:
        '글쓰기 도구에서 저장 상태는 작지만 중요한 신뢰 장치입니다. 변경됨, 저장 중, 저장됨, 실패 상태를 명확하게 나누었습니다.',
      bullets: [
        '입력마다 즉시 저장하지 않고 짧은 지연 시간을 둡니다.',
        '저장 중 들어온 변경은 다음 flush로 이어갑니다.',
        '이미지 blob URL처럼 임시 값은 서버에 저장하지 않습니다.',
      ],
      code: `
const AUTOSAVE_DELAY_MS = 1200;

function queueSave(patch: UpdatePostPayload) {
  pendingRef.current = { ...pendingRef.current, ...patch };
  timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
}
      `,
      closing:
        '이 데모의 에디터에서도 제목, 요약, 태그, 본문을 바꾸면 localStorage에 자동 저장됩니다.',
    }),
  }),
  createPost({
    id: 3,
    title: 'NestJS와 Prisma로 콘텐츠 상태 머신 만들기',
    slug: 'nestjs-prisma-content-state-machine',
    excerpt: '초안에서 발행까지 이어지는 상태 전환을 API 레벨에서 안전하게 제한한 과정입니다.',
    status: 'PUBLISHED',
    categoryId: 2,
    seriesId: 1,
    seriesOrder: 2,
    tags: ['nestjs', 'prisma', 'workflow'],
    viewCount: 1498,
    createdDaysAgo: 25,
    publishedDaysAgo: 21,
    content: markdown({
      title: 'NestJS와 Prisma로 콘텐츠 상태 머신 만들기',
      intro:
        '글의 상태는 UI 버튼만으로 막으면 쉽게 어긋납니다. API에서 허용 가능한 전환을 한 번 더 검증하도록 만들었습니다.',
      bullets: [
        '에디터와 스튜디오가 볼 수 있는 상태를 분리합니다.',
        '예약 발행은 미래 시간 검증을 통과해야 합니다.',
        '발행 시 publishedAt을 서버에서 결정합니다.',
      ],
      closing:
        'web-only 데모에서는 같은 상태 전환 규칙을 브라우저 저장소 위에서 흉내 냅니다.',
    }),
  }),
  createPost({
    id: 4,
    title: '사진 갤러리 업로드와 썸네일 처리',
    slug: 'gallery-upload-thumbnail-pipeline',
    excerpt: '여러 장의 이미지를 올리고 공개 여부와 메타데이터를 관리하는 갤러리 파이프라인입니다.',
    status: 'PUBLISHED',
    categoryId: 3,
    seriesId: 3,
    seriesOrder: 1,
    tags: ['gallery', 'upload', 'sharp'],
    viewCount: 1276,
    createdDaysAgo: 22,
    publishedDaysAgo: 18,
    content: markdown({
      title: '사진 갤러리 업로드와 썸네일 처리',
      intro:
        '포트폴리오 사이트의 사진 섹션은 단순 이미지 목록보다 운영 도구가 있을 때 훨씬 완성도가 높아집니다.',
      bullets: [
        '원본과 썸네일 경로를 분리해 목록 성능을 지킵니다.',
        '공개 여부, 촬영일, 설명을 스튜디오에서 수정합니다.',
        '대용량 업로드는 API와 프록시 제한을 함께 맞춥니다.',
      ],
      closing:
        '데모 갤러리는 공개 사진과 비공개 사진을 섞어두어 필터와 상세 모달을 바로 확인할 수 있습니다.',
    }),
  }),
  createPost({
    id: 5,
    title: 'Docker Compose로 운영과 데모를 다르게 다루기',
    slug: 'docker-compose-production-demo-stack',
    excerpt: '운영은 실제 API/DB, 데모는 web-only mock으로 분리해 안전하게 보여주는 배포 구도입니다.',
    status: 'PUBLISHED',
    categoryId: 4,
    seriesId: 1,
    seriesOrder: 3,
    tags: ['docker', 'deploy', 'demo'],
    viewCount: 1896,
    createdDaysAgo: 15,
    publishedDaysAgo: 9,
    content: markdown({
      title: 'Docker Compose로 운영과 데모를 다르게 다루기',
      intro:
        '운영 사이트와 데모 사이트는 같은 UI를 쓰지만 데이터 출처는 달라도 됩니다. 포트폴리오 데모라면 web-only 구성이 훨씬 가볍습니다.',
      bullets: [
        '운영은 실제 API와 DB를 사용합니다.',
        '데모는 정적 초기 데이터와 localStorage를 사용합니다.',
        '데모에서 어떤 액션을 눌러도 운영 데이터에는 닿지 않습니다.',
      ],
      closing:
        'demo.orot.dev는 별도 Next 컨테이너 하나만 띄우고 앞단 프록시에서 도메인을 연결하는 구도를 권장합니다.',
    }),
  }),
  createPost({
    id: 6,
    title: '대시보드 지표 카드 리듬 조정',
    slug: 'dashboard-metric-card-rhythm',
    excerpt: '방문자, 발행 상태, 대기 작업을 한눈에 읽을 수 있도록 대시보드 밀도를 조정 중입니다.',
    status: 'REVIEW',
    categoryId: 3,
    seriesId: 3,
    seriesOrder: 2,
    tags: ['dashboard', 'analytics', 'ui'],
    viewCount: 0,
    createdDaysAgo: 4,
    content: markdown({
      title: '대시보드 지표 카드 리듬 조정',
      intro:
        '대시보드는 숫자를 많이 놓는 화면이 아니라, 지금 처리해야 할 일을 빠르게 발견하는 화면입니다.',
      bullets: [
        '오늘, 주간, 월간 지표를 카드로 나눕니다.',
        '검토 대기 글과 댓글은 배지로 즉시 드러냅니다.',
        '인기 글과 예약 글을 같은 화면에서 확인합니다.',
      ],
      closing:
        '리뷰 상태로 두어 스튜디오의 검토 대기 목록에서 확인할 수 있습니다.',
    }),
  }),
  createPost({
    id: 7,
    title: '예약 발행 QA 체크리스트',
    slug: 'scheduled-publish-qa-checklist',
    excerpt: '예약 발행이 실제 운영에서 어긋나지 않도록 확인해야 할 조건들을 정리했습니다.',
    status: 'SCHEDULED',
    categoryId: 4,
    tags: ['scheduler', 'qa', 'publish'],
    viewCount: 0,
    createdDaysAgo: 3,
    scheduledDaysAhead: 2,
    content: markdown({
      title: '예약 발행 QA 체크리스트',
      intro:
        '예약 발행은 버튼 하나처럼 보이지만 시간대, 서버 스케줄러, 상태 전환이 함께 맞아야 합니다.',
      bullets: [
        '예약 시간은 현재보다 미래여야 합니다.',
        '스케줄러는 발행 대상만 조회합니다.',
        '발행 뒤 scheduledAt은 비우고 publishedAt을 기록합니다.',
      ],
      closing:
        '스튜디오의 배포 대기 목록에 나타나도록 예약 상태로 넣었습니다.',
    }),
  }),
  createPost({
    id: 8,
    title: '커버 이미지 교체 UX 다듬기',
    slug: 'cover-image-selection-ux',
    excerpt: '대표 이미지 선택, 미리보기, 제거 상태가 글쓰기 흐름을 방해하지 않도록 조정 중입니다.',
    status: 'UPDATED',
    categoryId: 1,
    seriesId: 2,
    seriesOrder: 2,
    tags: ['image', 'ux', 'editor'],
    viewCount: 322,
    createdDaysAgo: 13,
    publishedDaysAgo: 12,
    content: markdown({
      title: '커버 이미지 교체 UX 다듬기',
      intro:
        '대표 이미지는 공개 상세 페이지의 첫인상을 정합니다. 업로드 중, 삭제 중, 미리보기 실패 상태를 명확히 보이게 만들었습니다.',
      bullets: [
        '업로드와 제거 액션을 같은 카드 안에 묶습니다.',
        '이미지 URL은 저장된 공개 경로만 사용합니다.',
        '에디터와 스튜디오에서 같은 선택 컴포넌트를 공유합니다.',
      ],
      closing:
        '수정 중 상태로 두어 발행 후 재검토 흐름을 확인할 수 있습니다.',
    }),
  }),
  createPost({
    id: 9,
    title: '검색 가능한 글 목록을 위한 searchText 백필',
    slug: 'post-search-text-backfill',
    excerpt: '마크다운 본문에서 이미지와 링크 문법을 걷어낸 검색 텍스트를 저장하는 작업 메모입니다.',
    status: 'COMPLETED',
    categoryId: 2,
    tags: ['search', 'prisma', 'content'],
    viewCount: 0,
    createdDaysAgo: 2,
    content: markdown({
      title: '검색 가능한 글 목록을 위한 searchText 백필',
      intro:
        '본문 검색은 원본 마크다운을 그대로 뒤지는 것보다 검색용 텍스트를 따로 관리하는 편이 안정적입니다.',
      bullets: [
        '이미지 alt 텍스트는 검색에 포함합니다.',
        '마크다운 기호와 HTML 태그는 제거합니다.',
        '앱 시작 시 누락된 searchText를 백필합니다.',
      ],
      closing:
        '작성 완료 상태로 두어 에디터에서 스튜디오 전달 버튼을 확인할 수 있습니다.',
    }),
  }),
  createPost({
    id: 10,
    title: '새로운 글의 첫 문단 실험',
    slug: 'draft-opening-paragraph-experiment',
    excerpt: '아직 방향을 잡는 중인 초안입니다. 에디터의 자동저장과 상태 전환을 시험하기 좋습니다.',
    status: 'DRAFT',
    categoryId: 5,
    tags: ['draft', 'writing'],
    viewCount: 0,
    createdDaysAgo: 1,
    content: markdown({
      title: '새로운 글의 첫 문단 실험',
      intro:
        '좋은 첫 문단은 설명보다 장면에 가깝습니다. 이 글은 아직 문장을 여러 번 옮겨 보는 단계입니다.',
      bullets: [
        '제목을 바꾸면 슬러그가 함께 바뀌는지 확인합니다.',
        '요약과 태그 변경이 자동저장되는지 확인합니다.',
        '작성 완료로 넘기면 에디터 목록 필터가 갱신됩니다.',
      ],
      closing:
        '데모 계정으로 직접 수정해 보기 위한 초안입니다.',
    }),
  }),
];

const gallery: GalleryItem[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  title: [
    'Studio desk',
    'Editor flow',
    'Dashboard morning',
    'Image batch',
    'Release checklist',
    'Quiet notes',
    'Series planning',
    'Comment queue',
    'Private draft board',
    'Unreleased mock',
  ][index],
  description: [
    '글 작성과 운영 화면을 함께 확인하는 작업 책상.',
    '초안에서 검토까지 이어지는 에디터 흐름.',
    '아침에 확인하는 방문자와 대기 작업.',
    '갤러리 업로드를 테스트하기 위한 이미지 묶음.',
    '배포 전 확인하는 체크리스트와 로그.',
    '개인 사이트 운영에 대한 짧은 메모.',
    '연재 순서를 배치하는 화면.',
    '승인 대기 댓글을 처리하는 운영 화면.',
    '비공개 갤러리 항목 예시.',
    '아직 공개하지 않은 화면 스케치.',
  ][index],
  imageUrl: asset('demo-gallery'),
  thumbnailUrl: asset('demo-gallery'),
  altText: `OROT demo gallery ${index + 1}`,
  width: index % 2 === 0 ? 1000 : 1300,
  height: index % 2 === 0 ? 1300 : 1000,
  takenAt: iso(-(35 - index * 3)),
  isPublished: index < 8,
  sortOrder: (index + 1) * 10,
  createdAt: iso(-(35 - index * 3)),
  updatedAt: iso(-1),
}));

const comments: Comment[] = [
  {
    id: 1,
    postId: 1,
    parentId: null,
    authorName: '민준',
    authorEmail: 'minjun@demo.orot.dev',
    content: '공개 화면과 관리 화면이 같은 제품처럼 이어지는 점이 좋네요.',
    status: 'APPROVED',
    createdAt: iso(-6, 11),
    updatedAt: iso(-6, 11),
    post: { id: 1, title: posts[0].title, slug: posts[0].slug },
  },
  {
    id: 2,
    postId: 1,
    parentId: 1,
    authorName: 'OROT',
    authorEmail: 'orot@demo.orot.dev',
    content: '맞아요. 데모에서는 결과물과 운영 흐름을 같이 보여주는 쪽에 초점을 뒀습니다.',
    status: 'APPROVED',
    createdAt: iso(-5, 12),
    updatedAt: iso(-5, 12),
    post: { id: 1, title: posts[0].title, slug: posts[0].slug },
    parent: { id: 1, authorName: '민준' },
  },
  {
    id: 3,
    postId: 2,
    parentId: null,
    authorName: '서연',
    authorEmail: 'seoyeon@demo.orot.dev',
    content: '자동저장 상태가 보이는 에디터는 실제로 써보고 싶습니다.',
    status: 'PENDING',
    createdAt: iso(-4, 10),
    updatedAt: iso(-4, 10),
    post: { id: 2, title: posts[1].title, slug: posts[1].slug },
  },
  {
    id: 4,
    postId: 3,
    parentId: null,
    authorName: '지후',
    authorEmail: 'jihu@demo.orot.dev',
    content: '상태 전환을 한 번 더 검증하는 구조가 인상적입니다.',
    status: 'APPROVED',
    createdAt: iso(-3, 17),
    updatedAt: iso(-3, 17),
    post: { id: 3, title: posts[2].title, slug: posts[2].slug },
  },
  {
    id: 5,
    postId: 4,
    parentId: null,
    authorName: '하린',
    authorEmail: 'harin@demo.orot.dev',
    content: '광고성 문구가 포함된 댓글 예시입니다.',
    status: 'FILTERED',
    createdAt: iso(-2, 13),
    updatedAt: iso(-2, 13),
    post: { id: 4, title: posts[3].title, slug: posts[3].slug },
  },
  {
    id: 6,
    postId: 5,
    parentId: null,
    authorName: '도윤',
    authorEmail: 'doyun@demo.orot.dev',
    content: 'web-only 데모라면 안심하고 눌러볼 수 있겠네요.',
    status: 'PENDING',
    createdAt: iso(-1, 18),
    updatedAt: iso(-1, 18),
    post: { id: 5, title: posts[4].title, slug: posts[4].slug },
  },
];

const settings: StudioSettings = {
  site_name: 'OROT.DEV Demo',
  site_description: '글쓰기, 발행, 사진, 댓글 운영까지 체험하는 포트폴리오 데모',
  site_og_image: asset('demo-hero'),
  site_logo: '',
  site_logo_light: '',
  site_logo_dark: '',
  seo_home_title: 'OROT.DEV Demo | Content Studio Portfolio',
  seo_home_description:
    'Next.js 기반 web-only 데모입니다. 정적 데이터와 localStorage로 에디터와 스튜디오를 체험합니다.',
  home_hero_logo_light: '',
  home_hero_logo_dark: '',
  home_hero_image: asset('demo-hero'),
  home_hero_image_position_y: '50%',
  about_content: [
    'OROT.DEV Demo는 공개 사이트, 에디터, 스튜디오가 하나의 콘텐츠 운영 흐름으로 이어지는 모습을 보여주는 샘플 환경입니다.',
    'demo 계정으로 로그인하면 초안 작성, 검토 전달, 예약 발행, 댓글 승인, 사진 관리, 사이트 설정을 브라우저 안에서 직접 둘러볼 수 있습니다.',
  ].join('\n\n'),
  about_stack:
    'Next.js,React,LocalStorage,Mock API,Markdown Editor,Content Studio',
  about_resume: [
    '2026 - web-only 포트폴리오 데모 구성',
    '2026 - Editor와 Studio를 분리한 CMS 워크플로우 설계',
    '2026 - 정적 데이터와 localStorage 기반 체험 환경 구성',
  ].join('\n'),
  about_links: '',
  about_nametag_image: asset('demo-nametag'),
  public_menu: JSON.stringify([
    { key: 'home', label: 'Home', href: '/', enabled: true },
    { key: 'posts', label: '글', href: '/posts', enabled: true },
    { key: 'photos', label: '사진', href: '/photos', enabled: true },
    { key: 'about', label: 'About', href: '/about', enabled: true },
  ]),
  default_theme: 'light',
  allow_theme_switch: 'true',
  social_links: JSON.stringify([
    { label: 'Demo Home', url: 'https://demo.orot.dev', icon: 'link' },
    { label: 'GitHub', url: 'https://github.com', icon: 'github' },
    { label: 'Portfolio', url: 'https://orot.dev', icon: 'link' },
    { label: 'Email', url: 'mailto:hello@orot.dev', icon: 'mail' },
  ]),
  seo_robots: 'index,follow',
  enable_sitemap: 'true',
  enable_rss: 'true',
  filter_keywords: '스팸,spam,광고,advertisement',
};

export function createDemoStore(): DemoStore {
  const clonedPosts = structuredClone(posts);
  const clonedCategories = structuredClone(categories);
  const clonedSeries = structuredClone(series);

  clonedCategories.forEach((category) => {
    category._count = {
      posts: clonedPosts.filter((post) => post.categoryId === category.id).length,
    };
  });

  clonedSeries.forEach((item) => {
    const seriesPosts = clonedPosts
      .filter((post) => post.seriesId === item.id && post.status === 'PUBLISHED')
      .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));

    item.posts = seriesPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      publishedAt: post.publishedAt,
      seriesOrder: post.seriesOrder,
    }));
    item._count = { posts: seriesPosts.length };
  });

  return {
    posts: clonedPosts,
    categories: clonedCategories,
    series: clonedSeries,
    gallery: structuredClone(gallery),
    comments: structuredClone(comments),
    settings: structuredClone(settings),
    dailyVisits: [32, 41, 37, 48, 56, 63, 58, 72, 69, 75, 88, 96, 91, 104]
      .map((count, index) => ({
        date: dateKey(index - 13),
        count,
      })),
    nextIds: {
      post: 11,
      category: 6,
      series: 4,
      gallery: 11,
      comment: 7,
    },
  };
}

export function getDemoPublicSettings(): PublicSettings {
  return createDemoStore().settings;
}
