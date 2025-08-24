'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  triggerOnce?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element | null>;
  isIntersecting: boolean;
  hasIntersected: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    root = null,
    triggerOnce = true,
  } = options;

  const ref = useRef<Element | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create intersection observer with optimized settings
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isCurrentlyIntersecting = entry.isIntersecting;

          setIsIntersecting(isCurrentlyIntersecting);

          if (isCurrentlyIntersecting && !hasIntersected) {
            setHasIntersected(true);

            // If triggerOnce is true, unobserve after first intersection
            if (triggerOnce) {
              observer.unobserve(element);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, root, triggerOnce, hasIntersected]);

  return {
    ref,
    isIntersecting,
    hasIntersected,
  };
}

// Specialized hook for lazy loading images with blur placeholder
export function useLazyImage(src: string, placeholder?: string) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
    triggerOnce: true,
  });

  return {
    ref,
    src: isIntersecting ? src : placeholder,
    isLoaded: isIntersecting,
  };
}

// Hook for progressive loading of components
export function useProgressiveLoad(delay: number = 100) {
  const { ref, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  });

  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (hasIntersected) {
      const timer = setTimeout(() => setShouldLoad(true), delay);
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function when not intersecting
  }, [hasIntersected, delay]);

  return {
    ref,
    shouldLoad,
    hasIntersected,
  };
}