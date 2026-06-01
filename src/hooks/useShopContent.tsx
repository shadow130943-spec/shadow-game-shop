import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PackageOverride {
  game_code: string;
  catalogue_name: string;
  display_name: string | null;
  price_mmk_override: number | null;
  is_hidden: boolean;
}

export interface GameAsset {
  game_code: string;
  logo_url: string;
}

export interface BrandingAsset {
  key: string;
  image_url: string;
}

/** Fetch a single branding image by key (e.g. 'hero_banner', 'site_logo', 'favicon'). */
export function useBrandingAsset(key: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase
      .from('branding_assets')
      .select('image_url')
      .eq('key', key)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data?.image_url) setUrl(data.image_url);
      });
    return () => { alive = false; };
  }, [key]);
  return url;
}

/** Fetch the full game_code -> logo_url map. */
export function useGameLogos(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('game_assets').select('game_code, logo_url').then(({ data }) => {
      if (data) {
        const m: Record<string, string> = {};
        data.forEach((row) => { m[row.game_code] = row.logo_url; });
        setMap(m);
      }
    });
  }, []);
  return map;
}

/** Fetch package overrides, optionally filtered by game_code. */
export function usePackageOverrides(gameCode?: string) {
  const [overrides, setOverrides] = useState<PackageOverride[]>([]);
  useEffect(() => {
    const q = supabase.from('package_overrides').select('*');
    (gameCode ? q.eq('game_code', gameCode) : q).then(({ data }) => {
      if (data) setOverrides(data as PackageOverride[]);
    });
  }, [gameCode]);
  return overrides;
}

/** Apply overrides to a list of API packages (mutates a copy). */
export function applyOverrides<T extends { catalogue_name: string; price_mmk: number; hidden?: boolean }>(
  packages: T[],
  overrides: PackageOverride[],
  gameCode: string,
): (T & { display_name?: string })[] {
  const byName = new Map<string, PackageOverride>();
  overrides
    .filter((o) => o.game_code === gameCode)
    .forEach((o) => byName.set(o.catalogue_name, o));
  return packages.map((p) => {
    const o = byName.get(p.catalogue_name);
    if (!o) return p;
    return {
      ...p,
      price_mmk: o.price_mmk_override ?? p.price_mmk,
      hidden: o.is_hidden || p.hidden,
      display_name: o.display_name ?? undefined,
    };
  });
}
