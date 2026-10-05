import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Entry = { url: string; expires: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<string | null>>();
const TTL = 60 * 60; // seconds

function cached(path: string) {
  const e = cache.get(path);
  return e && e.expires > Date.now() ? e.url : null;
}

/** Resolve (and cache) a signed URL for a path in the private `avatars` bucket; also warms the browser image cache. */
export function preloadAvatar(path?: string | null): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  if (path.startsWith('http')) return Promise.resolve(path);
  const hit = cached(path);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(path);
  if (pending) return pending;
  const p = supabase.storage.from('avatars').createSignedUrl(path, TTL).then(({ data }) => {
    inflight.delete(path);
    const url = data?.signedUrl ?? null;
    if (url) {
      cache.set(path, { url, expires: Date.now() + (TTL - 120) * 1000 });
      const img = new Image();
      img.src = url;
    }
    return url;
  });
  inflight.set(path, p);
  return p;
}

export function useAvatarUrl(path?: string | null) {
  const initial = !path ? null : path.startsWith('http') ? path : cached(path);
  const [url, setUrl] = useState<string | null>(initial);

  useEffect(() => {
    let active = true;
    const now = !path ? null : path.startsWith('http') ? path : cached(path);
    setUrl(now);
    if (path && !now) preloadAvatar(path).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);

  return url;
}
