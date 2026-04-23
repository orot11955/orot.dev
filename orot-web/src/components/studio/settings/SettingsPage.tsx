'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'orot-ui';
import { ImageEditorModal } from '@/components/ImageEditorModal';
import {
  ActionGroup,
  type ActionItem,
} from '@/components/studio/shared/actions/ActionGroup';
import { useNotificationEffect, useSavingAction } from '@/hooks';
import {
  authService,
  studioCategoriesService,
  studioGalleryService,
  studioSettingsService,
} from '@/services';
import type { ManagedSettingsMediaKey } from '@/services/settings.service';
import type {
  Category,
  CreateCategoryPayload,
  GalleryItem,
  PublicMenuItem,
  SocialLinkItem,
  StudioSettings,
  Theme,
  UpdateCategoryPayload,
  UpdateSettingsPayload,
} from '@/types';
import { parseGlobalLinks } from '@/layouts/public/public-navigation';
import { getErrorMessage, resolveAssetUrl } from '@/utils/content';
import { safeParseJsonArray } from '@/utils/json';
import { SettingsListEditor } from './components/SettingsListEditor';
import { SettingsSectionShell } from './components/SettingsSectionShell';
import { SettingsSubmitButton } from './components/SettingsSubmitButton';
import styles from './SettingsPage.module.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'forest', label: 'Forest' },
  { value: 'ocean', label: 'Ocean' },
];

const ROBOTS_OPTIONS = [
  { value: 'index,follow', label: 'index, follow (공개)' },
  { value: 'noindex,follow', label: 'noindex, follow' },
  { value: 'index,nofollow', label: 'index, nofollow' },
  { value: 'noindex,nofollow', label: 'noindex, nofollow (비공개)' },
];

function toBool(v: string | undefined): boolean {
  return v === 'true';
}

function fromBool(v: boolean): string {
  return v ? 'true' : 'false';
}

