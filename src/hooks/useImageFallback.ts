import { useState, useEffect } from "react";

export function useImageFallback(src?: string) {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setHasError(false);
    setLoading(true);

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setHasError(false);
      setLoading(false);
    };
    img.onerror = () => {
      setHasError(true);
      setLoading(false);
    };
  }, [src]);

  return { hasError, loading };
}
