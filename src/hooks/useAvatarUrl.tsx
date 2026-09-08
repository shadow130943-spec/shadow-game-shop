import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Resolves a stored avatar path in the private `avatars` bucket to a signed URL. */
export function useAvatarUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}
