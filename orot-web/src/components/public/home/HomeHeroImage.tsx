'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './HomePage.module.css';

interface HomeHeroImageProps {
  src: string;
  previewSrc: string | null;
  alt: string;
  objectPosition: string;
}

const loadedHeroSources = new Set<string>();

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function HomeHeroImage({
  src,
  previewSrc,
  alt,
  objectPosition,
}: HomeHeroImageProps) {
  const originalImageRef = useRef<HTMLImageElement>(null);
  const hasPreview = Boolean(previewSrc && previewSrc !== src);
  const [isLoaded, setIsLoaded] = useState(() => loadedHeroSources.has(src));

  useEffect(() => {
    const originalImage = originalImageRef.current;
    const isAlreadyLoaded = Boolean(
      originalImage?.complete && originalImage.naturalWidth > 0,
    );

    if (isAlreadyLoaded) {
      loadedHeroSources.add(src);
    }

    setIsLoaded(isAlreadyLoaded || loadedHeroSources.has(src));
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
        ref={originalImageRef}
        src={src}
        alt={alt}
        fill
        priority
        unoptimized
        sizes="100vw"
        style={{ objectPosition }}
        onLoad={() => {
          loadedHeroSources.add(src);
          setIsLoaded(true);
        }}
        className={cx(
          styles.heroImage,
          hasPreview && styles.heroOriginalImage,
          isLoaded && styles.heroOriginalLoaded,
        )}
      />
    </>
  );
}
