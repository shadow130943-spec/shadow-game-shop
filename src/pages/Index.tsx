import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { BottomNav } from '@/components/BottomNav';
import { HeroBanner } from '@/components/HeroBanner';
import { toast } from 'sonner';
import { Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useGameLogos, usePackageOverrides, applyOverrides } from '@/hooks/useShopContent';
import { useLanguage } from '@/i18n/LanguageProvider';

import mlbbImg from '@/assets/games/mlbb.jpg';
import pubgmImg from '@/assets/games/pubgm.jpg';
import telegramImg from '@/assets/games/telegram.jpg';
import freefireImg from '@/assets/games/freefire.jpg';
import magicChessImg from '@/assets/games/magic_chess.jpg';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  min_price: number;
}

const DEFAULT_GAME_IMAGES: Record<string, string> = {
  mlbb: mlbbImg,
  magic_chess_gogo: magicChessImg,
  pubgm: pubgmImg,
  Telegram: telegramImg,
  freefire_global: freefireImg,
};

const GAME_DISPLAY_ORDER = [
  'mlbb',
  'pubgm',
  'Telegram',
  'magic_chess_gogo',
  'freefire_global',
];
const ALLOWED_GAME_CODES = new Set(GAME_DISPLAY_ORDER);
const GAME_NAME_KEYS: Record<string, string> = {
  mlbb: 'game_mlbb',
  pubgm: 'game_pubgm',
  Telegram: 'game_telegram',
  magic_chess_gogo: 'game_magic_chess',
  freefire_global: 'game_freefire',
};

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const gameLogos = useGameLogos();
  const overrides = usePackageOverrides();
  const { data: rawGames, isLoading: loading, isError } = useGames();

  useEffect(() => {
    if (isError) toast.error('Failed to load games');
  }, [isError]);

  const products: Product[] = useMemo(() => {
    return (rawGames ?? [])
      .filter((g) => ALLOWED_GAME_CODES.has(g.game_code))
      .map((g) => {
        const merged = applyOverrides(g.packages || [], overrides, g.game_code);
        const visible = merged.filter((p) => !p.hidden && p.price_mmk > 0);
        const minPrice = visible.length ? Math.min(...visible.map((p) => p.price_mmk)) : 0;
        return {
          id: g.game_code,
          name: t(GAME_NAME_KEYS[g.game_code] || g.game_name),
          description: null,
          image_url: gameLogos[g.game_code] || DEFAULT_GAME_IMAGES[g.game_code] || null,
          min_price: minPrice,
        };
      })
      .sort((a, b) => GAME_DISPLAY_ORDER.indexOf(a.id) - GAME_DISPLAY_ORDER.indexOf(b.id));
  }, [rawGames, gameLogos, overrides, t]);



  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleBuyNow = useCallback((id: string) => {
    navigate(`/product/${id}`);
  }, [navigate]);


  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <div className="py-2">
        <HeroBanner />
      </div>

      <div className="px-4 py-2 flex gap-3">
        {user ? (
          <>
            <button
              className="flex-1 py-2.5 rounded-lg gaming-btn text-sm font-semibold"
              onClick={() => navigate('/deposit')}
            >
              {t('home_topup')}
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg btn-secondary-action text-sm font-semibold"
              onClick={() => navigate('/game-order-history')}
            >
              {t('home_orders')}
            </button>
          </>
        ) : (
          <>
            <button
              className="flex-1 py-2.5 rounded-lg gaming-btn text-sm font-semibold"
              onClick={() => navigate('/login')}
            >
              {t('home_login')}
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg btn-secondary-action text-sm font-semibold"
              onClick={() => navigate('/signup')}
            >
              {t('home_signup')}
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <section className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} onBuyNow={handleBuyNow} />
        ) : (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-foreground">{t('home_no_games')}</h3>
            <p className="text-muted-foreground">{t('home_no_games_hint')}</p>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default Index;
