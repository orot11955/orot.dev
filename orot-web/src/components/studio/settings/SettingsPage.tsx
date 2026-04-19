'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Input,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Tabs,
  Typography,
} from 'orot-ui';
import { ImageEditorModal } from '@/components/ImageEditorModal';
import { useNotificationEffect } from '@/hooks';
import {
  authService,
  studioCategoriesService,
  studioGalleryService,
  studioSettingsService,
} from '@/services';
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
import { getErrorMessage, resolveAssetUrl } from '@/utils/content';
import styles from './Settings.module.css';

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

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

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
      children: <SiteInfoSection settings={settings} onSave={save} />,
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
      label: '소셜 링크',
      children: <SocialLinksSection settings={settings} onSave={save} />,
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

function SiteInfoSection({ settings, onSave }: SectionProps) {
  const [siteName, setSiteName] = useState(settings.site_name ?? '');
  const [siteDescription, setSiteDescription] = useState(settings.site_description ?? '');
  const [siteLogo, setSiteLogo] = useState(settings.site_logo ?? '');
  const [siteOgImage, setSiteOgImage] = useState(settings.site_og_image ?? '');
  const [homeHeroImage, setHomeHeroImage] = useState(settings.home_hero_image ?? '');
  const [heroCandidates, setHeroCandidates] = useState<GalleryItem[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroLoadError, setHeroLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        site_name: siteName.trim(),
        site_description: siteDescription.trim(),
        site_logo: siteLogo.trim(),
        site_og_image: siteOgImage.trim(),
        home_hero_image: homeHeroImage.trim(),
      });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          사이트 정보
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          사이트 이름, 설명, 로고, 기본 OpenGraph 이미지를 설정합니다.
        </Typography.Paragraph>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>사이트 이름</span>
          <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>로고 URL</span>
          <Input
            value={siteLogo}
            placeholder="https://..."
            onChange={(e) => setSiteLogo(e.target.value)}
          />
          <span className={styles.fieldHelp}>비워두면 기본 텍스트 로고를 사용합니다.</span>
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
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>기본 OpenGraph 이미지 URL</span>
          <Input
            value={siteOgImage}
            placeholder="https://..."
            onChange={(e) => setSiteOgImage(e.target.value)}
          />
          <span className={styles.fieldHelp}>1200 × 630 권장. 각 글에 og 이미지가 없을 때 이 값을 사용합니다.</span>
        </label>
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
          placeholder="자동 선택 사용 시 공개 사진 또는 OG 이미지가 대신 사용됩니다."
        />
      </div>
      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── Section: About ───────────────────────────────────────────────────────────

function AboutSection({ settings, onSave, onSettingsChange }: SectionProps) {
  const [aboutContent, setAboutContent] = useState(settings.about_content ?? '');
  const [aboutStack, setAboutStack] = useState(settings.about_stack ?? '');
  const [aboutResume, setAboutResume] = useState(settings.about_resume ?? '');
  const [aboutLinks, setAboutLinks] = useState(settings.about_links ?? '');
  const [aboutNametagImage, setAboutNametagImage] = useState(
    settings.about_nametag_image ?? '',
  );
  const [uploadingNametag, setUploadingNametag] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    try {
      await onSave({
        about_content: aboutContent,
        about_stack: aboutStack,
        about_resume: aboutResume,
        about_links: aboutLinks,
        about_nametag_image: aboutNametagImage.trim(),
      });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          About 관리
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          About 페이지에 노출되는 소개글과 기술 스택, Resume, 외부 링크 목록을 편집합니다.
        </Typography.Paragraph>
      </div>

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
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.fieldLabel}>링크 목록</span>
          <textarea
            className={styles.textarea}
            value={aboutLinks}
            onChange={(e) => setAboutLinks(e.target.value)}
            placeholder={'GitHub|https://github.com/orot\nEmail|mailto:hi@orot.dev'}
          />
          <span className={styles.fieldHelp}>한 줄에 하나씩 <code>레이블|URL</code> 형식으로 입력합니다.</span>
        </label>
      </div>

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>

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
    </div>
  );
}

