'use client';

import { useLayoutEffect, useRef, useState } from 'react';
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

function imageIsReady(image: HTMLImageElement | null): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

function revealAfterDecode(image: HTMLImageElement, onReady: () => void) {
  if (typeof image.decode !== 'function') {
    onReady();
    return;
  }

  image.decode().then(onReady, onReady);
}

export function HomeHeroImage({
  src,
  previewSrc,
  alt,
  objectPosition,
}: HomeHeroImageProps) {
  const originalImageRef = useRef<HTMLImageElement>(null);
  const hasPreview = Boolean(previewSrc && previewSrc !== src);
  const [isLoaded, setIsLoaded] = useState(false);

  useLayoutEffect(() => {
    const originalImage = originalImageRef.current;
    let cancelled = false;

    setIsLoaded(false);

    if (!imageIsReady(originalImage)) {
      return () => {
        cancelled = true;
      };
    }

    revealAfterDecode(originalImage, () => {
      if (!cancelled && originalImageRef.current === originalImage) {
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <>
      {hasPreview && previewSrc ? (
        <Image
          src={previewSrc}
          alt=""
          aria-hidden="true"
          fill
          priority
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
        onLoad={(event) => {
          const image = event.currentTarget;

          revealAfterDecode(image, () => {
            if (originalImageRef.current === image) {
              setIsLoaded(true);
            }
          });
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
