import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PackageOverride {
  game_code: string;
  catalogue_name: string;
  display_name: string | null;
  price_mmk_override: number | null;
  is_hidden: boolean;
  image_url?: string | null;
}

export interface GameAsset {
  game_code: string;
  logo_url: string;
}

export interface BrandingAsset {
  key: string;
  image_url: string;
}

const LONG_STALE = 5 * 60 * 1000;

/** All branding assets in one cached request (avoids one query per key). */
function useBrandingAssets() {
  return useQuery({
    queryKey: ['branding_assets'],
    staleTime: LONG_STALE,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('branding_assets').select('key, image_url');
      if (error) throw error;
      return (data ?? []) as BrandingAsset[];
    },
  });
}

/** Fetch a single branding image by key (e.g. 'hero_banner', 'site_logo', 'favicon'). */
export function useBrandingAsset(key: string): string | null {
  const { data } = useBrandingAssets();
  return useMemo(() => data?.find((r) => r.key === key)?.image_url ?? null, [data, key]);
}

/** Ordered list of hero carousel slides (keys: hero_slide_*). Falls back to legacy 'hero_banner'. */
export function useHeroSlides(): { slides: string[]; loading: boolean } {
  const { data, isLoading } = useBrandingAssets();

  const slides = useMemo(() => {
    if (!data) return [];
    const carousel = data
      .filter((r) => r.key.startsWith('hero_slide_'))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => r.image_url);
    if (carousel.length > 0) return carousel;
    const legacy = data.find((r) => r.key === 'hero_banner');
    return legacy ? [legacy.image_url] : [];
  }, [data]);

  return { slides, loading: isLoading };
}

/** Fetch the full game_code -> logo_url map. */
export function useGameLogos(): Record<string, string> {
  const { data } = useQuery({
    queryKey: ['game_assets'],
    staleTime: LONG_STALE,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('game_assets').select('game_code, logo_url');
      if (error) throw error;
      return (data ?? []) as GameAsset[];
    },
  });

  return useMemo(() => {
    const m: Record<string, string> = {};
    (data ?? []).forEach((row) => { m[row.game_code] = row.logo_url; });
    return m;
  }, [data]);
}

const EMPTY_OVERRIDES: PackageOverride[] = [];

/** Fetch package overrides, optionally filtered by game_code. */
export function usePackageOverrides(gameCode?: string) {
  const { data } = useQuery({
    queryKey: ['package_overrides'],
    staleTime: LONG_STALE,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('package_overrides').select('*');
      if (error) throw error;
      return (data ?? []) as PackageOverride[];
    },
  });

  return useMemo(() => {
    if (!data) return EMPTY_OVERRIDES;
    return gameCode ? data.filter((o) => o.game_code === gameCode) : data;
  }, [data, gameCode]);
}

/** Apply overrides to a list of API packages (mutates a copy). */
export function applyOverrides<T extends { catalogue_name: string; price_mmk: number; hidden?: boolean }>(
  packages: T[],
  overrides: PackageOverride[],
  gameCode: string,
): (T & { display_name?: string; image_url?: string | null })[] {
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
      image_url: o.image_url ?? undefined,
    };
  });
}
