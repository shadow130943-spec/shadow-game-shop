import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiPackage {
  product_id: string;
  catalogue_name: string;
  price_usd: number;
  price_mmk: number;
  reseller_price_mmk: number;
  hidden?: boolean;
}

export interface ApiGame {
  game_code: string;
  game_name: string;
  packages: ApiPackage[];
}

/**
 * Shared, cached catalogue fetch. Both the shop list and the product detail
 * page read from the same query cache, so navigating between them does not
 * re-hit the edge function.
 */
export function useGames() {
  return useQuery({
    queryKey: ['g2bulk', 'listProducts'],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<ApiGame[]> => {
      const { data, error } = await supabase.functions.invoke('g2bulk-api', {
        body: { action: 'listProducts' },
      });
      if (error || !data?.success) throw new Error(error?.message || 'Failed to load games');
      return (data.games || []) as ApiGame[];
    },
  });
}
