import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Mail } from 'lucide-react';
import type { PublicSettings } from '@/types';
import { parseGlobalLinks } from '@/layouts/public/public-navigation';
import { resolveAssetUrl, splitTags } from '@/utils/content';
import styles from './AboutPage.module.css';

interface AboutPageProps {
  settings: PublicSettings | null;
}

function splitParagraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function renderInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    const isInlineCode = /^`[^`]+`$/.test(part);
    if (isInlineCode) {
      return (
        <code key={index} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });

}

export function AboutPage({ settings }: AboutPageProps) {
  const siteName = settings?.site_name?.trim() || 'orot.dev';
  const intro = splitParagraphs(settings?.about_content);
  const stack = splitTags(settings?.about_stack);
  const resume = splitParagraphs(settings?.about_resume);
  const links = parseGlobalLinks(settings);
  const nametagImageUrl = resolveAssetUrl(settings?.about_nametag_image);

  const initial = siteName.replace(/[^A-Za-z0-9가-힣]/g, '').charAt(0) || 'O';

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* ─── Name tag ─── */}
        <section className={styles.nametag}>
          <div className={styles.avatar} aria-hidden="true">
            {nametagImageUrl ? (
              <Image
                src={nametagImageUrl}
                alt={`${siteName} 네임텍 이미지`}
                fill
                sizes="72px"
                unoptimized
                className={styles.avatarImage}
              />
            ) : (
              initial.toUpperCase()
            )}
          </div>
          <div className={styles.nametagBody}>
            <span className={styles.nametagEyebrow}>ABOUT</span>
            <h1 className={styles.nametagTitle}>{siteName}</h1>
            {settings?.site_description && (
              <p className={styles.nametagDesc}>{settings.site_description}</p>
            )}
          </div>
        </section>

        <div className={styles.grid}>
          {/* ─── Intro ─── */}
          <section className={styles.block}>
            <header className={styles.blockHeader}>
              <span className={styles.blockEyebrow}>INTRO</span>
              <h2 className={styles.blockTitle}>소개</h2>
            </header>
            {intro.length > 0 ? (
              <div className={styles.prose}>
                {intro.map((p, i) => (
                  <p key={i}>{renderInlineCode(p)}</p>
                ))}
              </div>
            ) : (
              <p className={styles.placeholder}>
                소개글이 아직 작성되지 않았어요.
              </p>
            )}
          </section>

          {/* ─── Resume timeline ─── */}
          <section className={styles.block}>
            <header className={styles.blockHeader}>
              <span className={styles.blockEyebrow}>RESUME</span>
              <h2 className={styles.blockTitle}>이력</h2>
            </header>
            {stack.length > 0 && (
              <div className={styles.stackSection}>
                <div className={styles.stackTags}>
                  {stack.map((item) => (
                    <span key={item} className={styles.stackTag}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {resume.length > 0 ? (
              <ol className={styles.timeline}>
                {resume.map((entry, i) => (
                  <li key={i} className={styles.timelineItem}>
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <div className={styles.timelineBody}>
                      {entry.split('\n').map((line, j) => (
                        <p key={j}>{renderInlineCode(line)}</p>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.placeholder}>
                이력이 아직 작성되지 않았어요.
              </p>
            )}
          </section>
        </div>

        {/* ─── Links ─── */}
        {links.length > 0 && (
          <section className={styles.linksBlock}>
            <header className={styles.blockHeader}>
              <span className={styles.blockEyebrow}>LINKS</span>
              <h2 className={styles.blockTitle}>연결</h2>
            </header>
            <ul className={styles.linkList}>
              {links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkRow}
                  >
                    {link.url.startsWith('mailto:') ? (
                      <Mail size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                    <span className={styles.linkLabel}>{link.label}</span>
                    <span className={styles.linkUrl}>
                      {link.url.replace(/^mailto:/, '')}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
