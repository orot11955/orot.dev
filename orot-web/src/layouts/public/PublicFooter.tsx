import Link from 'next/link';
import styles from './PublicFooter.module.css';

interface PublicFooterProps {
  siteName: string;
  description?: string;
  social: Array<{ label: string; url: string; icon?: string }>;
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export function PublicFooter({
  siteName,
  description,
  social,
}: PublicFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.meta}>
          <div className={styles.brand}>{siteName}</div>
          {description && <p className={styles.desc}>{description}</p>}
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <div className={styles.columnTitle}>Explore</div>
            <div className={styles.exploreLinks}>
              <Link href="/posts" className={styles.columnLink}>
                Posts
              </Link>
              <Link href="/photos" className={styles.columnLink}>
                Photos
              </Link>
              <Link href="/about" className={styles.columnLink}>
                About
              </Link>
            </div>
          </div>

          {social.length > 0 && (
            <div className={styles.column}>
              <div className={styles.columnTitle}>Connect</div>
              <div className={styles.exploreLinks}>
                {social.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.columnLink}
                  >
                    <span>{link.label}</span>
                    <ArrowUpRightIcon className={styles.columnLinkIcon} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.baseline}>
        <span>© {new Date().getFullYear()} {siteName}</span>
        <span className={styles.baselineDivider}>·</span>
        <a href="/studio/dashboard" className={styles.baselineLink}>
          Studio
        </a>
      </div>
    </footer>
  );
}