export function SettingsPage() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await studioSettingsService.get();
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (payload: UpdateSettingsPayload) => {
    setError(null);
    setNotice(null);
    try {
      const next = await studioSettingsService.update(payload);
      setSettings(next);
      setNotice('저장되었습니다.');
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  useNotificationEffect(error, {
    type: 'error',
    title: settings
      ? '요청을 처리하지 못했습니다.'
      : '설정을 불러오지 못했습니다.',
  });
  useNotificationEffect(notice, { type: 'success' });

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <Spin size="lg" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <Empty description={error ?? '설정을 불러오지 못했습니다.'} />
        </div>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'site',
      label: '사이트 정보',
      children: (
        <SiteInfoSection
          settings={settings}
          onSave={save}
          onSettingsChange={(next) => setSettings(next)}
        />
      ),
    },
    {
      key: 'about',
      label: 'About',
      children: (
        <AboutSection
          settings={settings}
          onSave={save}
          onSettingsChange={(next) => setSettings(next)}
        />
      ),
    },
    {
      key: 'menu',
      label: 'Public 메뉴',
      children: <PublicMenuSection settings={settings} onSave={save} />,
    },
    {
      key: 'theme',
      label: '테마',
      children: <ThemeSection settings={settings} onSave={save} />,
    },
    {
      key: 'social',
      label: '전역 링크',
      children: <GlobalLinksSection settings={settings} onSave={save} />,
    },
    {
      key: 'seo',
      label: 'SEO',
      children: <SeoSection settings={settings} onSave={save} />,
    },
    {
      key: 'categories',
      label: '카테고리',
      children: (
        <CategoriesSection
          onError={(m) => setError(m)}
          onSuccess={(m) => setNotice(m)}
        />
      ),
    },
    {
      key: 'comments',
      label: '댓글 필터링',
      children: <CommentFilterSection settings={settings} onSave={save} />,
    },
    {
      key: 'security',
      label: '계정/보안',
      children: (
        <SecuritySection
          onError={(m) => setError(m)}
          onSuccess={(m) => setNotice(m)}
        />
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Typography.Text className={styles.eyebrow}>Settings</Typography.Text>
        <Typography.Title level={2} className={styles.title}>
          공통 설정
        </Typography.Title>
        <Typography.Paragraph className={styles.subtitle}>
          사이트 정보, 공개 영역 메뉴, 테마, SEO, 댓글 필터, 계정 보안 등 사이트 전반의 공통 설정을 관리합니다.
        </Typography.Paragraph>
      </header>
      <div className={styles.tabsCard}>
        <Tabs items={tabItems} tabPosition="left" />
      </div>
    </div>
  );
}

// ─── Section: 사이트 정보 ─────────────────────────────────────────────────────

interface SectionProps {
  settings: StudioSettings;
  onSave: (payload: UpdateSettingsPayload) => Promise<void>;
  onSettingsChange?: (next: StudioSettings) => void;
}

function SiteInfoSection({ settings, onSave, onSettingsChange }: SectionProps) {
  const [siteName, setSiteName] = useState(settings.site_name ?? '');
  const [siteDescription, setSiteDescription] = useState(settings.site_description ?? '');
  const [siteLogoLight, setSiteLogoLight] = useState(
    settings.site_logo_light ?? settings.site_logo ?? '',
  );
  const [siteLogoDark, setSiteLogoDark] = useState(settings.site_logo_dark ?? '');
  const [homeHeroLogoLight, setHomeHeroLogoLight] = useState(
    settings.home_hero_logo_light ?? '',
  );
  const [homeHeroLogoDark, setHomeHeroLogoDark] = useState(
    settings.home_hero_logo_dark ?? '',
  );
  const [siteOgImage, setSiteOgImage] = useState(settings.site_og_image ?? '');
  const [homeHeroImage, setHomeHeroImage] = useState(settings.home_hero_image ?? '');
  const [heroCandidates, setHeroCandidates] = useState<GalleryItem[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroLoadError, setHeroLoadError] = useState<string | null>(null);
  const [uploadingMediaKey, setUploadingMediaKey] =
    useState<ManagedSettingsMediaKey | null>(null);
  const [mediaUploadNotice, setMediaUploadNotice] = useState<string | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const { saving, runSaving } = useSavingAction();
  const [homeHeroImagePositionY, setHomeHeroImagePositionY] = useState(
    settings.home_hero_image_position_y ?? '50%',
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setHeroLoading(true);
        setHeroLoadError(null);
        const result = await studioGalleryService.getAll({ page: 1, limit: 60 });
        if (!cancelled) {
          setHeroCandidates(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setHeroLoadError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setHeroLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMediaUpload = useCallback(
    async (key: ManagedSettingsMediaKey, file: File | null) => {
      if (!file) {
        return;
      }

      setUploadingMediaKey(key);
      setMediaUploadNotice(null);
      setMediaUploadError(null);

      try {
        const next = await studioSettingsService.uploadMedia(key, file);
        setSiteLogoLight(next.site_logo_light ?? next.site_logo ?? '');
        setSiteLogoDark(next.site_logo_dark ?? '');
        setHomeHeroLogoLight(next.home_hero_logo_light ?? '');
        setHomeHeroLogoDark(next.home_hero_logo_dark ?? '');
        setSiteOgImage(next.site_og_image ?? '');
        onSettingsChange?.(next);
        setMediaUploadNotice('이미지가 업로드되었습니다.');
      } catch (err) {
        setMediaUploadError(getErrorMessage(err));
      } finally {
        setUploadingMediaKey(null);
      }
    },
    [onSettingsChange],
  );

  const submit = async () => {
    try {
      await runSaving(() =>
        onSave({
          site_name: siteName.trim(),
          site_description: siteDescription.trim(),
          site_logo: '',
          site_logo_light: siteLogoLight.trim(),
          site_logo_dark: siteLogoDark.trim(),
          home_hero_logo_light: homeHeroLogoLight.trim(),
          home_hero_logo_dark: homeHeroLogoDark.trim(),
          site_og_image: siteOgImage.trim(),
          home_hero_image: homeHeroImage.trim(),
          home_hero_image_position_y: homeHeroImagePositionY,
        }),
      );
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="사이트 정보"
      description="사이트 기본 정보와 공개 헤더 로고, 홈 hero 브랜드, 대표 공유 이미지를 한 곳에서 관리합니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <div className={styles.settingsStack}>
        {mediaUploadNotice && (
          <div>
            <Alert type="success" message={mediaUploadNotice} />
          </div>
        )}
        {mediaUploadError && (
          <div>
            <Alert type="error" message={mediaUploadError} />
          </div>
        )}
        <SettingsGroup
          title="기본 정보"
          description="사이트 이름과 설명을 먼저 잡아두면 홈 hero 소개 문구와 SEO 기본값이 함께 정리됩니다."
        >
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>사이트 이름</span>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.fieldLabel}>사이트 설명</span>
              <textarea
                className={styles.textarea}
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
              />
              <span className={styles.fieldHelp}>홈 hero 및 SEO 메타 description에 사용됩니다.</span>
            </label>
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="상단 헤더 로고"
          description="공개 사이트 상단 고정 헤더에 노출되는 로고입니다."
        >
          <div className={styles.fieldGrid}>
            <ManagedSettingsImageField
              label="라이트 모드 로고"
              value={siteLogoLight}
              previewLabel="라이트 모드 헤더 로고 미리보기"
              placeholder="기본 블랙 OROT 로고 사용"
              help="Light, Sepia처럼 밝은 배경 테마의 공개 헤더에 사용됩니다."
              previewTone="light"
              fullWidth={false}
              uploading={uploadingMediaKey === 'site_logo_light'}
              onSelect={(file) => handleMediaUpload('site_logo_light', file)}
              onClear={() => setSiteLogoLight('')}
            />
            <ManagedSettingsImageField
              label="다크 모드 로고"
              value={siteLogoDark}
              previewLabel="다크 모드 헤더 로고 미리보기"
              placeholder="기본 화이트 OROT 로고 사용"
              help="Dark, Forest, Ocean처럼 어두운 배경 테마의 공개 헤더에 사용됩니다."
              previewTone="dark"
              fullWidth={false}
              uploading={uploadingMediaKey === 'site_logo_dark'}
              onSelect={(file) => handleMediaUpload('site_logo_dark', file)}
              onClear={() => setSiteLogoDark('')}
            />
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="홈 Hero"
          description="홈 상단 hero에 들어가는 브랜드 로고와 배경 사진을 함께 관리합니다."
        >
          <div className={styles.fieldGrid}>
            <ManagedSettingsImageField
              label="라이트 모드 hero 로고"
              value={homeHeroLogoLight}
              previewLabel="라이트 모드 hero 로고 미리보기"
              placeholder="기본 블랙 hero 워드마크 사용"
              help="밝은 테마에서 OROT.DEV 텍스트 대신 노출됩니다."
              previewTone="light"
              fullWidth={false}
              uploading={uploadingMediaKey === 'home_hero_logo_light'}
              onSelect={(file) => handleMediaUpload('home_hero_logo_light', file)}
              onClear={() => setHomeHeroLogoLight('')}
            />
            <ManagedSettingsImageField
              label="다크 모드 hero 로고"
              value={homeHeroLogoDark}
              previewLabel="다크 모드 hero 로고 미리보기"
              placeholder="기본 화이트 hero 워드마크 사용"
              help="Dark, Forest, Ocean 테마 hero에서 노출됩니다."
              previewTone="dark"
              fullWidth={false}
              uploading={uploadingMediaKey === 'home_hero_logo_dark'}
              onSelect={(file) => handleMediaUpload('home_hero_logo_dark', file)}
              onClear={() => setHomeHeroLogoDark('')}
            />
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.fieldLabel}>메인 화면 배경 사진</span>
              <span className={styles.fieldHelp}>
                업로드된 사진 중 하나를 선택하면 홈 상단 hero에 우선 노출됩니다. 선택하지 않으면 첫 번째 공개 사진, 그다음 기본 OG 이미지를 사용합니다.
              </span>
              {heroLoading ? (
                <div className={styles.inlineStatus}>
                  <Spin size="sm" />
                  <span className={styles.fieldHelp}>사진 목록을 불러오는 중입니다.</span>
                </div>
              ) : heroLoadError ? (
                <Alert
                  type="error"
                  message="사진 목록을 불러오지 못했습니다."
                  description={heroLoadError}
                />
              ) : (
                <>
                  <div className={styles.mediaPickerToolbar}>
                    <Button
                      size="sm"
                      variant={homeHeroImage ? 'outlined' : 'solid'}
                      onClick={() => setHomeHeroImage('')}
                    >
                      자동 선택 사용
                    </Button>
                    <span className={styles.fieldHelp}>
                      현재 {homeHeroImage ? '수동 선택 사용 중' : '자동 선택 사용 중'}
                    </span>
                  </div>
                  <div className={styles.mediaPickerScroller}>
                    <div className={styles.mediaPickerGrid}>
                      {heroCandidates.map((photo) => {
                        const previewUrl = resolveAssetUrl(
                          photo.thumbnailUrl ?? photo.imageUrl,
                        );
                        const selected = homeHeroImage === photo.imageUrl;

                        return (
                          <button
                            key={photo.id}
                            type="button"
                            className={`${styles.mediaPickerCard}${selected ? ` ${styles.mediaPickerCardActive}` : ''}`}
                            onClick={() => setHomeHeroImage(photo.imageUrl)}
                          >
                            <div
                              className={styles.mediaPickerThumb}
                              style={{ backgroundImage: `url("${previewUrl}")` }}
                            />
                            <div className={styles.mediaPickerMeta}>
                              <span className={styles.mediaPickerTitle}>
                                {photo.title?.trim() || `사진 #${photo.id}`}
                              </span>
                              <span className={styles.mediaPickerHint}>
                                {photo.isPublished ? '공개' : '비공개'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className={styles.previewGrid}>
            <MediaPreviewCard
              label="메인 화면 미리보기"
              imageUrl={homeHeroImage}
              imagePositionY={homeHeroImagePositionY}
              onChangeImagePositionY={setHomeHeroImagePositionY}
              placeholder="자동 선택 사용 시 공개 사진 또는 OG 이미지가 대신 사용됩니다."
            />
          </div>
        </SettingsGroup>

        <SettingsGroup
          title="공유 이미지"
          description="기본 OpenGraph 이미지는 홈 공유 카드와 개별 글 OG 이미지 fallback에 사용됩니다."
        >
          <div className={styles.fieldGrid}>
            <ManagedSettingsImageField
              label="기본 OpenGraph 이미지"
              value={siteOgImage}
              previewLabel="OG 이미지 미리보기"
              placeholder="기본 OROT 이미지 사용"
              help="1200 x 630 권장. 각 글에 OG 이미지가 없을 때 이 값을 사용합니다."
              variant="wide"
              uploading={uploadingMediaKey === 'site_og_image'}
              onSelect={(file) => handleMediaUpload('site_og_image', file)}
              onClear={() => setSiteOgImage('')}
            />
          </div>
        </SettingsGroup>
      </div>
    </SettingsSectionShell>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.settingsGroup}>
      <div className={styles.settingsGroupHeader}>
        <h4 className={styles.settingsGroupTitle}>{title}</h4>
        <p className={styles.settingsGroupDesc}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function ManagedSettingsImageField({
  label,
  value,
  previewLabel,
  placeholder,
  help,
  variant = 'logo',
  previewTone = 'neutral',
  fullWidth = true,
  uploading,
  onSelect,
  onClear,
}: {
  label: string;
  value: string;
  previewLabel: string;
  placeholder: string;
  help: string;
  variant?: 'logo' | 'wide';
  previewTone?: 'neutral' | 'light' | 'dark';
  fullWidth?: boolean;
  uploading: boolean;
  onSelect: (file: File | null) => void;
  onClear: () => void;
}) {
  const previewUrl = resolveAssetUrl(value?.trim());
  const previewToneClass =
    previewTone === 'light'
      ? styles.settingsMediaPreviewLight
      : previewTone === 'dark'
        ? styles.settingsMediaPreviewDark
        : '';

  return (
    <div className={`${styles.field}${fullWidth ? ` ${styles.fieldWide}` : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.settingsMediaRow}>
        <div
          className={[
            styles.settingsMediaPreview,
            variant === 'wide' ? styles.settingsMediaPreviewWide : '',
            previewToneClass,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {previewUrl ? (
            <div
              className={styles.settingsMediaImage}
              role="img"
              aria-label={previewLabel}
              style={{ backgroundImage: `url("${previewUrl}")` }}
            />
          ) : (
            <div className={styles.settingsMediaFallback}>{placeholder}</div>
          )}
        </div>
        <div className={styles.settingsMediaActions}>
          <div className={styles.uploadRow}>
            <label className={styles.uploadButton}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.hiddenInput}
                onChange={(event) => {
                  onSelect(event.target.files?.[0] ?? null);
                  event.currentTarget.value = '';
                }}
              />
              <span>{uploading ? '업로드 중…' : '이미지 선택'}</span>
            </label>
            <Button
              size="sm"
              variant="outlined"
              onClick={onClear}
              disabled={uploading || !value}
            >
              기본값 사용
            </Button>
          </div>
          <span className={styles.fieldHelp}>{help}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section: About ───────────────────────────────────────────────────────────

function AboutSection({ settings, onSave, onSettingsChange }: SectionProps) {
  const [aboutContent, setAboutContent] = useState(settings.about_content ?? '');
  const [aboutStack, setAboutStack] = useState(settings.about_stack ?? '');
  const [aboutResume, setAboutResume] = useState(settings.about_resume ?? '');
  const [aboutNametagImage, setAboutNametagImage] = useState(
    settings.about_nametag_image ?? '',
  );
  const [uploadingNametag, setUploadingNametag] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const { saving, runSaving } = useSavingAction();
  const aboutNametagPreviewUrl = resolveAssetUrl(aboutNametagImage?.trim());

  const handleNametagUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setUploadingNametag(true);
      setUploadNotice(null);
      setUploadError(null);

      try {
        const next = await studioSettingsService.uploadMedia(
          'about_nametag_image',
          file,
        );
        setAboutNametagImage(next.about_nametag_image ?? '');
        onSettingsChange?.(next);
        setUploadNotice('네임텍 이미지가 업로드되었습니다.');
      } catch (err) {
        setUploadError(getErrorMessage(err));
        throw err;
      } finally {
        setUploadingNametag(false);
      }
    },
    [onSettingsChange],
  );

  const handleEditorCancel = useCallback(() => {
    if (uploadingNametag) {
      return;
    }
    setEditorOpen(false);
    setEditorFile(null);
  }, [uploadingNametag]);

  const handleEditorConfirm = useCallback(
    async (editedFile: File) => {
      await handleNametagUpload(editedFile);
      setEditorOpen(false);
      setEditorFile(null);
    },
    [handleNametagUpload],
  );

  const submit = async () => {
    try {
      await runSaving(() =>
        onSave({
          about_content: aboutContent,
          about_stack: aboutStack,
          about_resume: aboutResume,
          about_nametag_image: aboutNametagImage.trim(),
        }),
      );
    } catch {
      // handled upstream
    }
  };

  return (
    <>
      <SettingsSectionShell
        title="About 관리"
        description="About 페이지에 노출되는 소개글과 기술 스택, Resume, 네임텍 이미지를 편집합니다. 외부 링크는 전역 링크 설정을 함께 사용합니다."
        footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
      >
        <div className={styles.fieldGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>소개글</span>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 200 }}
              value={aboutContent}
              onChange={(e) => setAboutContent(e.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>기술 스택</span>
            <Input
              value={aboutStack}
              onChange={(e) => setAboutStack(e.target.value)}
              placeholder="TypeScript, React, Next.js, NestJS"
            />
            <span className={styles.fieldHelp}>쉼표로 구분해 입력하면 About 페이지 resume 상단에 Tag로 노출됩니다.</span>
          </label>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>네임텍 사진</span>
            <div className={styles.nametagMediaRow}>
              <div className={styles.nametagMediaPreview}>
                {aboutNametagPreviewUrl ? (
                  <div
                    className={styles.nametagMediaImage}
                    role="img"
                    aria-label="네임텍 이미지 미리보기"
                    style={{ backgroundImage: `url("${aboutNametagPreviewUrl}")` }}
                  />
                ) : (
                  <div className={styles.nametagMediaFallback}>기본</div>
                )}
              </div>
              <div className={styles.nametagMediaActions}>
                <div className={styles.uploadRow}>
                  <label className={styles.uploadButton}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className={styles.hiddenInput}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (file) {
                          setUploadNotice(null);
                          setUploadError(null);
                          setEditorFile(file);
                          setEditorOpen(true);
                        }
                        event.currentTarget.value = '';
                      }}
                    />
                    <span>{uploadingNametag ? '업로드 중…' : '사진 선택'}</span>
                  </label>
                  <Button
                    size="sm"
                    variant="outlined"
                    onClick={() => setAboutNametagImage('')}
                    disabled={uploadingNametag || !aboutNametagImage}
                  >
                    기본 이니셜 사용
                  </Button>
                </div>
                <span className={styles.fieldHelp}>
                  업로드 전에 자르기와 확대 조정이 가능합니다. 현재 이미지를 지우려면 기본 이니셜 사용을 누른 뒤 저장하세요.
                </span>
              </div>
            </div>
            {uploadNotice && <Alert type="success" message={uploadNotice} />}
            {uploadError && <Alert type="error" message={uploadError} />}
          </div>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>Resume</span>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 200 }}
              value={aboutResume}
              onChange={(e) => setAboutResume(e.target.value)}
            />
            <span className={styles.fieldHelp}>경력·학력 등 이력 정보. 마크다운을 지원합니다.</span>
          </label>
        </div>
      </SettingsSectionShell>

      <ImageEditorModal
        open={editorOpen}
        file={editorFile}
        title="관리자 이미지 편집"
        description="About 상단 원형 아바타에 맞게 이미지를 편집합니다."
        shape="circle"
        aspectRatio={1}
        outputWidth={1024}
        confirmText="업로드"
        onCancel={handleEditorCancel}
        onConfirm={handleEditorConfirm}
      />
    </>
  );
}

function MediaPreviewCard({
  label,
  imageUrl,
  placeholder,
  variant = 'wide',
  imagePositionY = '50%',
  onChangeImagePositionY,
}: {
  label: string;
  imageUrl?: string;
  placeholder: string;
  variant?: 'wide' | 'circle';
  imagePositionY?: string;
  onChangeImagePositionY?: (value: string) => void;
}) {
  const previewUrl = resolveAssetUrl(imageUrl?.trim());
  const mediaClassName =
    variant === 'circle'
      ? `${styles.previewMedia} ${styles.previewMediaCircle}`
      : styles.previewMedia;
  const sliderValue = Number.parseInt(imagePositionY ?? '50', 10);

  return (
    <div className={styles.previewCard}>
      <div className={styles.previewMeta}>
        <Flex justify='space-between'>
          <Flex vertical gap="sm">
            <span className={styles.previewLabel}>{label}</span>
            <span className={styles.fieldHelp}>
              {previewUrl ? '현재 입력된 이미지 기준 미리보기입니다.' : placeholder}
            </span>
          </Flex>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Number.isNaN(sliderValue) ? 50 : sliderValue}
              onChange={(e) => onChangeImagePositionY?.(`${e.target.value}%`)}
            />
            <span className={styles.fieldHelp}>
              현재 위치: {imagePositionY}
            </span>
          </label>
        </Flex>
      </div>
      {previewUrl ? (
        <div
          className={mediaClassName}
          role="img"
          aria-label={label}
          style={{
            backgroundImage: `url("${previewUrl}")`,
            backgroundPosition: `center ${imagePositionY}`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            height: '330px'
          }}
        />
      ) : (
        <div className={`${mediaClassName} ${styles.previewPlaceholder}`}>
          <span>{placeholder}</span>
        </div>
      )}
    </div>
  );
}

// ─── Section: Public 메뉴 ─────────────────────────────────────────────────────

function PublicMenuSection({ settings, onSave }: SectionProps) {
  const initial = useMemo(
    () => safeParseJsonArray<PublicMenuItem>(settings.public_menu, []),
    [settings.public_menu],
  );
  const [items, setItems] = useState<PublicMenuItem[]>(initial);
  const { saving, runSaving } = useSavingAction();

  const updateItem = (index: number, patch: Partial<PublicMenuItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const swap = index + direction;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const add = () => {
    setItems((prev) => [
      ...prev,
      { key: `menu-${Date.now()}`, label: '새 메뉴', href: '/', enabled: true },
    ]);
  };

  const submit = async () => {
    try {
      await runSaving(() => onSave({ public_menu: JSON.stringify(items) }));
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="Public 메뉴 관리"
      description="공개 영역 상단 네비게이션에 노출되는 메뉴를 추가·삭제·정렬합니다. 비활성화된 항목은 숨김 처리됩니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <SettingsListEditor
        hasItems={items.length > 0}
        emptyMessage="등록된 메뉴가 없습니다."
        addLabel="+ 메뉴 추가"
        onAdd={add}
      >
        {items.map((item, index) => {
          const actions: ActionItem[] = [
            {
              key: 'move-up',
              label: '↑',
              variant: 'text',
              disabled: index === 0,
              onClick: () => move(index, -1),
            },
            {
              key: 'move-down',
              label: '↓',
              variant: 'text',
              disabled: index === items.length - 1,
              onClick: () => move(index, 1),
            },
            {
              key: 'delete',
              label: '삭제',
              variant: 'text',
              confirm: {
                title: '삭제하시겠습니까?',
                onConfirm: () => remove(index),
              },
            },
          ];

          return (
            <div key={item.key} className={styles.listItem}>
              <Input
                value={item.label}
                placeholder="레이블"
                onChange={(e) => updateItem(index, { label: e.target.value })}
              />
              <Input
                value={item.href}
                placeholder="/path"
                onChange={(e) => updateItem(index, { href: e.target.value })}
              />
              <div className={styles.switchRow}>
                <Switch
                  checked={item.enabled}
                  onChange={(checked) => updateItem(index, { enabled: checked })}
                />
                <span className={styles.fieldHelp}>표시</span>
              </div>
              <ActionGroup className={styles.listItemActions} actions={actions} />
            </div>
          );
        })}
      </SettingsListEditor>
    </SettingsSectionShell>
  );
}

// ─── Section: 테마 ────────────────────────────────────────────────────────────

function ThemeSection({ settings, onSave }: SectionProps) {
  const [defaultTheme, setDefaultTheme] = useState<Theme>(
    (settings.default_theme as Theme) || 'light',
  );
  const [allowSwitch, setAllowSwitch] = useState<boolean>(
    toBool(settings.allow_theme_switch),
  );
  const { saving, runSaving } = useSavingAction();

  const submit = async () => {
    try {
      await runSaving(() =>
        onSave({
          default_theme: defaultTheme,
          allow_theme_switch: fromBool(allowSwitch),
        }),
      );
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="테마 설정"
      description="사이트 기본 테마와 방문자의 테마 변경 허용 여부를 설정합니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>기본 테마</span>
          <Select
            options={THEME_OPTIONS}
            value={defaultTheme}
            onChange={(value) => setDefaultTheme((value as Theme) ?? 'light')}
          />
          <span className={styles.fieldHelp}>방문자에게 처음 보여지는 테마입니다.</span>
        </label>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>방문자 테마 변경 허용</span>
          <div className={styles.switchRow}>
            <Switch checked={allowSwitch} onChange={setAllowSwitch} />
            <span className={styles.fieldHelp}>
              {allowSwitch ? '공개 영역에 테마 전환 버튼을 노출합니다.' : '테마 전환 버튼을 숨깁니다.'}
            </span>
          </div>
        </div>
      </div>

    </SettingsSectionShell>
  );
}

// ─── Section: 전역 링크 ───────────────────────────────────────────────────────

function GlobalLinksSection({ settings, onSave }: SectionProps) {
  const initial = useMemo(
    () => parseGlobalLinks(settings),
    [settings],
  );
  const [items, setItems] = useState<SocialLinkItem[]>(initial);
  const { saving, runSaving } = useSavingAction();

  const updateItem = (index: number, patch: Partial<SocialLinkItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const add = () => {
    setItems((prev) => [...prev, { label: '', url: '' }]);
  };

  const submit = async () => {
    try {
      const cleaned = items
        .map((item) => ({
          label: item.label.trim(),
          url: item.url.trim(),
          icon: item.icon?.trim() || undefined,
        }))
        .filter((item) => item.label && item.url);
      await runSaving(() =>
        onSave({
          social_links: JSON.stringify(cleaned),
          about_links: '',
        }),
      );
      setItems(cleaned);
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="전역 링크"
      description="홈, About, 푸터에 공통으로 노출되는 외부 링크 목록입니다. 기존 About 전용 링크도 저장 시 이 목록으로 통합됩니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <SettingsListEditor
        hasItems={items.length > 0}
        emptyMessage="등록된 전역 링크가 없습니다."
        addLabel="+ 링크 추가"
        onAdd={add}
      >
        {items.map((item, index) => {
          const actions: ActionItem[] = [
            {
              key: 'delete',
              label: '삭제',
              variant: 'text',
              confirm: {
                title: '삭제하시겠습니까?',
                onConfirm: () => remove(index),
              },
            },
          ];

          return (
            <div
              key={index}
              className={`${styles.listItem} ${styles.listItemSocial}`}
            >
              <Input
                value={item.label}
                placeholder="GitHub, Email…"
                onChange={(e) => updateItem(index, { label: e.target.value })}
              />
              <Input
                value={item.url}
                placeholder="https://… 또는 mailto:…"
                onChange={(e) => updateItem(index, { url: e.target.value })}
              />
              <ActionGroup className={styles.listItemActions} actions={actions} />
            </div>
          );
        })}
      </SettingsListEditor>
    </SettingsSectionShell>
  );
}

// ─── Section: SEO ─────────────────────────────────────────────────────────────

function SeoSection({ settings, onSave }: SectionProps) {
  const [homeTitle, setHomeTitle] = useState(settings.seo_home_title ?? '');
  const [homeDescription, setHomeDescription] = useState(
    settings.seo_home_description ?? '',
  );
  const [robots, setRobots] = useState(settings.seo_robots || 'index,follow');
  const [sitemap, setSitemap] = useState(toBool(settings.enable_sitemap));
  const [rss, setRss] = useState(toBool(settings.enable_rss));
  const { saving, runSaving } = useSavingAction();

  const submit = async () => {
    try {
      await runSaving(() =>
        onSave({
          seo_home_title: homeTitle.trim(),
          seo_home_description: homeDescription.trim(),
          seo_robots: robots,
          enable_sitemap: fromBool(sitemap),
          enable_rss: fromBool(rss),
        }),
      );
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="SEO 설정"
      description="홈 검색 노출 문구와 크롤링 정책, 사이트맵·RSS 노출 여부를 설정합니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <div className={styles.fieldGrid}>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>홈 검색 제목</span>
          <Input
            value={homeTitle}
            placeholder="비워두면 사이트 이름을 사용합니다."
            onChange={(event) => setHomeTitle(event.target.value)}
          />
          <span className={styles.fieldHelp}>
            홈(`/`)의 HTML title에 사용됩니다. 검색엔진은 상황에 따라 다른 제목으로 다시 표시할 수 있습니다.
          </span>
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>홈 검색 설명</span>
          <textarea
            className={styles.textarea}
            value={homeDescription}
            placeholder="비워두면 사이트 설명을 사용합니다."
            onChange={(event) => setHomeDescription(event.target.value)}
          />
          <span className={styles.fieldHelp}>
            홈(`/`)의 meta description에 사용됩니다. 검색엔진은 검색어에 따라 본문 일부를 대신 노출할 수 있습니다.
          </span>
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>robots 메타</span>
          <Select
            options={ROBOTS_OPTIONS}
            value={robots}
            onChange={(value) => setRobots((value as string) ?? 'index,follow')}
          />
        </label>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Sitemap 노출</span>
          <div className={styles.switchRow}>
            <Switch checked={sitemap} onChange={setSitemap} />
            <span className={styles.fieldHelp}>/sitemap.xml 경로를 활성화합니다.</span>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>RSS 노출</span>
          <div className={styles.switchRow}>
            <Switch checked={rss} onChange={setRss} />
            <span className={styles.fieldHelp}>/rss.xml 경로를 활성화합니다.</span>
          </div>
        </div>
      </div>

    </SettingsSectionShell>
  );
}

// ─── Section: 댓글 필터링 ─────────────────────────────────────────────────────

function CommentFilterSection({ settings, onSave }: SectionProps) {
  const [keywords, setKeywords] = useState(settings.filter_keywords ?? '');
  const { saving, runSaving } = useSavingAction();

  const submit = async () => {
    try {
      await runSaving(() => onSave({ filter_keywords: keywords }));
    } catch {
      // handled upstream
    }
  };

  return (
    <SettingsSectionShell
      title="댓글 필터링 키워드"
      description="지정된 키워드가 포함된 댓글은 자동 보류 처리되어 관리자의 승인을 거쳐 공개됩니다."
      footer={<SettingsSubmitButton onClick={submit} loading={saving} />}
    >
      <div className={styles.fieldGrid}>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>필터링 키워드</span>
          <textarea
            className={styles.textarea}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="스팸,광고,..."
          />
          <span className={styles.fieldHelp}>쉼표(,)로 구분하여 입력합니다.</span>
        </label>
      </div>

    </SettingsSectionShell>
  );
}

// ─── Section: 카테고리 ────────────────────────────────────────────────────────

interface CategoriesSectionProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

type CategoryDraft = {
  id: number | 'new';
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  postCount: number;
  dirty: boolean;
};

function fromCategory(c: Category): CategoryDraft {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    sortOrder: c.sortOrder,
    postCount: c._count?.posts ?? 0,
    dirty: false,
  };
}

function CategoriesSection({ onError, onSuccess }: CategoriesSectionProps) {
  const [drafts, setDrafts] = useState<CategoryDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await studioCategoriesService.getAll();
      setDrafts(list.map(fromCategory));
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (id: number | 'new', next: Partial<CategoryDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...next, dirty: true } : d)),
    );
  };

  const addDraft = () => {
    if (drafts.some((d) => d.id === 'new')) return;
    setDrafts((prev) => [
      {
        id: 'new',
        name: '',
        slug: '',
        description: '',
        sortOrder: prev.length,
        postCount: 0,
        dirty: true,
      },
      ...prev,
    ]);
  };

  const cancelNew = () => {
    setDrafts((prev) => prev.filter((d) => d.id !== 'new'));
  };

  const saveDraft = async (draft: CategoryDraft) => {
    if (!draft.name.trim()) {
      onError('이름을 입력해주세요.');
      return;
    }
    setBusyId(draft.id);
    try {
      if (draft.id === 'new') {
        const payload: CreateCategoryPayload = {
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          description: draft.description.trim() || undefined,
          sortOrder: draft.sortOrder,
        };
        await studioCategoriesService.create(payload);
        onSuccess('카테고리가 추가되었습니다.');
      } else {
        const payload: UpdateCategoryPayload = {
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          description: draft.description.trim() || undefined,
          sortOrder: draft.sortOrder,
        };
        await studioCategoriesService.update(draft.id, payload);
        onSuccess('카테고리가 수정되었습니다.');
      }
      await load();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      await studioCategoriesService.remove(id);
      onSuccess('카테고리가 삭제되었습니다.');
      await load();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SettingsSectionShell
      title="카테고리 관리"
      description="글을 분류하는 카테고리를 추가·수정·삭제합니다. 삭제된 카테고리의 글은 미분류 상태로 돌아갑니다."
    >
      {loading ? (
        <div className={styles.inlineStatus}>
          <Spin size="sm" />
          <span className={styles.fieldHelp}>불러오는 중…</span>
        </div>
      ) : (
        <SettingsListEditor
          hasItems={drafts.length > 0}
          emptyMessage="등록된 카테고리가 없습니다."
          addLabel="+ 카테고리 추가"
          onAdd={addDraft}
        >
          {drafts.map((draft) => {
            const actions: ActionItem[] = [
              {
                key: 'save',
                label: '저장',
                variant: 'solid',
                disabled: !draft.dirty,
                loading: busyId === draft.id,
                onClick: () => saveDraft(draft),
              },
              draft.id === 'new'
                ? {
                    key: 'cancel',
                    label: '취소',
                    variant: 'text',
                    onClick: cancelNew,
                  }
                : {
                    key: 'delete',
                    label: '삭제',
                    variant: 'text',
                    confirm: {
                      title: '삭제하시겠습니까?',
                      description: '연결된 글은 미분류 상태로 전환됩니다.',
                      onConfirm: () => remove(draft.id as number),
                    },
                  },
            ];

            return (
              <div
                key={String(draft.id)}
                className={`${styles.listItem} ${styles.listItemCategory}`}
              >
                <Input
                  value={draft.name}
                  placeholder="이름"
                  onChange={(e) => patch(draft.id, { name: e.target.value })}
                />
                <Input
                  value={draft.slug}
                  placeholder="slug (비우면 자동 생성)"
                  onChange={(e) => patch(draft.id, { slug: e.target.value })}
                />
                <Input
                  type="number"
                  value={String(draft.sortOrder)}
                  onChange={(e) =>
                    patch(draft.id, {
                      sortOrder: Number(e.target.value) || 0,
                    })
                  }
                />
                <div className={styles.listItemActions}>
                  <span className={styles.fieldHelp}>
                    {draft.id === 'new' ? '신규' : `글 ${draft.postCount}`}
                  </span>
                  <ActionGroup className={styles.listItemButtons} actions={actions} />
                </div>
              </div>
            );
          })}
        </SettingsListEditor>
      )}
    </SettingsSectionShell>
  );
}

// ─── Section: 계정/보안 ───────────────────────────────────────────────────────

interface SecuritySectionProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

function SecuritySection({ onError, onSuccess }: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { saving, runSaving } = useSavingAction();
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    if (newPassword.length < 6) {
      setLocalError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      await runSaving(() => authService.changePassword({ currentPassword, newPassword }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess('비밀번호가 변경되었습니다. 다음 요청부터 새 세션이 적용됩니다.');
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  return (
    <SettingsSectionShell
      title="계정 / 보안"
      description="관리자 계정의 비밀번호를 변경합니다. 변경 시 모든 기기의 로그인 세션이 초기화됩니다."
      footer={(
        <SettingsSubmitButton
          onClick={submit}
          loading={saving}
          label="비밀번호 변경"
          disabled={!currentPassword || !newPassword || !confirmPassword}
        />
      )}
    >
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>현재 비밀번호</span>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <div className={styles.field} />
        <label className={styles.field}>
          <span className={styles.fieldLabel}>새 비밀번호</span>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>새 비밀번호 확인</span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
      </div>

      {localError && <Alert type="error" message={localError} />}

    </SettingsSectionShell>
  );
}
