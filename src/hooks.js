import { useEffect, useMemo, useRef, useState } from "react";

export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export function useInfiniteScroll({ hasMore, loading, onLoadMore }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!hasMore) return;
    if (loading) return;

    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return ref;
}

export function randomSeed64() {
  if (crypto?.getRandomValues) {
    const a = new BigUint64Array(1);
    crypto.getRandomValues(a);
    return a[0].toString();
  }
  return String(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
