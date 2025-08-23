'use client';

import React, { useState } from 'react';
import { useLazyImage } from '@/hooks/useIntersectionObserver';
import { Skeleton } from './SkeletonLoader';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
  containerClassName?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  blurDataURL,
  width,
  height,
  priority = false,
  quality = 75,
  sizes = '100vw',
  onLoad,
  onError,
  style,
  containerClassName,
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  const { ref, src: lazySrc, isLoaded } = useLazyImage(src, placeholder);

  // Handle priority loading (for above-the-fold images)
  React.useEffect(() => {
    if (priority) {
      setImageSrc(src);
    }
  }, [priority, src]);

  // Handle lazy loading
  React.useEffect(() => {
    if (isLoaded && !priority) {
      setImageSrc(lazySrc || src);
    }
  }, [isLoaded, lazySrc, src, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc: string) => {
    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map((w) => {
        // For demo purposes, using the same image. In production, you'd have different sizes
        return `${baseSrc}?w=${w}&q=${quality} ${w}w`;
      })
      .join(', ');
  };

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ width, height, ...style }}
    >
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <Skeleton
          className={cn(
            'absolute inset-0 w-full h-full',
            className
          )}
        />
      )}

      {/* Blur placeholder */}
      {blurDataURL && isLoading && (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover filter blur-sm scale-110',
            className
          )}
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800',
            className
          )}
        >
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Main image */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          srcSet={priority ? generateSrcSet(src) : undefined}
          sizes={priority ? sizes : undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

// Progressive image component with multiple quality levels
interface ProgressiveImageProps extends Omit<LazyImageProps, 'src'> {
  src: {
    low: string;
    medium: string;
    high: string;
    original: string;
  };
  progressive?: boolean;
}

export function ProgressiveImage({
  src,
  progressive = true,
  quality = 75,
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState(
    progressive ? src.low : src.original
  );
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(!progressive);

  const handleProgressiveLoad = () => {
    if (progressive && !isHighQualityLoaded) {
      // Load medium quality first
      const img = new Image();
      img.src = src.medium;
      img.onload = () => {
        setCurrentSrc(src.medium);

        // Then load high quality
        const highImg = new Image();
        highImg.src = src.high;
        highImg.onload = () => {
          setCurrentSrc(src.high);
          setIsHighQualityLoaded(true);
        };
      };
    }
  };

  return (
    <LazyImage
      {...props}
      src={currentSrc}
      onLoad={handleProgressiveLoad}
      quality={quality}
    />
  );
}

// Optimized image component for product images
export function ProductImage({
  src,
  alt,
  className,
  ...props
}: LazyImageProps) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn('transition-transform hover:scale-105', className)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85}
      {...props}
    />
  );
}