"use client";

import React, { useState, useEffect, useRef } from "react";
import { resolveBackendUrl } from "@/services/customerApi";
import { getCraftFallbackImage } from "@/services/adapters";

export interface ProductImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  category?: string | null;
  craftType?: string | null;
  className?: string;
}

/**
 * Resilient product image component that:
 * 1. Attempts the real product URL first (local backend or external HTTPS).
 * 2. On 404, network error, or invalid URL, gracefully falls back to an approved craft image.
 * 3. Immediately uses the craft fallback if src is null, empty, or whitespace.
 * 4. Strictly prevents infinite onError loops.
 * 5. Preserves all native <img> attributes, accessibility alt text, and styles.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  fallbackSrc,
  category,
  craftType,
  className = "",
  onError,
  ...rest
}) => {
  // Deterministic fallback derived from props or category/craft/alt text
  const resolvedFallback =
    fallbackSrc || getCraftFallbackImage(category, craftType, alt);

  // Compute resolved initial URL
  const resolvedInitial = resolveBackendUrl(src);
  const initialUrl = resolvedInitial || resolvedFallback;

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const hasFailedRef = useRef<boolean>(!resolvedInitial);

  // Sync state when src or fallback changes
  useEffect(() => {
    const freshResolved = resolveBackendUrl(src);
    const freshTarget = freshResolved || resolvedFallback;
    setCurrentSrc(freshTarget);
    hasFailedRef.current = !freshResolved;
  }, [src, resolvedFallback]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If we have already fallen back or already at the fallback URL, stop to prevent infinite loops
    if (hasFailedRef.current || currentSrc === resolvedFallback) {
      e.currentTarget.onerror = null;
      if (onError) onError(e);
      return;
    }

    hasFailedRef.current = true;
    setCurrentSrc(resolvedFallback);
    if (onError) onError(e);
  };

  return (
    <img
      {...rest}
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default ProductImage;
