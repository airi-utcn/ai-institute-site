'use client';

import { useMemo, useState } from 'react';

const DEFAULT_PORTRAIT_CLASS = 'mx-auto w-auto max-w-full max-h-[60vh] object-contain';
const DEFAULT_LANDSCAPE_CLASS = 'w-full h-auto object-cover';

export default function BodyContentImage({
  src,
  alt = '',
  loading = 'lazy',
  className = '',
  portraitClassName = '',
  landscapeClassName = '',
  ...props
}) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMeasured, setIsMeasured] = useState(false);

  const onLoad = (event) => {
    const image = event.currentTarget;
    if (image?.naturalHeight && image?.naturalWidth) {
      setIsPortrait(image.naturalHeight > image.naturalWidth);
      setIsMeasured(true);
    }
  };

  const modeClass = useMemo(() => {
    if (!isMeasured) return landscapeClassName || DEFAULT_LANDSCAPE_CLASS;
    if (isPortrait) return portraitClassName || DEFAULT_PORTRAIT_CLASS;
    return landscapeClassName || DEFAULT_LANDSCAPE_CLASS;
  }, [isMeasured, isPortrait, portraitClassName, landscapeClassName]);

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={onLoad}
      className={`${className} ${modeClass}`.trim()}
      {...props}
    />
  );
}
