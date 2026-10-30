import { useEffect, useState, type CSSProperties } from 'react';
import { ImageOff } from 'lucide-react';
import { cn, imageSrc, imageSrcSet, publicAsset } from '@/lib/utils';

interface SafeImageProps {
  source: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  width?: number;
  sizes?: string;
  eager?: boolean;
  priority?: boolean;
  objectPosition?: string;
  style?: CSSProperties;
}

/**
 * Responsive image that understands local optimized asset keys as well as
 * remote/data URLs. Invalid images fall back to an editorial placeholder.
 */
export function SafeImage({
  source,
  alt,
  className,
  wrapperClassName,
  width = 960,
  sizes = '(max-width: 768px) 100vw, 50vw',
  eager = false,
  priority = false,
  objectPosition,
  style,
}: SafeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!source);
  const src = source ? imageSrc(source, width) : publicAsset('/images/placeholder.svg');
  const srcSet = source ? imageSrcSet(source) : undefined;

  useEffect(() => {
    setLoaded(false);
    setFailed(!source);
  }, [source]);

  return (
    <span className={cn('relative block overflow-hidden bg-stone/70', wrapperClassName)}>
      {!loaded && !failed && (
        <span className="skeleton absolute inset-0 block" aria-hidden="true" />
      )}
      {failed ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone text-ink/65">
          <ImageOff className="h-6 w-6" aria-hidden />
          <span className="px-4 text-center text-[9px] uppercase tracking-[0.18em]">სურათი მიუწვდომელია</span>
        </span>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={eager || priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
          style={{ ...(objectPosition ? { objectPosition } : {}), ...style }}
        />
      )}
    </span>
  );
}
