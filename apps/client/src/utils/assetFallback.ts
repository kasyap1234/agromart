/**
 * Asset fallback utility for handling Next.js 404 errors and MIME type issues
 */

interface AssetFallbackOptions {
  retries?: number;
  timeout?: number;
  fallbackUrl?: string;
}

const DEFAULT_OPTIONS: AssetFallbackOptions = {
  retries: 3,
  timeout: 5000,
  fallbackUrl: undefined,
};

/**
 * Load an asset with fallback handling
 */
export async function loadAssetWithFallback(
  url: string,
  options: AssetFallbackOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= (opts.retries || 0); attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': getAcceptHeader(url),
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // If we get a 404 or other error, try fallback
      if (response.status === 404 && opts.fallbackUrl && opts.fallbackUrl !== url) {
        console.warn(`[AssetFallback] Primary asset not found: ${url}, trying fallback: ${opts.fallbackUrl}`);
        return loadAssetWithFallback(opts.fallbackUrl, { ...opts, fallbackUrl: undefined });
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.retries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new Error(`Failed to load asset after ${opts.retries} retries: ${url}`);
}

/**
 * Get appropriate Accept header based on file extension
 */
function getAcceptHeader(url: string): string {
  const ext = url.substring(url.lastIndexOf('.')).toLowerCase();

  const acceptHeaders: Record<string, string> = {
    '.js': 'application/javascript, text/javascript',
    '.mjs': 'application/javascript, text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png, image/*',
    '.jpg': 'image/jpeg, image/*',
    '.jpeg': 'image/jpeg, image/*',
    '.gif': 'image/gif, image/*',
    '.svg': 'image/svg+xml, image/*',
    '.woff': 'font/woff, font/*',
    '.woff2': 'font/woff2, font/*',
    '.ttf': 'font/ttf, font/*',
  };

  return acceptHeaders[ext] || '*/*';
}

/**
 * Preload critical assets with error handling
 */
export async function preloadCriticalAssets(assets: string[]): Promise<void> {
  const preloadPromises = assets.map(async (asset) => {
    try {
      await loadAssetWithFallback(asset);
      console.log(`[AssetFallback] Successfully preloaded: ${asset}`);
    } catch (error) {
      console.error(`[AssetFallback] Failed to preload: ${asset}`, error);
    }
  });

  await Promise.allSettled(preloadPromises);
}

/**
 * Handle dynamic import failures with fallback
 */
export async function safeDynamicImport<T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await importFn();
  } catch (error) {
    console.error('[AssetFallback] Dynamic import failed:', error);

    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

/**
 * Check if an asset exists before attempting to load it
 */
export async function assetExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}