function MediaPreviewCard({
  label,
  imageUrl,
  placeholder,
  variant = 'wide',
}: {
  label: string;
  imageUrl?: string;
  placeholder: string;
  variant?: 'wide' | 'circle';
}) {
  const previewUrl = resolveAssetUrl(imageUrl?.trim());
  const mediaClassName =
    variant === 'circle'
      ? `${styles.previewMedia} ${styles.previewMediaCircle}`
      : styles.previewMedia;

  return (
    <div className={styles.previewCard}>
      <div className={styles.previewMeta}>
        <span className={styles.previewLabel}>{label}</span>
        <span className={styles.fieldHelp}>
          {previewUrl ? '현재 입력된 이미지 기준 미리보기입니다.' : placeholder}
        </span>
      </div>
      {previewUrl ? (
        <div
          className={mediaClassName}
          role="img"
          aria-label={label}
          style={{ backgroundImage: `url("${previewUrl}")` }}
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
    () => parseJsonArray<PublicMenuItem>(settings.public_menu, []),
    [settings.public_menu],
  );
  const [items, setItems] = useState<PublicMenuItem[]>(initial);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await onSave({ public_menu: JSON.stringify(items) });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          Public 메뉴 관리
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          공개 영역 상단 네비게이션에 노출되는 메뉴를 추가·삭제·정렬합니다. 비활성화된 항목은 숨김 처리됩니다.
        </Typography.Paragraph>
      </div>

      <div className={styles.listWrap}>
        {items.length === 0 ? (
          <div className={styles.emptyList}>등록된 메뉴가 없습니다.</div>
        ) : (
          items.map((item, index) => (
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
              <div className={styles.listItemActions}>
                <Button
                  size="sm"
                  variant="text"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="text"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Popconfirm title="삭제하시겠습니까?" onConfirm={() => remove(index)}>
                  <Button size="sm" variant="text">
                    삭제
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ))
        )}
        <div className={styles.addRow}>
          <Button variant="outlined" onClick={add}>
            + 메뉴 추가
          </Button>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
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
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        default_theme: defaultTheme,
        allow_theme_switch: fromBool(allowSwitch),
      });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          테마 설정
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          사이트 기본 테마와 방문자의 테마 변경 허용 여부를 설정합니다.
        </Typography.Paragraph>
      </div>

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

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── Section: 소셜 링크 ───────────────────────────────────────────────────────

function SocialLinksSection({ settings, onSave }: SectionProps) {
  const initial = useMemo(
    () => parseJsonArray<SocialLinkItem>(settings.social_links, []),
    [settings.social_links],
  );
  const [items, setItems] = useState<SocialLinkItem[]>(initial);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const cleaned = items
        .map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
        .filter((item) => item.label && item.url);
      await onSave({ social_links: JSON.stringify(cleaned) });
      setItems(cleaned);
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          소셜 링크
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          푸터 및 About 영역에 노출되는 외부 링크 목록입니다.
        </Typography.Paragraph>
      </div>

      <div className={styles.listWrap}>
        {items.length === 0 ? (
          <div className={styles.emptyList}>등록된 소셜 링크가 없습니다.</div>
        ) : (
          items.map((item, index) => (
            <div key={index} className={styles.listItem} style={{ gridTemplateColumns: '160px 1fr auto' }}>
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
              <Popconfirm title="삭제하시겠습니까?" onConfirm={() => remove(index)}>
                <Button size="sm" variant="text">
                  삭제
                </Button>
              </Popconfirm>
            </div>
          ))
        )}
        <div className={styles.addRow}>
          <Button variant="outlined" onClick={add}>
            + 링크 추가
          </Button>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── Section: SEO ─────────────────────────────────────────────────────────────

function SeoSection({ settings, onSave }: SectionProps) {
  const [robots, setRobots] = useState(settings.seo_robots || 'index,follow');
  const [sitemap, setSitemap] = useState(toBool(settings.enable_sitemap));
  const [rss, setRss] = useState(toBool(settings.enable_rss));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        seo_robots: robots,
        enable_sitemap: fromBool(sitemap),
        enable_rss: fromBool(rss),
      });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          SEO 설정
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          검색엔진 크롤링 정책과 사이트맵·RSS 노출 여부를 설정합니다.
        </Typography.Paragraph>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
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

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── Section: 댓글 필터링 ─────────────────────────────────────────────────────

function CommentFilterSection({ settings, onSave }: SectionProps) {
  const [keywords, setKeywords] = useState(settings.filter_keywords ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ filter_keywords: keywords });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          댓글 필터링 키워드
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          지정된 키워드가 포함된 댓글은 자동 보류 처리되어 관리자의 승인을 거쳐 공개됩니다.
        </Typography.Paragraph>
      </div>

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

      <div className={styles.actions}>
        <Button variant="solid" onClick={submit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
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
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          카테고리 관리
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          글을 분류하는 카테고리를 추가·수정·삭제합니다. 삭제된 카테고리의 글은 미분류 상태로 돌아갑니다.
        </Typography.Paragraph>
      </div>

      {loading ? (
        <div className={styles.inlineStatus}>
          <Spin size="sm" />
          <span className={styles.fieldHelp}>불러오는 중…</span>
        </div>
      ) : (
        <div className={styles.listWrap}>
          {drafts.length === 0 ? (
            <div className={styles.emptyList}>등록된 카테고리가 없습니다.</div>
          ) : (
            drafts.map((draft) => (
              <div
                key={String(draft.id)}
                className={styles.listItem}
                style={{ gridTemplateColumns: '1fr 1fr 120px auto' }}
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
                  <Button
                    size="sm"
                    variant="solid"
                    loading={busyId === draft.id}
                    disabled={!draft.dirty}
                    onClick={() => saveDraft(draft)}
                  >
                    저장
                  </Button>
                  {draft.id === 'new' ? (
                    <Button size="sm" variant="text" onClick={cancelNew}>
                      취소
                    </Button>
                  ) : (
                    <Popconfirm
                      title="삭제하시겠습니까?"
                      description="연결된 글은 미분류 상태로 전환됩니다."
                      onConfirm={() => remove(draft.id as number)}
                    >
                      <Button size="sm" variant="text">
                        삭제
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))
          )}
          <div className={styles.addRow}>
            <Button variant="outlined" onClick={addDraft}>
              + 카테고리 추가
            </Button>
          </div>
        </div>
      )}
    </div>
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
  const [saving, setSaving] = useState(false);
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

    setSaving(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess('비밀번호가 변경되었습니다. 다음 요청부터 새 세션이 적용됩니다.');
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          계정 / 보안
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          관리자 계정의 비밀번호를 변경합니다. 변경 시 모든 기기의 로그인 세션이 초기화됩니다.
        </Typography.Paragraph>
      </div>

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

      <div className={styles.actions}>
        <Button
          variant="solid"
          onClick={submit}
          loading={saving}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          비밀번호 변경
        </Button>
      </div>
    </div>
  );
}
