'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './HomePage.module.css';

interface HomeHeroImageProps {
  src: string;
  previewSrc: string | null;
  alt: string;
  objectPosition: string;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function HomeHeroImage({
  src,
  previewSrc,
  alt,
  objectPosition,
}: HomeHeroImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const hasPreview = Boolean(previewSrc && previewSrc !== src);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <>
      {hasPreview && previewSrc ? (
        <Image
          src={previewSrc}
          alt=""
          aria-hidden="true"
          fill
          unoptimized
          sizes="100vw"
          style={{ objectPosition }}
          className={cx(
            styles.heroImage,
            styles.heroPreviewImage,
            isLoaded && styles.heroPreviewHidden,
          )}
        />
      ) : null}
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        priority
        unoptimized
        sizes="100vw"
        style={{ objectPosition }}
        onLoad={() => setIsLoaded(true)}
        className={cx(
          styles.heroImage,
          hasPreview && styles.heroOriginalImage,
          isLoaded && styles.heroOriginalLoaded,
        )}
      />
    </>
  );
}
